/**
 * sheep.js — 양 상태 관리, XP, 레벨업, 상호작용
 */

import { GROWTH_TABLE, SHEEP_POSE, DAILY_QUOTES, NAME_REJECT_HAPPINESS_DELTA } from './constants.js';
import { getSheep, saveSheep } from './storage.js';
import { getSheepSVG } from './sheep-renderer.js';
import { showToast } from './app.js';

const WOOL_GROWTH_MAX = 3;
const STAT_MAX = 100;

// ─── 상태 조회 ───

/** 현재 양 상태 반환 */
export function readSheep() {
  return getSheep();
}

/** 현재 성장 단계 config 반환 */
export function getStepConfig(step) {
  return GROWTH_TABLE[Math.min(Math.max(step, 1), 10)];
}

// ─── 양털 성장 (행복·포만 MAX) ───

/**
 * 행복도·포만감이 동시에 MAX일 때 양털 성장도 +1
 * @returns {boolean} 이번에 성장했는지
 */
export function tryWoolGrowthFromStats(sheep = getSheep()) {
  const atMax = sheep.happiness >= STAT_MAX && sheep.hunger >= STAT_MAX;

  if (!atMax) {
    sheep.atStatMax = false;
    return false;
  }

  if (sheep.atStatMax) return false;

  sheep.atStatMax = true;
  if (sheep.woolGrowth >= WOOL_GROWTH_MAX) return false;

  sheep.woolGrowth = Math.min(WOOL_GROWTH_MAX, sheep.woolGrowth + 1);
  if (sheep.woolGrowth >= WOOL_GROWTH_MAX) sheep.canShear = true;
  saveSheep(sheep);
  return true;
}

/** 이름 짓기 거절 */
export function rejectNaming() {
  const sheep = getSheep();
  sheep.happiness = Math.max(10, sheep.happiness - NAME_REJECT_HAPPINESS_DELTA);
  sheep.atStatMax = false;
  saveSheep(sheep);
  return sheep.happiness;
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

  while (sheep.xp >= sheep.xpToNext && sheep.level < 10) {
    sheep.xp      -= sheep.xpToNext;
    sheep.level   += 1;
    sheep.xpToNext = calcXpToNext(sheep.level);
    leveledUp = true;

    const newStepVal = calcStep(sheep.level);
    if (newStepVal !== sheep.step) {
      sheep.step = newStepVal;
      newStep = true;
    }
  }

  if (sheep.level >= 10) {
    sheep.xp = Math.min(sheep.xp, sheep.xpToNext - 1);
  }

  saveSheep(sheep);
  return { sheep, leveledUp, newStep };
}

function calcXpToNext(level) {
  const table = [null, 100, 150, 200, 250, 300, 350, 400, 450, 500, Infinity];
  return table[Math.min(level, 10)] ?? 500;
}

function calcStep(level) {
  return Math.min(Math.ceil(level / 1), 10);
}

// ─── 상호작용 ───

/**
 * 가벼운 터치 (부위 탭) — 행복도 소폭 상승
 */
export function touchSheep(happinessGain = 4) {
  const sheep = getSheep();
  sheep.happiness = Math.min(STAT_MAX, sheep.happiness + happinessGain);
  const woolGrew = tryWoolGrowthFromStats(sheep);
  if (!woolGrew) saveSheep(sheep);
  return { success: true, happiness: sheep.happiness, woolGrew };
}

/**
 * 쓰다듬기
 */
export function petSheep() {
  const sheep = getSheep();
  const now = Date.now();

  if (sheep.lastPetAt && now - sheep.lastPetAt < 30_000) {
    const remain = Math.ceil((30_000 - (now - sheep.lastPetAt)) / 1000);
    return { success: false, msg: `${remain}초 후에 다시 쓰다듬을 수 있어요!` };
  }

  const xpRes = addXP(5);
  const currentSheep = xpRes.sheep;

  currentSheep.happiness = Math.min(STAT_MAX, currentSheep.happiness + 12);
  currentSheep.lastPetAt = now;
  const woolGrew = tryWoolGrowthFromStats(currentSheep);
  if (!woolGrew) saveSheep(currentSheep);

  const msgs = ['메에~ 좋아! (+5 XP) 🥰', '좋아! 더 해줘~ (+5 XP) 💕', '행복해요 ♥ (+5 XP)', '메메메~ (+5 XP) 🎵'];
  return {
    success: true,
    msg: msgs[Math.floor(Math.random() * msgs.length)],
    happiness: currentSheep.happiness,
    leveledUp: xpRes.leveledUp,
    woolGrew,
  };
}

export function feedSheep() {
  const sheep = getSheep();
  const now = Date.now();

  if (sheep.lastFedAt && now - sheep.lastFedAt < 60_000) {
    const remain = Math.ceil((60_000 - (now - sheep.lastFedAt)) / 1000);
    return { success: false, msg: `${remain}초 후에 먹이를 줄 수 있어요!` };
  }

  const xpRes = addXP(8);
  const currentSheep = xpRes.sheep;

  currentSheep.hunger    = Math.min(STAT_MAX, currentSheep.hunger + 15);
  currentSheep.lastFedAt = now;
  const woolGrew = tryWoolGrowthFromStats(currentSheep);
  if (!woolGrew) saveSheep(currentSheep);

  const msgs = ['냠냠~ 맛있어! (+8 XP) 🥕', '당근 최고야! (+8 XP) 😋', '배 불러! 고마워 (+8 XP) 💕', '메에~ 맛있다! (+8 XP) 🌟'];
  return {
    success: true,
    msg: msgs[Math.floor(Math.random() * msgs.length)],
    hunger: currentSheep.hunger,
    leveledUp: xpRes.leveledUp,
    woolGrew,
  };
}

/**
 * 포만감 보조 상승 (수면 규칙성 등)
 * @param {number} amount
 * @returns {{ woolGrew: boolean }}
 */
export function boostHunger(amount) {
  if (amount <= 0) return { woolGrew: false };
  const sheep = getSheep();
  sheep.hunger = Math.min(STAT_MAX, sheep.hunger + amount);
  const woolGrew = tryWoolGrowthFromStats(sheep);
  if (!woolGrew) saveSheep(sheep);
  return { woolGrew };
}

export function decaySheepStats() {
  const sheep = getSheep();
  const now   = Date.now();
  const lastUpdate = sheep.lastDecayAt ?? now;
  const hours      = (now - lastUpdate) / (1000 * 60 * 60);

  if (hours >= 0.5) {
    const decay       = Math.floor(hours * 4);
    sheep.happiness   = Math.max(sheep.happiness - decay, 10);
    sheep.hunger      = Math.max(sheep.hunger     - decay, 10);
    sheep.atStatMax   = false;
    sheep.lastDecayAt = now;
    saveSheep(sheep);
  }

  return sheep;
}

// ─── UI 렌더링 헬퍼 ───

export function renderSheepTo(container, step, pose = SHEEP_POSE.IDLE) {
  if (!container) return;
  container.innerHTML = getSheepSVG(step, pose);

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

export function updateStatBar(el, value) {
  if (!el) return;
  el.style.width = `${Math.max(0, Math.min(value, 100))}%`;
}

export function getDailyQuote() {
  const day = new Date().getDate();
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
}

export function playSheepAnim(container, animClass, ms = 800) {
  if (!container) return;
  const svgEl = container.querySelector('.sheep-svg');
  if (!svgEl) return;
  svgEl.classList.add(animClass);
  setTimeout(() => svgEl.classList.remove(animClass), ms);
}
