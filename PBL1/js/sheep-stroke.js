/**
 * sheep-stroke.js — 양 몸을 문질러 쓰다듬기 (드래그/스와이프)
 */

import { petSheep } from './sheep.js';

const STROKE_MIN_PX = 42;

let _lastTravel = 0;

/** 직전 포인터 이동 거리 (부위 탭과 구분용) */
export function getLastStrokeTravel() {
  return _lastTravel;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.container — 양 컨테이너 (비주얼 클래스용)
 * @param {HTMLElement} [opts.target] — 이벤트 대상 (기본: container)
 * @param {(res: object) => void} opts.onPet — petSheep 성공 시
 * @param {(res: object) => void} [opts.onPetFail]
 * @param {() => boolean} [opts.isBlocked]
 */
export function initSheepStrokePet({
  container,
  target,
  onPet,
  onPetFail,
  isBlocked = () => false,
}) {
  const el = target || container;
  if (!el || !container) return;

  el.classList.add('sheep-stroke-target');

  let tracking = false;
  let totalDist = 0;
  let lastX = 0;
  let lastY = 0;
  let fired = false;

  function endStroke() {
    tracking = false;
    container.classList.remove('sheep-stroking');
  }

  function tryPet() {
    if (fired || isBlocked()) return;
    fired = true;
    _lastTravel = totalDist;
    endStroke();

    const res = petSheep();
    if (res.success) onPet?.(res);
    else onPetFail?.(res);
  }

  el.addEventListener('pointerdown', (e) => {
    if (isBlocked()) return;
    if (e.button !== undefined && e.button !== 0) return;
    
    // 모바일 기기 스크롤 간섭 및 텍스트 선택 방지
    e.preventDefault();

    tracking = true;
    fired = false;
    totalDist = 0;
    _lastTravel = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    container.classList.add('sheep-stroking');

    try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });

  el.addEventListener('pointermove', (e) => {
    if (!tracking || fired) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    totalDist += Math.hypot(dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;

    if (totalDist >= STROKE_MIN_PX) tryPet();
  });

  el.addEventListener('pointerup', (e) => {
    if (tracking && !fired && totalDist >= STROKE_MIN_PX) tryPet();
    else if (tracking) _lastTravel = totalDist;
    endStroke();
    try { el.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });

  el.addEventListener('pointercancel', () => {
    if (tracking) _lastTravel = totalDist;
    endStroke();
  });
}
