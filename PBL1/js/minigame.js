/**
 * minigame.js — 양털깎기 Canvas 미니게임 (파니팡 스타일)
 * 레이어: bodySheep(z1) → woolCanvas(z2) → cursorCanvas(z3)
 */

import { calcShearReward } from './constants.js';
import { getSheep, saveSheep } from './storage.js';
import { drawBodySheep, drawWoolLayer } from './sheep-renderer.js';
import { showToast } from './app.js';
import {
  startShearSound, stopShearSound, startClipperHum, stopClipperHum,
  resumeAudio, setShearMotion, playShearPeelPop,
} from './sound.js';

// ─── 파티클: 털 알갱이 ───
class ShornParticle {
  constructor(x, y, vx, vy, img, scale = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.img = img;
    this.alpha = 1.0;
    this.size = (10 + Math.random() * 10) * scale;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.18;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.24;
    this.vx *= 0.965;
    this.vy *= 0.97;
    this.rotation += this.vRot;
    this.alpha -= 0.018;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.drawImage(this.img, -this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

// ─── 파티클: 벗겨지는 털 띠 (카타르시스) ───
class WoolStrip {
  constructor(x, y, angle, speed, img = null) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.img = img;
    this.len = 14 + Math.random() * 18 + speed * 1.2;
    this.w = 3 + Math.random() * 3;
    this.vx = Math.cos(angle + Math.PI) * (1.5 + speed * 0.15);
    this.vy = Math.sin(angle + Math.PI) * (1.5 + speed * 0.15) - rand(1, 3);
    this.alpha = 1;
    this.curl = (Math.random() - 0.5) * 0.4;
    this.size = 28 + Math.random() * 22 + speed * 2.5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.18;
    this.vx *= 0.96;
    this.alpha -= 0.028;
    this.curl += (Math.random() - 0.5) * 0.06;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (this.img) {
      const s = this.size;
      ctx.drawImage(this.img, -s * 0.55, -s * 0.35, s * 1.1, s * 0.7);
    } else {
      ctx.strokeStyle = '#F8F4FF';
      ctx.lineWidth = this.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-this.len * 0.5, 0);
      ctx.quadraticCurveTo(0, this.curl * 10, this.len * 0.5, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ─── 짧은 벗김 자국 (커서 레이어) ───
class PeelFlash {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.life = 1;
    this.r = 10 + Math.random() * 8;
  }

  update() { this.life -= 0.14; }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.55;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(230,220,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.r * 1.3, this.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function rand(min, max) { return min + Math.random() * (max - min); }

// ─── 내부 상태 ───
let _state = {
  canvasBody: null,
  canvasWool: null,
  canvasCursor: null,
  ctxBody: null,
  ctxWool: null,
  ctxCursor: null,
  totalPixels: 0,
  isDrawing: false,
  isRunning: false,
  timerSec: 15,
  timerInterval: null,
  brushSize: 17,
  onUpdate: null,
  onFinish: null,
  step: 1,
  preloadedAssets: null,
  preloadingPromise: null,
  cursorX: 0,
  cursorY: 0,
  strokeAngle: 0,
  shearSpeed: 0,
  shake: 0,
  lastPercent: 0,
  milestones: new Set(),
};

let _particles = [];
let _strips = [];
let _flashes = [];
let _prevPos = { x: 0, y: 0 };
let _hasPrevPos = false;
let _animFrame = null;
let _lastVibrateTime = 0;
let _lastPeelPopTime = 0;
let _percentCache = 0;
let _percentDirty = true;
let _lastPercentCheck = 0;
let _frameCanvas = null;

// ─── 초기화 ───

export function initMinigame({ canvasBody, canvasWool, canvasCursor, onUpdate, onFinish }) {
  _state.canvasBody = canvasBody;
  _state.canvasWool = canvasWool;
  _state.canvasCursor = canvasCursor;
  _state.onUpdate = onUpdate;
  _state.onFinish = onFinish;
  _frameCanvas = canvasBody.closest('.canvas-frame');

  const sheep = getSheep();
  _state.step = sheep.step ?? 1;

  _setupCanvas(canvasBody);
  _setupCanvas(canvasWool);
  _setupCanvas(canvasCursor);

  _state.ctxBody = canvasBody.getContext('2d');
  _state.ctxWool = canvasWool.getContext('2d');
  _state.ctxCursor = canvasCursor.getContext('2d');

  _state.preloadingPromise = _preloadGameAssets().then(assets => {
    _state.preloadedAssets = assets;
    _drawAll();
    _measureWool();
    _addEvents(canvasWool);
  });
}

export function startMinigame() {
  if (_state.isRunning) return;

  const run = () => {
    _state.isRunning = true;
    _state.timerSec = 15;
    _state.lastPercent = 0;
    _state.milestones = new Set();
    _percentCache = 0;
    _percentDirty = true;
    _particles = [];
    _strips = [];
    _flashes = [];
    _hasPrevPos = false;
    _state.shake = 0;

    _startRenderLoop();

    _state.timerInterval = setInterval(() => {
      _state.timerSec--;
      if (_state.onUpdate) {
        _state.onUpdate(_getRemovalPercent(), _state.timerSec);
      }
      if (_state.timerSec <= 0) finishMinigame();
    }, 1000);
  };

  if (_state.preloadingPromise) _state.preloadingPromise.then(run);
  else run();
}

export function finishMinigame() {
  if (!_state.isRunning) return;
  _state.isRunning = false;
  clearInterval(_state.timerInterval);
  cancelAnimationFrame(_animFrame);
  _animFrame = null;

  stopClipperHum();
  stopShearSound();
  _removeEvents(_state.canvasWool);

  const percent = _getRemovalPercent(true);
  const reward = calcShearReward(percent, _state.step);

  const sheep = getSheep();
  sheep.wool += reward;
  sheep.xp = 0;
  sheep.woolGrowth = 0;
  sheep.canShear = false;
  sheep.shearedAt = new Date().toISOString();
  saveSheep(sheep);

  if (_state.onFinish) _state.onFinish(percent, reward);
}

// ─── 에셋 ───
function _preloadGameAssets() {
  const isSubpage = window.location.pathname.includes('/pages/');
  const basePath = isSubpage ? '../' : '';

  const bodyImg = new Image();
  const woolImg = new Image();
  const clipperImg = new Image();
  const particleImg = new Image();

  bodyImg.src = `${basePath}assets/game/bared.png`;
  woolImg.src = `${basePath}assets/game/fluffy.png`;
  clipperImg.src = `${basePath}assets/game/clipper.png`;
  particleImg.src = `${basePath}assets/game/particle.png`;

  const particleAlt = new Image();
  particleAlt.src = `${basePath}assets/game/particle_alt.png`;

  const stripImg = new Image();
  stripImg.src = `${basePath}assets/game/wool_strip.png`;

  const load = img => new Promise(resolve => {
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });

  return Promise.all([
    load(bodyImg), load(woolImg), load(clipperImg),
    load(particleImg), load(particleAlt), load(stripImg),
  ]).then(([body, wool, clipper, particle, particleAltImg, strip]) => ({
    bodyImg: body, woolImg: wool, clipperImg: clipper,
    particleImg: particle, particleAltImg, stripImg: strip,
  }));
}

// ─── Canvas ───
function _setupCanvas(canvas) {
  const wrapper = canvas.parentElement;
  const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
  canvas.width = size;
  canvas.height = size;
}

function _drawAll() {
  const { canvasBody, canvasWool, ctxBody, ctxWool, preloadedAssets } = _state;
  drawBodySheep(ctxBody, canvasBody.width, canvasBody.height, _state.step, preloadedAssets?.bodyImg);
  drawWoolLayer(ctxWool, canvasWool.width, canvasWool.height, _state.step, preloadedAssets?.woolImg);
}

function _measureWool() {
  const { ctxWool, canvasWool } = _state;
  const data = ctxWool.getImageData(0, 0, canvasWool.width, canvasWool.height).data;
  let count = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) count++;
  }
  _state.totalPixels = count;
}

function _getRemovalPercent(force = false) {
  const now = performance.now();
  if (!force && !_percentDirty && now - _lastPercentCheck < 120) {
    return _percentCache;
  }
  _lastPercentCheck = now;
  _percentDirty = false;

  if (_state.totalPixels <= 0) return 100;
  const { ctxWool, canvasWool } = _state;
  const data = ctxWool.getImageData(0, 0, canvasWool.width, canvasWool.height).data;
  let remaining = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) remaining++;
  }
  const removed = _state.totalPixels - remaining;
  _percentCache = Math.min(100, Math.round((removed / _state.totalPixels) * 100));
  return _percentCache;
}

function _markPercentDirty() { _percentDirty = true; }

// ─── 렌더 루프 ───
function _startRenderLoop() {
  const loop = () => {
    if (!_state.isRunning) return;
    _renderCursorCanvas();
    _animFrame = requestAnimationFrame(loop);
  };
  _animFrame = requestAnimationFrame(loop);
}

function _renderCursorCanvas() {
  const ctx = _state.ctxCursor;
  const c = _state.canvasCursor;
  ctx.clearRect(0, 0, c.width, c.height);

  _flashes.forEach(f => { f.update(); f.draw(ctx); });
  _flashes = _flashes.filter(f => f.life > 0);

  _strips.forEach(s => { s.update(); s.draw(ctx); });
  _strips = _strips.filter(s => s.alpha > 0);

  _particles.forEach(p => { p.update(); p.draw(ctx); });
  _particles = _particles.filter(p => p.alpha > 0);

  if (_state.shake > 0.1 && _frameCanvas) {
    const s = _state.shake;
    _frameCanvas.style.transform =
      `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)`;
    _state.shake *= 0.82;
  } else if (_frameCanvas) {
    _frameCanvas.style.transform = '';
    _state.shake = 0;
  }

  if (_state.isDrawing && _state.preloadedAssets?.clipperImg) {
    ctx.save();
    const hum = 1 + _state.shearSpeed * 0.04;
    const shakeX = (Math.random() - 0.5) * 2.5 * hum;
    const shakeY = (Math.random() - 0.5) * 2.5 * hum;
    const drawX = _state.cursorX + shakeX;
    const drawY = _state.cursorY + shakeY;

    // 브러시 가이드 (이동 방향으로 납작한 타원)
    ctx.save();
    ctx.translate(_state.cursorX, _state.cursorY);
    ctx.rotate(_state.strokeAngle);
    ctx.strokeStyle = `rgba(255,255,255,${0.2 + _state.shearSpeed * 0.02})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, _state.brushSize * 1.15, _state.brushSize * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const clipperSize = 52;
    ctx.translate(drawX, drawY);
    ctx.rotate(_state.strokeAngle + Math.PI * 0.12);
    ctx.drawImage(
      _state.preloadedAssets.clipperImg,
      -clipperSize / 2, -clipperSize / 2, clipperSize, clipperSize
    );
    ctx.restore();
  }
}

// ─── 이벤트 ───
function _onPointerMove(e) {
  e.preventDefault();
  const pos = _getPos(e);
  _state.cursorX = pos.x;
  _state.cursorY = pos.y;

  if (!_state.isDrawing || !_state.isRunning) {
    stopShearSound();
    setShearMotion(0);
    return;
  }

  let dx = 0, dy = 0;
  if (_hasPrevPos) {
    dx = pos.x - _prevPos.x;
    dy = pos.y - _prevPos.y;
  }
  const speed = Math.hypot(dx, dy);
  _state.shearSpeed = speed;
  if (speed > 0.3) _state.strokeAngle = Math.atan2(dy, dx);

  const fromX = _hasPrevPos ? _prevPos.x : pos.x;
  const fromY = _hasPrevPos ? _prevPos.y : pos.y;

  _prevPos.x = pos.x;
  _prevPos.y = pos.y;
  _hasPrevPos = true;

  const hasWool = _sampleWool(pos.x, pos.y);

  if (hasWool && speed > 0.35) {
    setShearMotion(speed);
    startShearSound();
    _triggerHaptic(speed);
    _spawnShearFx(pos.x, pos.y, dx, dy, speed);
    _eraseStroke(fromX, fromY, pos.x, pos.y, speed);
    if (_frameCanvas) _frameCanvas.classList.add('is-shearing');
  } else {
    setShearMotion(0);
    stopShearSound();
    if (_frameCanvas) _frameCanvas.classList.remove('is-shearing');
    if (hasWool) _eraseSoft(pos.x, pos.y, _state.strokeAngle, 0.45);
  }

  _checkMilestones();

  if (_state.onUpdate) {
    _state.onUpdate(_getRemovalPercent(), _state.timerSec);
  }
}

function _onPointerDown(e) {
  e.preventDefault();
  if (!_state.isRunning) return;
  resumeAudio();
  startClipperHum();

  _state.isDrawing = true;
  const pos = _getPos(e);
  _state.cursorX = pos.x;
  _state.cursorY = pos.y;
  _prevPos.x = pos.x;
  _prevPos.y = pos.y;
  _hasPrevPos = true;

  _eraseSoft(pos.x, pos.y, _state.strokeAngle, 0.55);
  _markPercentDirty();
}

function _onPointerUp() {
  _state.isDrawing = false;
  _hasPrevPos = false;
  _state.shearSpeed = 0;
  if (_frameCanvas) _frameCanvas.classList.remove('is-shearing');
  stopClipperHum();
  stopShearSound();
  setShearMotion(0);
}

function _onPointerLeave() {
  _onPointerUp();
}

function _sampleWool(x, y) {
  const { ctxWool, canvasWool } = _state;
  const px = Math.round(Math.max(0, Math.min(canvasWool.width - 1, x)));
  const py = Math.round(Math.max(0, Math.min(canvasWool.height - 1, y)));
  return ctxWool.getImageData(px, py, 1, 1).data[3] > 10;
}

function _spawnShearFx(x, y, dx, dy, speed) {
  const angle = Math.atan2(dy, dx);
  const intensity = Math.min(1, speed / 10);

  if (speed > 4) _state.shake = Math.min(6, _state.shake + intensity * 1.8);

  const spawnCount = Math.floor(rand(2, 4) + intensity * 3);
  for (let i = 0; i < spawnCount; i++) {
    const pAngle = angle + Math.PI + (Math.random() - 0.5) * 0.9;
    const pSpeed = 1.4 + Math.random() * Math.min(speed * 0.3, 5);
    const r = Math.random() * _state.brushSize;
    const theta = Math.random() * Math.PI * 2;
    const px = x + Math.cos(theta) * r;
    const py = y + Math.sin(theta) * r;
    const pImg = Math.random() < 0.5
      ? _state.preloadedAssets.particleImg
      : (_state.preloadedAssets.particleAltImg || _state.preloadedAssets.particleImg);
    if (pImg) {
      _particles.push(new ShornParticle(
        px, py,
        Math.cos(pAngle) * pSpeed,
        Math.sin(pAngle) * pSpeed - rand(0.5, 2),
        pImg,
        0.85 + intensity * 0.35
      ));
    }
  }

  if (speed > 2.5 && Math.random() < 0.35 + intensity * 0.35) {
    _strips.push(new WoolStrip(x, y, angle, speed, _state.preloadedAssets.stripImg));
    _flashes.push(new PeelFlash(x, y, angle));
  }

  const now = Date.now();
  if (speed > 7 && now - _lastPeelPopTime > 180) {
    playShearPeelPop(intensity);
    _lastPeelPopTime = now;
  }
}

function _checkMilestones() {
  const percent = _getRemovalPercent();
  if (percent === _state.lastPercent) return;
  _state.lastPercent = percent;

  const msgs = {
    25: '털이 시원하게 밀려나요~',
    50: '반쯤 깎았어요! 손맛 좋네요',
    75: '거의 다 됐어요!',
    95: '완벽! 수확할 수 있어요',
  };

  for (const [threshold, msg] of Object.entries(msgs)) {
    const t = Number(threshold);
    if (percent >= t && !_state.milestones.has(t)) {
      _state.milestones.add(t);
      showToast(msg, t >= 95 ? 'success' : 'default', 1800);
      if (t >= 50) playShearPeelPop(0.4 + t / 200);
    }
  }
}

function _triggerHaptic(speed) {
  const now = Date.now();
  const interval = speed > 8 ? 45 : 65;
  if (now - _lastVibrateTime > interval && navigator.vibrate) {
    navigator.vibrate(speed > 8 ? [8, 4, 6] : 10);
    _lastVibrateTime = now;
  }
}

const _handlers = {
  pointermove: _onPointerMove,
  pointerdown: _onPointerDown,
  pointerup: _onPointerUp,
  pointerleave: _onPointerLeave,
  pointercancel: _onPointerUp,
};

function _addEvents(canvas) {
  canvas.style.touchAction = 'none';
  Object.entries(_handlers).forEach(([evt, fn]) =>
    canvas.addEventListener(evt, fn, { passive: false })
  );
}

function _removeEvents(canvas) {
  if (!canvas) return;
  Object.entries(_handlers).forEach(([evt, fn]) =>
    canvas.removeEventListener(evt, fn)
  );
}

// ─── 지우기: 스트로크 보간 + 소프트 브러시 ───
function _eraseStroke(x0, y0, x1, y1, speed) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const step = Math.max(2, _state.brushSize * 0.28);
  const steps = Math.max(1, Math.ceil(dist / step));
  const pressure = Math.min(1, 0.55 + speed * 0.06);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    _eraseSoft(
      x0 + (x1 - x0) * t,
      y0 + (y1 - y0) * t,
      angle,
      pressure
    );
  }
  _markPercentDirty();
}

function _eraseSoft(x, y, angle, pressure = 0.7) {
  const ctx = _state.ctxWool;
  const r = _state.brushSize * (0.85 + pressure * 0.25);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1.35, 0.78);

  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(0,0,0,${0.95 * pressure})`);
  g.addColorStop(0.45, `rgba(0,0,0,${0.55 * pressure})`);
  g.addColorStop(0.78, `rgba(0,0,0,${0.15 * pressure})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function _getPos(e) {
  const canvas = _state.canvasWool;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function getRemovalPercent() {
  return _getRemovalPercent(true);
}
