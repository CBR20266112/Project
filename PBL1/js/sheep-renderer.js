/**
 * sheep-renderer.js — 양 캐릭터 SVG/Canvas 렌더러
 * 성장 단계(step)와 포즈(pose)에 따라 양 SVG를 생성한다.
 */

import { GROWTH_TABLE, SHEEP_POSE } from './constants.js';

// ─── 외부 이미지 사용 여부 ───
// 사용자가 직접 이미지 파일을 넣을 경우 true로 활성화하세요.
export const USE_EXTERNAL_ASSETS = true;

// ─── 색상 상수 ───
const C = {
  WOOL:      '#FFF7EE',
  WOOL_WARM: '#FFE6C4',
  WOOL_SHAD: '#F0DEC8',
  FACE:      '#FFD9A6',
  FACE_DARK: '#F0C070',
  EYE:       '#2D1B0E',
  EYE_SHINE: '#FFFFFF',
  NOSE:      '#C4876A',
  BLUSH:     '#FFB3C6',
  LEG:       '#C4876A',
  LEG_DARK:  '#A0654A',
  EAR:       '#FFD9A6',
};

/**
 * 양 SVG 문자열 생성
 * @param {number} step 1~10
 * @param {string} pose SHEEP_POSE 중 하나
 * @returns {string} SVG innerHTML
 */
export function getSheepSVG(step = 1, pose = SHEEP_POSE.IDLE) {
  if (USE_EXTERNAL_ASSETS) {
    const isSubpage = window.location.pathname.includes('/pages/');
    const basePath = isSubpage ? '../' : '';
    const assetName = pose === SHEEP_POSE.IDLE ? 'growth_idle' : pose;
    const imgPath = `${basePath}assets/sheep/step${step}/${assetName}.png`;
    // CSS 클래스로 크기를 지정하므로 인라인 스타일 불필요
    return `<img src="${imgPath}" class="sheep-svg ${getSheepAnimClass(pose)}" alt="양 step${step} ${pose}" decoding="async" loading="eager">`;
  }

  const cfg = GROWTH_TABLE[step] ?? GROWTH_TABLE[1];
  const bubbles = cfg.woolBubbles;
  const wScale  = cfg.woolScale;

  const cx = 100, cy = 105; // 양 중심
  const bodyR = 48;          // 얼굴+몸통 타원 반경
  const woolR  = Math.round(28 + wScale * 30); // 털 클라우드 반경 (28~58)

  // 포즈별 오프셋
  let sheepTY = 0;
  let showSleepZzz = false;

  if (pose === SHEEP_POSE.SLEEP || pose === SHEEP_POSE.IDLE) {
    // idle: 기본, sleep: 누운 자세는 별도 처리
  }

  // 수면 포즈인 경우 눕힌 양
  if (pose === SHEEP_POSE.SLEEP) {
    return buildSleepSVG(step, wScale, bubbles);
  }

  // 털깎기 후 포즈
  if (pose === SHEEP_POSE.SHEAR_AFTER) {
    return buildShearAfterSVG();
  }

  // 털깎기 전 포즈 (풀 털)
  if (pose === SHEEP_POSE.SHEAR) {
    return buildShearSVG(step);
  }

  // 표정 설정
  const expression = getExpression(pose);

  return `
<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" class="sheep-svg ${getSheepAnimClass(pose)}">
  <!-- 그림자 -->
  <ellipse cx="100" cy="212" rx="${30 + wScale * 15}" ry="6" fill="rgba(0,0,0,0.12)"/>

  <!-- 양털 클라우드 -->
  ${buildWoolCloud(cx, cy - 10, woolR, bubbles, wScale)}

  <!-- 귀 (좌우) -->
  <ellipse cx="${cx - woolR * 0.75}" cy="${cy - woolR * 0.2}" rx="10" ry="14" fill="${C.EAR}" transform="rotate(-20 ${cx - woolR * 0.75} ${cy - woolR * 0.2})"/>
  <ellipse cx="${cx - woolR * 0.75}" cy="${cy - woolR * 0.2}" rx="6" ry="9" fill="#FFB3A0" transform="rotate(-20 ${cx - woolR * 0.75} ${cy - woolR * 0.2})"/>
  <ellipse cx="${cx + woolR * 0.75}" cy="${cy - woolR * 0.2}" rx="10" ry="14" fill="${C.EAR}" transform="rotate(20 ${cx + woolR * 0.75} ${cy - woolR * 0.2})"/>
  <ellipse cx="${cx + woolR * 0.75}" cy="${cy - woolR * 0.2}" rx="6" ry="9" fill="#FFB3A0" transform="rotate(20 ${cx + woolR * 0.75} ${cy - woolR * 0.2})"/>

  <!-- 얼굴 (크림 타원) -->
  <ellipse cx="${cx}" cy="${cy + woolR * 0.15}" rx="${bodyR * 0.72}" ry="${bodyR * 0.65}" fill="${C.FACE}"/>

  <!-- 볼터치 -->
  <ellipse cx="${cx - 22}" cy="${cy + woolR * 0.25}" rx="11" ry="7" fill="${C.BLUSH}" opacity="0.5"/>
  <ellipse cx="${cx + 22}" cy="${cy + woolR * 0.25}" rx="11" ry="7" fill="${C.BLUSH}" opacity="0.5"/>

  <!-- 표정 -->
  ${expression}

  <!-- 다리 (2개) -->
  <rect x="${cx - 22}" y="${cy + woolR * 0.5 + 6}" width="16" height="20" rx="8" fill="${C.LEG}"/>
  <rect x="${cx + 6}"  y="${cy + woolR * 0.5 + 6}" width="16" height="20" rx="8" fill="${C.LEG}"/>

  <!-- 발굽 -->
  <rect x="${cx - 22}" y="${cy + woolR * 0.5 + 18}" width="16" height="8" rx="4" fill="${C.LEG_DARK}"/>
  <rect x="${cx + 6}"  y="${cy + woolR * 0.5 + 18}" width="16" height="8" rx="4" fill="${C.LEG_DARK}"/>

  <!-- 포즈 소품 (먹이, 하트 등) -->
  ${getPoseAccessory(pose, cx, cy, woolR)}
</svg>`;
}

/** 양털 클라우드 SVG 생성 */
function buildWoolCloud(cx, cy, woolR, bubbles, wScale) {
  // 버블 위치 배열 (원형으로 배치)
  const positions = [];
  const layers = [
    { count: Math.ceil(bubbles * 0.5), r: woolR * 0.95, size: 0.38 + wScale * 0.1 },
    { count: Math.ceil(bubbles * 0.35), r: woolR * 0.6,  size: 0.28 + wScale * 0.08 },
    { count: Math.ceil(bubbles * 0.15), r: woolR * 0.25, size: 0.22 + wScale * 0.06 },
  ];

  let svgParts = '';

  layers.forEach(layer => {
    for (let i = 0; i < layer.count; i++) {
      const angle = (i / layer.count) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * layer.r;
      const y = cy + Math.sin(angle) * layer.r * 0.85;
      const r = Math.round(woolR * layer.size);
      const shade = i % 3 === 0 ? C.WOOL_SHAD : (i % 3 === 1 ? C.WOOL : C.WOOL_WARM);
      svgParts += `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${r}" fill="${shade}"/>`;
    }
  });

  // 중심 덮개
  svgParts += `<circle cx="${cx}" cy="${cy}" r="${Math.round(woolR * 0.55)}" fill="${C.WOOL}"/>`;

  return svgParts;
}

/** 표정 SVG 반환 */
function getExpression(pose) {
  const ex = 100, ey = 105; // 눈 중심

  // 공통: 눈
  const eyes = `
    <circle cx="${ex - 12}" cy="${ey}" r="5" fill="${C.EYE}"/>
    <circle cx="${ex + 12}" cy="${ey}" r="5" fill="${C.EYE}"/>
    <circle cx="${ex - 10}" cy="${ey - 2}" r="2" fill="${C.EYE_SHINE}"/>
    <circle cx="${ex + 14}" cy="${ey - 2}" r="2" fill="${C.EYE_SHINE}"/>`;

  // 코
  const nose = `<ellipse cx="${ex}" cy="${ey + 12}" rx="5" ry="3.5" fill="${C.NOSE}"/>`;

  // 포즈별 입 모양
  const mouthMap = {
    [SHEEP_POSE.IDLE]:      `<path d="M ${ex-7} ${ey+18} Q ${ex} ${ey+23} ${ex+7} ${ey+18}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.HAPPY]:     `<path d="M ${ex-9} ${ey+16} Q ${ex} ${ey+25} ${ex+9} ${ey+16}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.PET]:       `<path d="M ${ex-8} ${ey+17} Q ${ex} ${ey+24} ${ex+8} ${ey+17}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.EAT]:       `<ellipse cx="${ex}" cy="${ey+20}" rx="8" ry="5" fill="${C.NOSE}" opacity="0.6"/>`,
    [SHEEP_POSE.SAD]:       `<path d="M ${ex-7} ${ey+22} Q ${ex} ${ey+17} ${ex+7} ${ey+22}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.ANGRY]:     `<path d="M ${ex-7} ${ey+22} Q ${ex} ${ey+16} ${ex+7} ${ey+22}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.EXCITED]:   `<ellipse cx="${ex}" cy="${ey+20}" rx="6" ry="6" fill="${C.NOSE}" opacity="0.8"/>`,
    [SHEEP_POSE.SHY]:       `<circle cx="${ex}" cy="${ey+18}" r="3" fill="${C.NOSE}"/>`,
    [SHEEP_POSE.SLEEPY]:    `<path d="M ${ex-5} ${ey+18} Q ${ex} ${ey+21} ${ex+5} ${ey+18}" stroke="${C.NOSE}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.SMUG]:      `<path d="M ${ex-6} ${ey+18} Q ${ex-2} ${ey+22} ${ex+8} ${ey+16}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.SURPRISED]: `<ellipse cx="${ex}" cy="${ey+21}" rx="6" ry="7" fill="${C.NOSE}" opacity="0.8"/>`,
    [SHEEP_POSE.WINK]:      `<path d="M ${ex-7} ${ey+18} Q ${ex} ${ey+23} ${ex+7} ${ey+18}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    [SHEEP_POSE.WORRIED]:   `<path d="M ${ex-7} ${ey+21} Q ${ex-3} ${ey+18} ${ex} ${ey+20} Q ${ex+3} ${ey+22} ${ex+7} ${ey+19}" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  };

  // 행복 포즈: 눈이 반달(^_^)
  if (pose === SHEEP_POSE.HAPPY || pose === SHEEP_POSE.EXCITED) {
    const happyEyes = `
      <path d="M ${ex-17} ${ey} Q ${ex-12} ${ey-6} ${ex-7} ${ey}" stroke="${C.EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M ${ex+7} ${ey} Q ${ex+12} ${ey-6} ${ex+17} ${ey}" stroke="${C.EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return happyEyes + nose + (mouthMap[pose] ?? mouthMap[SHEEP_POSE.IDLE]);
  }

  // 슬픔 포즈: 눈물
  if (pose === SHEEP_POSE.SAD) {
    const sadExtras = `
      <ellipse cx="${ex-12}" cy="${ey+8}" rx="3" ry="5" fill="#A8D4F5" opacity="0.7"/>
      <ellipse cx="${ex+12}" cy="${ey+8}" rx="3" ry="5" fill="#A8D4F5" opacity="0.7"/>`;
    return eyes + sadExtras + nose + (mouthMap[pose] ?? mouthMap[SHEEP_POSE.IDLE]);
  }

  // 화남 포즈: 앵그리 눈썹 추가
  if (pose === SHEEP_POSE.ANGRY) {
    const eyebrows = `
      <path d="M ${ex-18} ${ey-7} L ${ex-6} ${ey-2}" stroke="${C.EYE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M ${ex+18} ${ey-7} L ${ex+6} ${ey-2}" stroke="${C.EYE}" stroke-width="3" stroke-linecap="round"/>`;
    return eyes + eyebrows + nose + mouthMap[pose];
  }

  // 걱정 포즈: 억울한 눈썹 추가
  if (pose === SHEEP_POSE.WORRIED) {
    const eyebrows = `
      <path d="M ${ex-17} ${ey-2} L ${ex-7} ${ey-7}" stroke="${C.EYE}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M ${ex+17} ${ey-2} L ${ex+7} ${ey-7}" stroke="${C.EYE}" stroke-width="2.5" stroke-linecap="round"/>`;
    return eyes + eyebrows + nose + mouthMap[pose];
  }

  // 윙크 포즈: 한쪽 눈 감음
  if (pose === SHEEP_POSE.WINK) {
    const winkEyes = `
      <path d="M ${ex-17} ${ey} Q ${ex-12} ${ey-6} ${ex-7} ${ey}" stroke="${C.EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="${ex + 12}" cy="${ey}" r="5" fill="${C.EYE}"/>
      <circle cx="${ex + 14}" cy="${ey - 2}" r="2" fill="${C.EYE_SHINE}"/>`;
    return winkEyes + nose + mouthMap[pose];
  }

  // 졸림 포즈: 감은 눈
  if (pose === SHEEP_POSE.SLEEPY) {
    const sleepyEyes = `
      <path d="M ${ex-16} ${ey-2} Q ${ex-11} ${ey+2} ${ex-6} ${ey-2}" stroke="${C.EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M ${ex+6} ${ey-2} Q ${ex+11} ${ey+2} ${ex+16} ${ey-2}" stroke="${C.EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return sleepyEyes + nose + mouthMap[pose];
  }

  // 수줍음 포즈: 볼터치 강조
  if (pose === SHEEP_POSE.SHY) {
    const shyBlush = `
      <ellipse cx="${ex - 22}" cy="${ey + 14}" rx="12" ry="8" fill="${C.BLUSH}" opacity="0.8"/>
      <ellipse cx="${ex + 22}" cy="${ey + 14}" rx="12" ry="8" fill="${C.BLUSH}" opacity="0.8"/>`;
    return eyes + shyBlush + nose + mouthMap[pose];
  }

  const mouth = mouthMap[pose] ?? mouthMap[SHEEP_POSE.IDLE];
  return eyes + nose + mouth;
}

/** 포즈 소품 (먹이, 하트 등) */
function getPoseAccessory(pose, cx, cy, woolR) {
  if (pose === SHEEP_POSE.EAT) {
    return `
      <text x="${cx - woolR - 10}" y="${cy - 5}" font-size="28" text-anchor="middle">🥕</text>`;
  }
  if (pose === SHEEP_POSE.PET) {
    return `
      <text x="${cx + woolR * 0.6}" y="${cy - woolR * 0.5}" font-size="20" text-anchor="middle">🤚</text>
      <text x="${cx - woolR * 0.3}" y="${cy - woolR * 0.9}" font-size="16">💕</text>`;
  }
  return '';
}

/** 애니메이션 클래스 결정 */
function getSheepAnimClass(pose) {
  const map = {
    [SHEEP_POSE.IDLE]:  'sheep-idle',
    [SHEEP_POSE.SLEEP]: 'sheep-sleep-anim',
    [SHEEP_POSE.PET]:   '',
    [SHEEP_POSE.EAT]:   '',
    [SHEEP_POSE.HAPPY]: '',
    [SHEEP_POSE.SAD]:   '',
  };
  return map[pose] ?? 'sheep-idle';
}

/** 수면 포즈: 옆으로 누운 양 */
function buildSleepSVG(step, wScale, bubbles) {
  const woolR = Math.round(22 + wScale * 24);
  return `
<svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" class="sheep-svg sheep-sleep-anim">
  <!-- 그림자 -->
  <ellipse cx="110" cy="148" rx="${40 + wScale * 15}" ry="7" fill="rgba(0,0,0,0.1)"/>

  <!-- 누운 몸 (양털) -->
  ${buildSleepWool(110, 90, woolR, bubbles, wScale)}

  <!-- 귀 -->
  <ellipse cx="62" cy="68" rx="9" ry="13" fill="${C.EAR}" transform="rotate(-30 62 68)"/>
  <ellipse cx="62" cy="68" rx="5.5" ry="8" fill="#FFB3A0" transform="rotate(-30 62 68)"/>

  <!-- 얼굴 -->
  <ellipse cx="76" cy="92" rx="28" ry="26" fill="${C.FACE}"/>

  <!-- 볼터치 -->
  <ellipse cx="62" cy="98" rx="9" ry="6" fill="${C.BLUSH}" opacity="0.5"/>
  <ellipse cx="90" cy="98" rx="9" ry="6" fill="${C.BLUSH}" opacity="0.5"/>

  <!-- 자는 눈 (가로선) -->
  <path d="M 62 88 Q 68 84 74 88" stroke="${C.EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 78 88 Q 84 84 90 88" stroke="${C.EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- 코 -->
  <ellipse cx="76" cy="100" rx="5" ry="3.5" fill="${C.NOSE}"/>

  <!-- 편안한 입 -->
  <path d="M 69 107 Q 76 112 83 107" stroke="${C.NOSE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>

  <!-- 다리 (접힌 상태) -->
  <rect x="110" y="118" width="18" height="14" rx="7" fill="${C.LEG}"/>
  <rect x="132" y="122" width="16" height="12" rx="6" fill="${C.LEG}"/>

  <!-- ZZZ 파티클 -->
  <text x="148" y="70" font-size="18" fill="#A78BFA" font-weight="900" opacity="0.8"
    style="animation: zFloat 2.5s ease-out infinite">Z</text>
  <text x="160" y="54" font-size="13" fill="#BBD6FF" font-weight="900" opacity="0.6"
    style="animation: zFloat 2.5s 0.8s ease-out infinite">z</text>
  <text x="170" y="42" font-size="10" fill="#E5DDF2" font-weight="900" opacity="0.4"
    style="animation: zFloat 2.5s 1.6s ease-out infinite">z</text>
</svg>`;
}

/** 누운 양 털 클라우드 */
function buildSleepWool(cx, cy, woolR, bubbles, wScale) {
  let parts = '';
  const count = Math.ceil(bubbles * 0.7);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = cx + Math.cos(angle) * woolR;
    const y = cy + Math.sin(angle) * woolR * 0.6;
    const r = Math.round(woolR * (0.32 + wScale * 0.08));
    parts += `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${r}" fill="${i % 2 ? C.WOOL : C.WOOL_WARM}"/>`;
  }
  parts += `<circle cx="${cx}" cy="${cy}" r="${Math.round(woolR * 0.55)}" fill="${C.WOOL}"/>`;
  return parts;
}

/** 양털깎기 전 (털 최대) SVG — Canvas woolCanvas 레이어용 */
export function buildShearSVG(step = 5) {
  const cfg = GROWTH_TABLE[Math.min(step, 10)] ?? GROWTH_TABLE[5];
  const bubbles = Math.max(cfg.woolBubbles, 15);
  const woolR = 56;
  return `
<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
  ${buildWoolCloud(100, 95, woolR, bubbles, 1.0)}
  <ellipse cx="100" cy="212" rx="45" ry="6" fill="rgba(0,0,0,0.1)"/>
</svg>`;
}

/** 양털깎기 후 (민둥) SVG — Canvas bodySheep 레이어용 */
function buildShearAfterSVG() {
  const cx = 100, cy = 108;
  return `
<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" class="sheep-svg">
  <!-- 그림자 -->
  <ellipse cx="${cx}" cy="212" rx="30" ry="6" fill="rgba(0,0,0,0.1)"/>

  <!-- 민둥 몸통 (작은 타원) -->
  <ellipse cx="${cx}" cy="${cy - 15}" rx="38" ry="32" fill="${C.WOOL_WARM}"/>

  <!-- 귀 -->
  <ellipse cx="${cx - 32}" cy="${cy - 22}" rx="9" ry="13" fill="${C.EAR}" transform="rotate(-20 ${cx-32} ${cy-22})"/>
  <ellipse cx="${cx - 32}" cy="${cy - 22}" rx="5.5" ry="8" fill="#FFB3A0" transform="rotate(-20 ${cx-32} ${cy-22})"/>
  <ellipse cx="${cx + 32}" cy="${cy - 22}" rx="9" ry="13" fill="${C.EAR}" transform="rotate(20 ${cx+32} ${cy-22})"/>
  <ellipse cx="${cx + 32}" cy="${cy - 22}" rx="5.5" ry="8" fill="#FFB3A0" transform="rotate(20 ${cx+32} ${cy-22})"/>

  <!-- 얼굴 -->
  <ellipse cx="${cx}" cy="${cy}" rx="32" ry="28" fill="${C.FACE}"/>

  <!-- 볼터치 -->
  <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="10" ry="6" fill="${C.BLUSH}" opacity="0.5"/>
  <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="10" ry="6" fill="${C.BLUSH}" opacity="0.5"/>

  <!-- 놀란 눈 -->
  <circle cx="${cx - 10}" cy="${cy - 4}" r="6" fill="${C.EYE}"/>
  <circle cx="${cx + 10}" cy="${cy - 4}" r="6" fill="${C.EYE}"/>
  <circle cx="${cx - 8}"  cy="${cy - 6}" r="2.5" fill="${C.EYE_SHINE}"/>
  <circle cx="${cx + 12}" cy="${cy - 6}" r="2.5" fill="${C.EYE_SHINE}"/>

  <!-- 코 -->
  <ellipse cx="${cx}" cy="${cy + 10}" rx="5" ry="3.5" fill="${C.NOSE}"/>

  <!-- O 모양 입 (놀람) -->
  <ellipse cx="${cx}" cy="${cy + 18}" rx="5" ry="5" fill="${C.NOSE}" opacity="0.7"/>

  <!-- 다리 -->
  <rect x="${cx - 22}" y="${cy + 28}" width="16" height="20" rx="8" fill="${C.LEG}"/>
  <rect x="${cx + 6}"  y="${cy + 28}" width="16" height="20" rx="8" fill="${C.LEG}"/>
  <rect x="${cx - 22}" y="${cy + 40}" width="16" height="8" rx="4" fill="${C.LEG_DARK}"/>
  <rect x="${cx + 6}"  y="${cy + 40}" width="16" height="8" rx="4" fill="${C.LEG_DARK}"/>

  <!-- 짧은 털 흔적들 -->
  <circle cx="${cx - 28}" cy="${cy - 10}" r="5" fill="${C.WOOL_WARM}" opacity="0.6"/>
  <circle cx="${cx + 30}" cy="${cy - 15}" r="4" fill="${C.WOOL_WARM}" opacity="0.6"/>
  <circle cx="${cx}"      cy="${cy - 38}" r="6" fill="${C.WOOL_WARM}" opacity="0.6"/>
</svg>`;
}

// ─── Canvas 렌더링 (미니게임용) ───

/**
 * bodySheep Canvas에 민둥 양 그리기
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w canvas 너비
 * @param {number} h canvas 높이
 */
export function drawBodySheep(ctx, w, h, step = 1, preloadedImg = null) {
  ctx.clearRect(0, 0, w, h);
  if (USE_EXTERNAL_ASSETS && preloadedImg) {
    ctx.drawImage(preloadedImg, 0, 0, w, h);
    return;
  }
  const s   = Math.min(w, h);
  const cx  = w / 2;
  const cy  = h / 2 - s * 0.02;
  const sc  = s / 200;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);

  // 그림자
  ctx.ellipse(0, 105, 40, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fill();

  // 몸통
  _ellipse(ctx, 0, -10, 45, 38, C.WOOL_WARM);

  // 귀 좌
  ctx.save();
  ctx.translate(-38, -28);
  ctx.rotate(-0.35);
  _ellipse(ctx, 0, 0, 10, 14, C.EAR);
  _ellipse(ctx, 0, 0, 6,  9,  '#FFB3A0');
  ctx.restore();

  // 귀 우
  ctx.save();
  ctx.translate(38, -28);
  ctx.rotate(0.35);
  _ellipse(ctx, 0, 0, 10, 14, C.EAR);
  _ellipse(ctx, 0, 0, 6,  9,  '#FFB3A0');
  ctx.restore();

  // 얼굴
  _ellipse(ctx, 0, 6, 34, 30, C.FACE);

  // 볼
  _ellipse(ctx, -20, 14, 11, 7, C.BLUSH, 0.45);
  _ellipse(ctx,  20, 14, 11, 7, C.BLUSH, 0.45);

  // 눈 (놀람)
  _circle(ctx, -11, 0, 6, C.EYE);
  _circle(ctx,  11, 0, 6, C.EYE);
  _circle(ctx,  -9, -2, 2.5, '#fff');
  _circle(ctx,  13, -2, 2.5, '#fff');

  // 코
  _ellipse(ctx, 0, 13, 5, 3.5, C.NOSE);

  // 입 (O 모양)
  _ellipse(ctx, 0, 21, 5, 5, C.NOSE, 0.7);

  // 다리
  _roundRect(ctx, -24, 32, 16, 22, 8, C.LEG);
  _roundRect(ctx,   8, 32, 16, 22, 8, C.LEG);
  _roundRect(ctx, -24, 46, 16, 8, 4, C.LEG_DARK);
  _roundRect(ctx,   8, 46, 16, 8, 4, C.LEG_DARK);

  // 짧은 털 흔적
  _circle(ctx, -32, -12, 6, C.WOOL_WARM, 0.55);
  _circle(ctx,  34, -18, 5, C.WOOL_WARM, 0.55);
  _circle(ctx,   0, -44, 7, C.WOOL_WARM, 0.55);

  ctx.restore();
}

/**
 * woolCanvas에 양털 그리기
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} step 1~10
 */
export function drawWoolLayer(ctx, w, h, step = 5, preloadedImg = null) {
  ctx.clearRect(0, 0, w, h);
  if (USE_EXTERNAL_ASSETS && preloadedImg) {
    ctx.drawImage(preloadedImg, 0, 0, w, h);
    return;
  }
  const cfg = GROWTH_TABLE[Math.min(step, 10)] ?? GROWTH_TABLE[5];
  const bubbles = Math.max(cfg.woolBubbles, 15);
  const s   = Math.min(w, h);
  const cx  = w / 2;
  const cy  = h / 2 - s * 0.02;
  const sc  = s / 200;
  const woolR = 58;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);

  // 털 클라우드 (외곽 → 중심 순으로 그림)
  const layers = [
    { count: Math.ceil(bubbles * 0.5), r: woolR * 0.95, size: 0.38 },
    { count: Math.ceil(bubbles * 0.35), r: woolR * 0.6, size: 0.28 },
    { count: Math.ceil(bubbles * 0.15), r: woolR * 0.25, size: 0.20 },
  ];

  layers.forEach(({ count, r, size }) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const bx = Math.cos(angle) * r - 0;
      const by = Math.sin(angle) * r * 0.85 - 10;
      const br = woolR * size;
      const col = i % 3 === 0 ? C.WOOL_SHAD : (i % 3 === 1 ? C.WOOL : C.WOOL_WARM);
      _circle(ctx, bx, by, br, col);
    }
  });

  // 중심
  _circle(ctx, 0, -10, woolR * 0.55, C.WOOL);

  ctx.restore();
}

// ─── 내부 Canvas 헬퍼 ───
function _circle(ctx, x, y, r, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function _ellipse(ctx, x, y, rx, ry, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function _roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * 미니게임용 이미지 사전 로드
 * @param {number} step 성장 단계
 * @returns {Promise<{ bodyImg: HTMLImageElement|null, woolImg: HTMLImageElement|null }>}
 */
export function preloadMinigameAssets(step) {
  if (!USE_EXTERNAL_ASSETS) return Promise.resolve({ bodyImg: null, woolImg: null });

  const isSubpage = window.location.pathname.includes('/pages/');
  const basePath = isSubpage ? '../' : '';

  const bodyImg = new Image();
  const woolImg = new Image();

  bodyImg.src = `${basePath}assets/sheep/step${step}/shear_after.png`;
  woolImg.src = `${basePath}assets/sheep/step${step}/shear.png`;

  const p1 = new Promise(resolve => { bodyImg.onload = () => resolve(bodyImg); bodyImg.onerror = () => resolve(null); });
  const p2 = new Promise(resolve => { woolImg.onload = () => resolve(woolImg); woolImg.onerror = () => resolve(null); });

  return Promise.all([p1, p2]).then(([body, wool]) => {
    return { bodyImg: body, woolImg: wool };
  });
}
