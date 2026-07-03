/**
 * sheep.js — 양 상태 관리, XP, 레벨업, 상호작용
 */

import { GROWTH_TABLE, SHEEP_POSE, DAILY_QUOTES, DEFAULT_SHEEP } from './constants.js';
import { getSheep, saveSheep } from './storage.js';
import { getSheepSVG } from './sheep-renderer.js';
import { showToast } from './app.js';

// ─── 상태 조회 ───

/** 현재 양 상태 반환 */
export function readSheep() {
  return getSheep();
}

/** 현재 성장 단계 config 반환 */
export function getStepConfig(step) {
  return GROWTH_TABLE[Math.min(Math.max(step, 1), 10)];
}

// ─── XP & 레벨 ───

/**
 * XP 추가 후 레벨업 처리
 * @param {number} amount 추가할 XP
 * @returns {{ sheep: object, leveledUp: boolean, newStep: boolean }}
 */
export function addXP(amount) {
  const sheep = getSheep();
  sheep.xp += amount;

  let leveledUp = false;
  let newStep   = false;

  // 레벨업 루프 (한 번에 여러 레벨 가능)
  while (sheep.xp >= sheep.xpToNext && sheep.level < 10) {
    sheep.xp      -= sheep.xpToNext;
    sheep.level   += 1;
    sheep.xpToNext = calcXpToNext(sheep.level);
    leveledUp = true;

    // 성장 단계 계산
    const newStepVal = calcStep(sheep.level);
    if (newStepVal !== sheep.step) {
      sheep.step = newStepVal;
      newStep = true;

      // 양털 성장 ++
      sheep.woolGrowth = Math.min(sheep.woolGrowth + 1, 3);
      if (sheep.woolGrowth >= 3) sheep.canShear = true;
    }
  }

  // MAX 레벨 10이면 xp 고정
  if (sheep.level >= 10) {
    sheep.xp = Math.min(sheep.xp, sheep.xpToNext - 1);
  }

  saveSheep(sheep);
  return { sheep, leveledUp, newStep };
}

/** 레벨 → 다음 레벨까지 필요 XP */
function calcXpToNext(level) {
  const table = [null, 100, 150, 200, 250, 300, 350, 400, 450, 500, Infinity];
  return table[Math.min(level, 10)] ?? 500;
}

/** 레벨 → 성장 단계 (GROWTH_TABLE 기반) */
function calcStep(level) {
  // 레벨 1~2 → step 1, 3~4 → step 2, ... 순으로 매핑
  return Math.min(Math.ceil(level / 1), 10);
}

// ─── 상호작용 ───

/**
 * 쓰다듬기
 * @returns {{ happiness: number, msg: string }}
 */
export function petSheep() {
  const sheep = getSheep();

  // 쿨타임: 30초
  const now = Date.now();
  if (sheep.lastPetAt && now - sheep.lastPetAt < 30_000) {
    const remain = Math.ceil((30_000 - (now - sheep.lastPetAt)) / 1000);
    return { success: false, msg: `${remain}초 후에 다시 쓰다듬을 수 있어요!` };
  }

  // 경험치 추가
  const xpRes = addXP(5);
  const currentSheep = xpRes.sheep;

  currentSheep.happiness = Math.min(currentSheep.happiness + 10, 100);
  currentSheep.lastPetAt = now;
  saveSheep(currentSheep);

  const msgs = ['메에~ 좋아! (+5 XP) 🥰', '좋아! 더 해줘~ (+5 XP) 💕', '행복해요 ♥ (+5 XP)', '메메메~ (+5 XP) 🎵'];
  return { 
    success: true, 
    msg: msgs[Math.floor(Math.random() * msgs.length)], 
    happiness: currentSheep.happiness,
    leveledUp: xpRes.leveledUp
  };
}

export function feedSheep() {
  const sheep = getSheep();

  // 쿨타임: 60초
  const now = Date.now();
  if (sheep.lastFedAt && now - sheep.lastFedAt < 60_000) {
    const remain = Math.ceil((60_000 - (now - sheep.lastFedAt)) / 1000);
    return { success: false, msg: `${remain}초 후에 먹이를 줄 수 있어요!` };
  }

  // 경험치 추가
  const xpRes = addXP(8);
  const currentSheep = xpRes.sheep;

  currentSheep.hunger    = Math.min(currentSheep.hunger + 15, 100);
  currentSheep.lastFedAt = now;
  saveSheep(currentSheep);

  const msgs = ['냠냠~ 맛있어! (+8 XP) 🥕', '당근 최고야! (+8 XP) 😋', '배 불러! 고마워 (+8 XP) 💕', '메에~ 맛있다! (+8 XP) 🌟'];
  return { 
    success: true, 
    msg: msgs[Math.floor(Math.random() * msgs.length)], 
    hunger: currentSheep.hunger,
    leveledUp: xpRes.leveledUp
  };
}


/**
 * 시간에 따라 행복도/배고픔 자연 감소 (앱 열 때마다 호출)
 */
export function decaySheepStats() {
  const sheep = getSheep();
  const now   = Date.now();

  // 마지막 업데이트 시간
  const lastUpdate = sheep.lastDecayAt ?? now;
  const hours      = (now - lastUpdate) / (1000 * 60 * 60);

  if (hours >= 0.5) { // 30분마다 감소
    const decay       = Math.floor(hours * 4); // 시간당 -4씩
    sheep.happiness   = Math.max(sheep.happiness - decay, 10);
    sheep.hunger      = Math.max(sheep.hunger     - decay, 10);
    sheep.lastDecayAt = now;
    saveSheep(sheep);
  }

  return sheep;
}

// ─── UI 렌더링 헬퍼 ───

/**
 * 양 SVG를 DOM 요소에 주입
 * @param {HTMLElement} container
 * @param {number} step
 * @param {string} pose
 */
export function renderSheepTo(container, step, pose = SHEEP_POSE.IDLE) {
  if (!container) return;
  container.innerHTML = getSheepSVG(step, pose);

  // PNG 이미지 모드: 로드 실패 시 귀여운 SVG 양으로 폴백
  const img = container.querySelector('img.sheep-svg');
  if (img) {
    img.onerror = () => {
      container.innerHTML = `
        <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" class="sheep-svg" style="width:100%;height:100%;">
          <ellipse cx="100" cy="212" rx="40" ry="7" fill="rgba(0,0,0,0.15)"/>
          <circle cx="100" cy="100" r="52" fill="#FFF7EE" opacity="0.95"/>
          <circle cx="72"  cy="84"  r="22" fill="#FFF7EE"/>
          <circle cx="130" cy="84"  r="22" fill="#FFF7EE"/>
          <circle cx="80"  cy="70"  r="20" fill="#FFF7EE"/>
          <circle cx="120" cy="70"  r="20" fill="#FFF7EE"/>
          <circle cx="100" cy="62"  r="22" fill="#FFF7EE"/>
          <ellipse cx="100" cy="115" rx="35" ry="30" fill="#FFD9A6"/>
          <circle cx="88" cy="110" r="6" fill="#2D1B0E"/>
          <circle cx="112" cy="110" r="6" fill="#2D1B0E"/>
          <circle cx="90" cy="108" r="2" fill="white"/>
          <circle cx="114" cy="108" r="2" fill="white"/>
          <ellipse cx="100" cy="125" rx="8" ry="5" fill="#C4876A"/>
          <rect x="80" y="140" width="14" height="22" rx="7" fill="#C4876A"/>
          <rect x="106" y="140" width="14" height="22" rx="7" fill="#C4876A"/>
        </svg>`;
    };
  }
}


/**
 * XP 바 업데이트
 * @param {HTMLElement} fillEl   fill div
 * @param {HTMLElement} labelEl  텍스트 레이블
 * @param {object} sheep
 */
export function updateXPBar(fillEl, labelEl, sheep) {
  if (!fillEl) return;
  const pct = sheep.xpToNext > 0
    ? Math.min((sheep.xp / sheep.xpToNext) * 100, 100)
    : 100;
  fillEl.style.width = `${pct}%`;
  if (labelEl) {
    labelEl.textContent = `${sheep.xp} / ${sheep.xpToNext === Infinity ? '∞' : sheep.xpToNext} XP`;
  }
}

/**
 * 상태 바 업데이트
 * @param {HTMLElement} el fill div
 * @param {number} value 0~100
 */
export function updateStatBar(el, value) {
  if (!el) return;
  el.style.width = `${Math.max(0, Math.min(value, 100))}%`;
}

/**
 * 오늘의 한마디 반환
 */
export function getDailyQuote() {
  const day = new Date().getDate();
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
}

/**
 * 양 포즈 이름 → 애니메이션 실행
 * @param {HTMLElement} container
 * @param {string} animClass CSS animation class
 * @param {number} ms 지속 시간
 */
export function playSheepAnim(container, animClass, ms = 800) {
  if (!container) return;
  const svgEl = container.querySelector('.sheep-svg');
  if (!svgEl) return;
  svgEl.classList.add(animClass);
  setTimeout(() => svgEl.classList.remove(animClass), ms);
}
