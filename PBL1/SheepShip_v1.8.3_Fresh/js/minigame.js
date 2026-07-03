/**
 * minigame.js — 양털깎기 Canvas 미니게임
 * 레이어 구조: bodySheep(z1) → woolCanvas(z2) → cursorCanvas(z3)
 * destination-out 은 woolCanvas에만 적용.
 */

import { calcShearReward } from './constants.js';
import { getSheep, saveSheep } from './storage.js';
import { drawBodySheep, drawWoolLayer, preloadMinigameAssets } from './sheep-renderer.js';
import { showToast } from './app.js';

// ─── 내부 상태 ───
let _state = {
  canvasBody:   null,
  canvasWool:   null,
  canvasCursor: null,
  ctxBody:      null,
  ctxWool:      null,
  ctxCursor:    null,
  totalPixels:  0,
  removedPixels:0,
  isDrawing:    false,
  isRunning:    false,
  timerSec:     30,
  timerInterval:null,
  animFrame:    null,
  brushSize:    22,  // px (실제 canvas 좌표)
  onUpdate:     null, // (percent, sec) => void
  onFinish:     null, // (percent, reward) => void
  step:         1,
  preloadedAssets: null,
  preloadingPromise: null,
};

// ─── 초기화 ───

/**
 * 미니게임 초기화
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvasBody
 * @param {HTMLCanvasElement} opts.canvasWool
 * @param {HTMLCanvasElement} opts.canvasCursor
 * @param {function} opts.onUpdate  (removalPercent, remainSec) => void
 * @param {function} opts.onFinish  (removalPercent, reward) => void
 */
export function initMinigame({ canvasBody, canvasWool, canvasCursor, onUpdate, onFinish }) {
  _state.canvasBody   = canvasBody;
  _state.canvasWool   = canvasWool;
  _state.canvasCursor = canvasCursor;
  _state.onUpdate     = onUpdate;
  _state.onFinish     = onFinish;

  const sheep = getSheep();
  _state.step = sheep.step ?? 1;

  _setupCanvas(canvasBody);
  _setupCanvas(canvasWool);
  _setupCanvas(canvasCursor);

  _state.ctxBody   = canvasBody.getContext('2d');
  _state.ctxWool   = canvasWool.getContext('2d');
  _state.ctxCursor = canvasCursor.getContext('2d');

  // 비동기 자원 로드 후 실행
  _state.preloadingPromise = preloadMinigameAssets(_state.step).then(assets => {
    _state.preloadedAssets = assets;
    _drawAll();
    _measureWool();
    // 이벤트 등록
    _addEvents(canvasWool);
  });
}

/** 게임 시작 */
export function startMinigame() {
  if (_state.isRunning) return;

  const run = () => {
    _state.isRunning  = true;
    _state.timerSec   = 30;
    _state.removedPixels = 0;

    _state.timerInterval = setInterval(() => {
      _state.timerSec--;
      if (_state.onUpdate) {
        _state.onUpdate(_getRemovalPercent(), _state.timerSec);
      }
      if (_state.timerSec <= 0) {
        finishMinigame();
      }
    }, 1000);
  };

  if (_state.preloadingPromise) {
    _state.preloadingPromise.then(run);
  } else {
    run();
  }
}

/** 게임 종료 (수동 또는 타이머 만료) */
export function finishMinigame() {
  if (!_state.isRunning) return;
  _state.isRunning = false;
  clearInterval(_state.timerInterval);
  cancelAnimationFrame(_state.animFrame);
  _removeEvents(_state.canvasWool);

  const percent = _getRemovalPercent();
  const reward  = calcShearReward(percent, _state.step);

  // 양 데이터 업데이트
  const sheep = getSheep();
  sheep.wool        += reward;
  sheep.xp           = 0;
  sheep.woolGrowth   = 0;
  sheep.canShear     = false;
  sheep.shearedAt    = new Date().toISOString();
  saveSheep(sheep);

  if (_state.onFinish) _state.onFinish(percent, reward);
}

// ─── Canvas 드로잉 ───

function _setupCanvas(canvas) {
  const wrapper = canvas.parentElement;
  const size    = Math.min(wrapper.clientWidth, wrapper.clientHeight);
  canvas.width  = size;
  canvas.height = size;

  // 브러시 크기 (canvas 좌표 기준 약 9~10px → 실제 px 비율)
  _state.brushSize = Math.round(size * 0.05); // 5% of canvas size
}

function _drawAll() {
  const { canvasBody, canvasWool, ctxBody, ctxWool, preloadedAssets } = _state;
  drawBodySheep(ctxBody, canvasBody.width, canvasBody.height, _state.step, preloadedAssets?.bodyImg);
  drawWoolLayer(ctxWool, canvasWool.width, canvasWool.height, _state.step, preloadedAssets?.woolImg);
}

function _measureWool() {
  const { ctxWool, canvasWool } = _state;
  const data = ctxWool.getImageData(0, 0, canvasWool.width, canvasWool.height).data;
  let count  = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) count++;
  }
  _state.totalPixels = count;
}

function _getRemovalPercent() {
  if (_state.totalPixels <= 0) return 100;
  const { ctxWool, canvasWool } = _state;
  const data = ctxWool.getImageData(0, 0, canvasWool.width, canvasWool.height).data;
  let remaining = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) remaining++;
  }
  const removed = _state.totalPixels - remaining;
  return Math.min(100, Math.round((removed / _state.totalPixels) * 100));
}

// ─── 이벤트 핸들러 ───

function _onPointerMove(e) {
  e.preventDefault();
  const pos = _getPos(e);
  _drawCursor(pos.x, pos.y);
  if (!_state.isDrawing || !_state.isRunning) return;
  _erase(pos.x, pos.y);
  if (_state.onUpdate) {
    _state.onUpdate(_getRemovalPercent(), _state.timerSec);
  }
}

function _onPointerDown(e) {
  e.preventDefault();
  if (!_state.isRunning) return;
  _state.isDrawing = true;
  const pos = _getPos(e);
  _erase(pos.x, pos.y);
}

function _onPointerUp(e) {
  e.preventDefault();
  _state.isDrawing = false;
}

function _onPointerLeave() {
  _state.isDrawing = false;
  _clearCursor();
}

const _handlers = {
  pointermove:  _onPointerMove,
  pointerdown:  _onPointerDown,
  pointerup:    _onPointerUp,
  pointerleave: _onPointerLeave,
  pointercancel:_onPointerUp,
};

function _addEvents(canvas) {
  canvas.style.touchAction = 'none';
  Object.entries(_handlers).forEach(([evt, fn]) => canvas.addEventListener(evt, fn, { passive: false }));
}

function _removeEvents(canvas) {
  if (!canvas) return;
  Object.entries(_handlers).forEach(([evt, fn]) => canvas.removeEventListener(evt, fn));
}

// ─── 지우기 (destination-out) ───

function _erase(x, y) {
  const ctx = _state.ctxWool;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, _state.brushSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── 커서 그리기 ───

function _drawCursor(x, y) {
  const ctx = _state.ctxCursor;
  const c   = _state.canvasCursor;
  ctx.clearRect(0, 0, c.width, c.height);

  // 바리깡 아이콘 (원형 + 작은 톱니 힌트)
  ctx.save();
  ctx.strokeStyle = 'rgba(79, 70, 229, 0.9)';
  ctx.lineWidth   = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, _state.brushSize, 0, Math.PI * 2);
  ctx.stroke();

  // 중심 점
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(167, 139, 250, 0.8)';
  ctx.fill();
  ctx.restore();
}

function _clearCursor() {
  const ctx = _state.ctxCursor;
  const c   = _state.canvasCursor;
  if (ctx) ctx.clearRect(0, 0, c.width, c.height);
}

// ─── 위치 계산 ───
function _getPos(e) {
  const canvas = _state.canvasWool;
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: (clientX - rect.left)  * scaleX,
    y: (clientY - rect.top)   * scaleY,
  };
}

/** 현재 제거율 반환 (외부에서 조회용) */
export function getRemovalPercent() {
  return _getRemovalPercent();
}
