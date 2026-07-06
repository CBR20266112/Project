/**
 * pet-effects.js — 쓰다듬기 전용 랜덤 이미지·이펙트·사운드
 * 성장 단계와 무관하게 동일 에셋 사용.
 *
 *   assets/pet/poses/    — 반응 이미지 (01.png, 02.png …)
 *   assets/pet/effects/  — 하트·손·반짝이 파티클
 *   (효과음·울음은 sound.js Web Audio 합성)
 */

import { SHEEP_POSE } from './constants.js';
import { renderSheepTo, playSheepAnim } from './sheep.js';
import { playPetSoundBundle } from './sound.js';

const PET_BUBBLES = [
  '"기분 좋아! 고마워 양~ ♥"',
  '"메에~ 더 해줘! 💕"',
  '"으음~ 좋다... 🥰"',
  '"히히 간지러워~ 근데 좋아! 🐑"',
  '"머리 쓰다듬어 주면 행복해져! ♡"',
  '"메메메~ 최고야! ✨"',
];

const PET_EMOJIS = ['💕', '🩷', '❤️', '💜', '✨', '🤚', '⭐', '💖', '🌟'];

const EFFECT_FILE_NAMES = [
  'hand.png.png', 'heart.png.png', 'miniHeart.png.png',
  'twinkle.png.png', 'wool.png.png', 'woolShine.png.png',
  'heart.png', 'sparkle.png', 'hand.png',
];

function getAssetBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 공통 쓰다듬기 반응 이미지 후보 (단계 무관) */
export function getPetPoseCandidates() {
  const base = getAssetBasePath();
  const paths = [];

  for (let i = 1; i <= 8; i++) {
    paths.push(`${base}assets/pet/poses/pose${i}.png`);
  }
  for (let i = 1; i <= 16; i++) {
    paths.push(`${base}assets/pet/poses/${String(i).padStart(2, '0')}.png`);
  }
  for (const name of ['pet.png', 'happy.png', 'shy.png', 'wink.png', 'excited.png']) {
    paths.push(`${base}assets/pet/poses/${name}`);
  }

  // 기존에 넣어 둔 step1 반응 이미지도 공통 풀에 포함
  paths.push(`${base}assets/sheep/step1/pet.png`);
  for (let i = 2; i <= 8; i++) {
    paths.push(`${base}assets/sheep/step1/pet (${i}).png`);
  }

  return paths;
}

/** 공통 반응 이미지 랜덤 1장 (최대 8회 시도) */
function showRandomPetPose(container, step) {
  if (!container) return;
  const candidates = getPetPoseCandidates();
  const maxTries = Math.min(8, candidates.length);
  const tried = new Set();

  function tryNext() {
    if (tried.size >= maxTries) {
      renderSheepTo(container, step, SHEEP_POSE.IDLE);
      return;
    }
    let path = pickRandom(candidates);
    while (tried.has(path) && tried.size < candidates.length) {
      path = pickRandom(candidates);
    }
    tried.add(path);

    const img = document.createElement('img');
    img.className = 'sheep-svg';
    img.alt = '양';
    img.decoding = 'async';
    img.onload = () => {
      container.innerHTML = '';
      container.appendChild(img);
    };
    img.onerror = tryNext;
    img.src = path;
  }

  tryNext();
}

function spawnPetEmoji(container, emoji) {
  const el = document.createElement('div');
  el.className = 'pet-effect-particle pet-effect-emoji';
  el.textContent = emoji;
  el.style.left = `${15 + Math.random() * 70}%`;
  el.style.top = `${20 + Math.random() * 45}%`;
  el.style.animationDelay = `${Math.random() * 0.15}s`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function spawnPetEffectImage(container, fileName) {
  const base = `${getAssetBasePath()}assets/pet/effects/`;
  const img = document.createElement('img');
  img.className = 'pet-effect-particle';
  img.src = base + fileName;
  img.alt = '';
  img.style.left = `${10 + Math.random() * 75}%`;
  img.style.top = `${15 + Math.random() * 50}%`;
  img.style.animationDelay = `${Math.random() * 0.2}s`;
  img.onerror = () => {
    img.remove();
    spawnPetEmoji(container, pickRandom(PET_EMOJIS));
  };
  container.appendChild(img);
  setTimeout(() => img.remove(), 1300);
}

export function spawnPetEffects(container, count) {
  if (!container) return;
  container.style.position = 'relative';
  const n = count ?? Math.floor(2 + Math.random() * 3);
  const files = shuffle(EFFECT_FILE_NAMES);

  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      if (Math.random() < 0.55) {
        spawnPetEffectImage(container, files[i % files.length]);
      } else {
        spawnPetEmoji(container, pickRandom(PET_EMOJIS));
      }
    }, i * 100);
  }
}

/**
 * 쓰다듬기 성공 시 비주얼·사운드 일괄 재생
 * @param {number} step — 종료 후 복귀할 양 성장 단계 (idle 포즈용)
 */
export function runPetInteraction({ container, step, speechEl, idleMs = 2500 } = {}) {
  const bubble = pickRandom(PET_BUBBLES);

  showRandomPetPose(container, step);
  playSheepAnim(container, 'sheep-pet-anim', 600);
  spawnPetEffects(container);
  playPetSoundBundle();

  if (speechEl) {
    speechEl.textContent = bubble;
    speechEl.style.animation = 'none';
    speechEl.offsetHeight;
    speechEl.style.animation = 'fadeInUp 0.4s ease';
  }

  setTimeout(() => {
    renderSheepTo(container, step, SHEEP_POSE.IDLE);
  }, idleMs);

  return bubble;
}
