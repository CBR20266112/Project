/**
 * sound.js - Sleepy Sheep ?ъ슫???쒖뒪?? * Web Audio API瑜??ъ슜???꾨줈?쒖????ъ슫???⑹꽦
 */

import { getSettings } from './storage.js';
import { t, DEFAULT_LANGUAGE } from './i18n.js';

let _ctx = null;
let _masterGain = null;
let _sfxGain = null;
let _asmrtGain = null;
let _binauralGain = null;
let _bgmGain = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = 0.8;
    _masterGain.connect(_ctx.destination);
    _sfxGain = _ctx.createGain();
    _sfxGain.gain.value = 0.9;
    _sfxGain.connect(_masterGain);
    _asmrtGain = _ctx.createGain();
    _asmrtGain.gain.value = 0.6;
    _asmrtGain.connect(_masterGain);
    _binauralGain = _ctx.createGain();
    _binauralGain.gain.value = 0;
    _binauralGain.connect(_masterGain);
    _bgmGain = _ctx.createGain();
    _bgmGain.gain.value = 0.18; // 諛곌꼍?뚯븙? 湲곕낯?곸쑝濡??묎쾶
    _bgmGain.connect(_masterGain);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

const SOUND_KEY = 'ss_sound_prefs';
let _prefs = JSON.parse(localStorage.getItem(SOUND_KEY) || '{}');

function savePrefs() {
  localStorage.setItem(SOUND_KEY, JSON.stringify(_prefs));
}

export function setSfxVolume(v) { _prefs.sfxVol = v; savePrefs(); if (_sfxGain) _sfxGain.gain.value = v; }
export function setAsmrVolume(v) { _prefs.asmrVol = v; savePrefs(); if (_asmrtGain) _asmrtGain.gain.value = v; }
export function setBgmVolume(v) { _prefs.bgmVol = v; savePrefs(); if (_bgmGain) _bgmGain.gain.value = v; }
export function getSfxVolume()  { return _prefs.sfxVol  ?? 0.9; }
export function getAsmrVolume() { return _prefs.asmrVol ?? 0.6; }
export function getBgmVolume()  { return _prefs.bgmVol  ?? 0.18; }
export function isSfxEnabled()  { return _prefs.sfxOn  !== false; }
export function isAsmrEnabled() { return _prefs.asmrOn !== false; }
export function isBgmEnabled()  { return _prefs.bgmOn  !== false; }
export function setSfxEnabled(v)  { _prefs.sfxOn  = v; savePrefs(); }
export function setAsmrEnabled(v) { _prefs.asmrOn = v; savePrefs(); }
export function setBgmEnabled(v)  { _prefs.bgmOn  = v; savePrefs(); if (!v) stopBgm(); else if (!_bgmRunning) startBgm(); }

function syncVolumes() {
  if (_sfxGain)   _sfxGain.gain.value   = getSfxVolume();
  if (_asmrtGain) _asmrtGain.gain.value  = getAsmrVolume();
  if (_binauralGain && _currentBinauralId) _applyBinauralGain();
  if (_bgmGain)   _bgmGain.gain.value    = getBgmVolume();
}

function rand(min, max) { return min + Math.random() * (max - min); }

function makeNoiseBuffer(duration, channels = 1) {
  const ctx = getCtx();
  const frames = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(channels, frames, ctx.sampleRate);
  for (let c = 0; c < channels; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function createNoise(duration) {
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(duration);
  return src;
}

function createFilter(type, freq, q = 1) {
  const ctx = getCtx();
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function createGain(val) {
  const ctx = getCtx();
  const g = ctx.createGain();
  g.gain.value = val;
  return g;
}

// --- SFX ---

// --- ?곕떎?ш린 ?꾩슜 ?⑹꽦??(?④낵?뙿룹슱???ㅼ뼇 蹂二? ---

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 怨듯넻 ???몄쓬 ?⑹꽦 */
function synthSheepBaa({
  now,
  baseFreq = 320,
  duration = 0.5,
  vol = 0.28,
  wave1 = 'sawtooth',
  wave2 = 'sine',
  pitchUp = 1.2,
  pitchDown = 0.88,
  lpfFreq = 900,
  vibrato = 0,
} = {}) {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const t = now ?? ctx.currentTime;
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = createGain(0);
  o1.type = wave1;
  o2.type = wave2;
  o1.frequency.setValueAtTime(baseFreq, t);
  o1.frequency.linearRampToValueAtTime(baseFreq * pitchUp, t + duration * 0.15);
  o1.frequency.exponentialRampToValueAtTime(baseFreq * pitchDown, t + duration);
  o2.frequency.setValueAtTime(baseFreq * 2, t);
  o2.frequency.linearRampToValueAtTime(baseFreq * 2.2, t + duration * 0.12);
  if (vibrato > 0) {
    const v = ctx.createOscillator();
    const vg = createGain(vibrato);
    v.frequency.value = rand(5, 9);
    v.connect(vg);
    vg.connect(o1.frequency);
    v.start(t);
    v.stop(t + duration + 0.05);
  }
  const lpf = createFilter('lowpass', lpfFreq, 2);
  o1.connect(lpf);
  o2.connect(lpf);
  lpf.connect(g);
  g.connect(_sfxGain);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol * 0.85, t + duration * 0.7);
  g.gain.linearRampToValueAtTime(0, t + duration);
  o1.start(t);
  o1.stop(t + duration + 0.05);
  o2.start(t);
  o2.stop(t + duration + 0.05);
}

// ?? ?곕떎?ш린 ?④낵??蹂二???

function playPetStrokeBoing() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const count = Math.floor(rand(2, 5));
  for (let i = 0; i < count; i++) {
    const t = now + i * rand(0.06, 0.11);
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = pickRandom(['sine', 'triangle']);
    const f = rand(750, 1450);
    o.frequency.setValueAtTime(f * 0.55, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(f * 0.35, t + 0.18);
    o.connect(g);
    g.connect(_sfxGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.22, 0.42), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.start(t);
    o.stop(t + 0.22);
  }
}

function playPetStrokeBrush() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const strokes = Math.floor(rand(4, 7));
  for (let i = 0; i < strokes; i++) {
    const t = now + i * rand(0.05, 0.09);
    const dur = rand(0.04, 0.08);
    const noise = createNoise(dur);
    const lpf = createFilter('lowpass', rand(1800, 3200), 1.2);
    const g = createGain(0);
    noise.connect(lpf);
    lpf.connect(g);
    g.connect(_sfxGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.12, 0.22), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.start(t);
    noise.stop(t + dur + 0.02);
  }
}

function playPetStrokeFluffy() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const pats = Math.floor(rand(2, 4));
  for (let i = 0; i < pats; i++) {
    const t = now + i * rand(0.1, 0.16);
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'sine';
    const f = rand(90, 160);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.12);
    o.connect(g);
    g.connect(_sfxGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.18, 0.3), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.start(t);
    o.stop(t + 0.16);
    const n = createNoise(0.06);
    const bpf = createFilter('bandpass', rand(400, 800), 2);
    const ng = createGain(0);
    n.connect(bpf);
    bpf.connect(ng);
    ng.connect(_sfxGain);
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.08, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n.start(t);
    n.stop(t + 0.08);
  }
}

function playPetStrokeScritch() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const cnt = Math.floor(rand(3, 6));
  for (let i = 0; i < cnt; i++) {
    const t = now + i * rand(0.05, 0.08);
    const dur = rand(0.03, 0.06);
    const noise = createNoise(dur);
    const bpf = createFilter('bandpass', rand(1400, 2800), rand(3, 7));
    const g = createGain(0);
    noise.connect(bpf);
    bpf.connect(g);
    g.connect(_sfxGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.15, 0.28), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.start(t);
    noise.stop(t + dur + 0.02);
  }
}

function playPetStrokeTickle() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const taps = Math.floor(rand(3, 5));
  for (let i = 0; i < taps; i++) {
    const t = now + i * rand(0.04, 0.07);
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'triangle';
    const f = rand(1100, 1800);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.08);
    o.connect(g);
    g.connect(_sfxGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.1, 0.18), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t);
    o.stop(t + 0.12);
  }
}

// ?? ???몄쓬 蹂二???

function playPetBaaClassic() {
  const ctx = getCtx();
  synthSheepBaa({
    now: ctx.currentTime,
    baseFreq: rand(300, 380),
    duration: rand(0.4, 0.62),
    vol: rand(0.24, 0.3),
  });
}

function playPetBaaShort() {
  const ctx = getCtx();
  synthSheepBaa({
    now: ctx.currentTime,
    baseFreq: rand(350, 440),
    duration: rand(0.14, 0.24),
    vol: rand(0.22, 0.28),
    pitchUp: 1.25,
    pitchDown: 0.8,
  });
}

function playPetBaaLong() {
  const ctx = getCtx();
  synthSheepBaa({
    now: ctx.currentTime,
    baseFreq: rand(260, 330),
    duration: rand(0.75, 1.05),
    vol: rand(0.2, 0.26),
    pitchUp: 1.15,
    pitchDown: 0.82,
    vibrato: rand(4, 8),
    lpfFreq: 750,
  });
}

function playPetBaaDouble() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const f = rand(310, 370);
  synthSheepBaa({ now, baseFreq: f, duration: rand(0.2, 0.28), vol: 0.24 });
  synthSheepBaa({
    now: now + rand(0.22, 0.32),
    baseFreq: f * rand(1.08, 1.18),
    duration: rand(0.22, 0.32),
    vol: 0.22,
  });
}

function playPetBaaHappy() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const base = rand(400, 480);
  [0, 0.26].forEach((delay, i) => {
    synthSheepBaa({
      now: now + delay,
      baseFreq: i === 0 ? base : base * 1.15,
      duration: rand(0.18, 0.28),
      vol: i === 0 ? 0.26 : 0.22,
      wave1: 'triangle',
      pitchUp: 1.3,
      pitchDown: 0.85,
      lpfFreq: 1100,
    });
  });
}

function playPetBaaSleepy() {
  const ctx = getCtx();
  synthSheepBaa({
    now: ctx.currentTime,
    baseFreq: rand(200, 260),
    duration: rand(0.55, 0.85),
    vol: rand(0.16, 0.22),
    pitchUp: 1.06,
    pitchDown: 0.9,
    lpfFreq: 600,
    vibrato: rand(3, 5),
  });
}

function playPetBaaTiny() {
  const ctx = getCtx();
  synthSheepBaa({
    now: ctx.currentTime,
    baseFreq: rand(460, 560),
    duration: rand(0.12, 0.2),
    vol: rand(0.18, 0.24),
    wave1: 'triangle',
    pitchUp: 1.35,
    pitchDown: 0.75,
    lpfFreq: 1200,
  });
}

function playPetBaaQuestion() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const f = rand(300, 360);
  const o = ctx.createOscillator();
  const g = createGain(0);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f, now);
  o.frequency.linearRampToValueAtTime(f * 1.45, now + 0.35);
  const lpf = createFilter('lowpass', 850, 2);
  o.connect(lpf);
  lpf.connect(g);
  g.connect(_sfxGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.24, now + 0.04);
  g.gain.linearRampToValueAtTime(0, now + 0.42);
  o.start(now);
  o.stop(now + 0.45);
}

const PET_STROKE_VARIANTS = [
  playPetStrokeBoing,
  playPetStrokeBrush,
  playPetStrokeFluffy,
  playPetStrokeScritch,
  playPetStrokeTickle,
];

const PET_BAA_VARIANTS = [
  playPetBaaClassic,
  playPetBaaShort,
  playPetBaaLong,
  playPetBaaDouble,
  playPetBaaHappy,
  playPetBaaSleepy,
  playPetBaaTiny,
  playPetBaaQuestion,
];

function playRandomPetStroke() {
  pickRandom(PET_STROKE_VARIANTS)();
}

function playRandomPetBaa() {
  pickRandom(PET_BAA_VARIANTS)();
}

/** @deprecated ?명솚?????쒕뜡 ?곕떎?ш린+?몄쓬 */
export function playSoundPet() {
  playRandomPetStroke();
  setTimeout(playRandomPetBaa, rand(100, 280));
}

/**
 * ?곕떎?ш린 ?쒕뜡 ?ъ슫??臾띠쓬 (?④낵??+ ?몄쓬, 留ㅻ쾲 ?ㅻⅨ 議고빀)
 */
export function playPetSoundBundle() {
  if (!isSfxEnabled()) return;

  const roll = Math.random();

  if (roll < 0.1) {
    playRandomPetBaa();
    return;
  }

  if (roll < 0.2) {
    playRandomPetStroke();
    setTimeout(playRandomPetBaa, rand(70, 160));
    setTimeout(playRandomPetBaa, rand(380, 620));
    return;
  }

  if (roll < 0.32) {
    playPetStrokeBrush();
    setTimeout(playPetBaaSleepy, rand(200, 380));
    return;
  }

  if (roll < 0.42) {
    playPetStrokeFluffy();
    setTimeout(playPetBaaHappy, rand(150, 300));
    return;
  }

  playRandomPetStroke();
  setTimeout(playRandomPetBaa, rand(110, 340));
  if (Math.random() < 0.22) {
    setTimeout(playRandomPetBaa, rand(420, 680));
  }
}

export function playSoundFeed() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;

  // 1) ?좊깲 ?밸뒗 ?뚮━ (?믪? 二쇳뙆??諛대뱶?⑥뒪 ?꾪꽣 ?몄씠利?
  const bites = Math.floor(rand(3, 5));
  for (let i = 0; i < bites; i++) {
    const t   = now + i * rand(0.10, 0.18);
    const dur = rand(0.05, 0.09);
    const noise = createNoise(dur + 0.04);
    const bpf   = createFilter('bandpass', rand(1800, 3200), rand(3, 7));
    const env   = createGain(0);
    noise.connect(bpf); bpf.connect(env); env.connect(_sfxGain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(rand(0.35, 0.55), t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.start(t); noise.stop(t + dur + 0.02);
  }

  // 2) 留뚯”?ㅻ윭??吏㏃? "硫붿뿉" ?뚮━
  const meeTime = now + bites * 0.14 + 0.06;
  const meeDur  = rand(0.22, 0.35);
  const baseF   = rand(380, 460);
  const o = ctx.createOscillator();
  const g = createGain(0);
  o.type = 'triangle';
  o.frequency.setValueAtTime(baseF, meeTime);
  o.frequency.linearRampToValueAtTime(baseF * 1.12, meeTime + 0.05);
  o.frequency.exponentialRampToValueAtTime(baseF * 0.82, meeTime + meeDur);
  const lpf2 = createFilter('lowpass', 800, 1.5);
  o.connect(lpf2); lpf2.connect(g); g.connect(_sfxGain);
  g.gain.setValueAtTime(0, meeTime);
  g.gain.linearRampToValueAtTime(0.22, meeTime + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, meeTime + meeDur);
  o.start(meeTime); o.stop(meeTime + meeDur + 0.05);
}

export function playSoundSleep() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const dur = 0.8;
  const noise = createNoise(dur);
  const lpf   = createFilter('lowpass', 400);
  const env   = createGain(0);
  noise.connect(lpf); lpf.connect(env); env.connect(_sfxGain);
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.3, now + 0.1);
  env.gain.linearRampToValueAtTime(0.15, now + 0.5);
  env.gain.linearRampToValueAtTime(0, now + dur);
  noise.start(now); noise.stop(now + dur + 0.05);
  setTimeout(() => {
    const o2 = ctx.createOscillator();
    const g2 = createGain(0);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(280, now + 0.3);
    o2.frequency.exponentialRampToValueAtTime(80, now + 1.2);
    o2.connect(g2); g2.connect(_sfxGain);
    g2.gain.setValueAtTime(0, now + 0.3);
    g2.gain.linearRampToValueAtTime(0.12, now + 0.5);
    g2.gain.linearRampToValueAtTime(0, now + 1.2);
    o2.start(now + 0.3); o2.stop(now + 1.3);
  }, 50);
}

export function playSoundClick() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = createGain(0);
  o.type = 'sine';
  o.frequency.setValueAtTime(rand(880, 1200), now);
  o.frequency.exponentialRampToValueAtTime(rand(440, 660), now + 0.06);
  o.connect(g); g.connect(_sfxGain);
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  o.start(now); o.stop(now + 0.1);
}

export function playSoundXP() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const t   = now + i * 0.1;
    const dur = 0.5;
    const o  = ctx.createOscillator();
    const g  = createGain(0);
    o.type = 'sine'; o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    const g2 = createGain(0);
    o2.type = 'sine'; o2.frequency.value = freq * 2.756;
    o.connect(g);  g.connect(_sfxGain);
    o2.connect(g2); g2.connect(_sfxGain);
    const vol = 0.22 - i * 0.02;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g2.gain.setValueAtTime(vol * 0.4, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
    o.start(t);  o.stop(t + dur + 0.05);
    o2.start(t); o2.stop(t + dur * 0.6 + 0.05);
  });
}

// ??? 遺?꾨퀎 ?곹샇?묒슜 ?④낵?????

/** 洹 媛꾩??쏀엳湲? ?믨퀬 ?⑤━???뱁솴 ?뚮━ */
export function playSoundEar() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx(); const now = ctx.currentTime;
  const baseFreq = rand(480, 560);
  const vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.value = rand(7,11);
  const vibGain = createGain(rand(18,28)); vib.connect(vibGain);
  const o = ctx.createOscillator(); const g = createGain(0); o.type = 'sawtooth';
  o.frequency.setValueAtTime(baseFreq, now);
  o.frequency.linearRampToValueAtTime(baseFreq * 1.35, now + 0.08);
  o.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, now + 0.5);
  vibGain.connect(o.frequency);
  const lpf = createFilter('lowpass', 1100, 2);
  o.connect(lpf); lpf.connect(g); g.connect(_sfxGain);
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.25, now+0.03);
  g.gain.setValueAtTime(0.20, now+0.35); g.gain.linearRampToValueAtTime(0, now+0.55);
  vib.start(now); vib.stop(now+0.6); o.start(now); o.stop(now+0.6);
}

/** 癒몃━ ?곕떎?ш린: ??퀬 遺?쒕윭???몄븞???뚮━ */
export function playSoundHead() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx(); const now = ctx.currentTime;
  const baseFreq = rand(280, 340); const dur = rand(0.55, 0.75);
  const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator(); const g = createGain(0);
  o1.type = 'sawtooth'; o2.type = 'sine';
  o1.frequency.setValueAtTime(baseFreq, now);
  o1.frequency.linearRampToValueAtTime(baseFreq*1.08, now+0.1);
  o1.frequency.exponentialRampToValueAtTime(baseFreq*0.95, now+dur);
  o2.frequency.value = baseFreq * 1.5;
  const lpf = createFilter('lowpass', 700, 1.5);
  o1.connect(lpf); o2.connect(lpf); lpf.connect(g); g.connect(_sfxGain);
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.30, now+0.06);
  g.gain.setValueAtTime(0.26, now+dur*0.6); g.gain.linearRampToValueAtTime(0, now+dur);
  const noise = createNoise(dur); const bpf = createFilter('bandpass', 3000, 8);
  const ng = createGain(0.05); noise.connect(bpf); bpf.connect(ng); ng.connect(_sfxGain);
  noise.start(now); noise.stop(now+dur+0.05);
  o1.start(now); o1.stop(now+dur+0.05); o2.start(now); o2.stop(now+dur+0.05);
}

/** ?쇨뎬 ?곕떎?ш린: ?믨퀬 吏㏃? ?됰났 "硫붿뿉!?? ?뚮━ */
export function playSoundFace() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx(); const now = ctx.currentTime;
  const baseFreq = rand(380, 450);
  [0, 0.28].forEach((delay, idx) => {
    const t = now + delay; const dur = idx===0 ? rand(0.22,0.30) : rand(0.16,0.22);
    const freq = idx===0 ? baseFreq : baseFreq*1.2;
    const o = ctx.createOscillator(); const g = createGain(0); o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.linearRampToValueAtTime(freq*1.15, t+0.04);
    o.frequency.exponentialRampToValueAtTime(freq*0.85, t+dur);
    const lpf = createFilter('lowpass', 900, 1.8);
    o.connect(lpf); lpf.connect(g); g.connect(_sfxGain);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(idx===0?0.28:0.22, t+0.025);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.start(t); o.stop(t+dur+0.05);
  });
  const sparkT = now+0.52;
  [880,1320,1760].forEach((freq,i) => {
    const t = sparkT+i*0.045; const o = ctx.createOscillator(); const g = createGain(0.12);
    o.type='sine'; o.frequency.value=freq; o.connect(g); g.connect(_sfxGain);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.12); o.start(t); o.stop(t+0.14);
  });
}

/** 諛?湲곴린: ?듯넻 湲곷뒗 留뚯” ?뚮━ */
export function playSoundBelly() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx(); const now = ctx.currentTime;
  const cnt = Math.floor(rand(3,5));
  for (let i=0; i<cnt; i++) {
    const t=now+i*rand(0.06,0.10); const dur=rand(0.04,0.07);
    const noise=createNoise(dur+0.02); const bpf=createFilter('bandpass',rand(1200,2400),rand(4,9));
    const env=createGain(0); noise.connect(bpf); bpf.connect(env); env.connect(_sfxGain);
    env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(rand(0.28,0.42),t+0.01);
    env.gain.exponentialRampToValueAtTime(0.001,t+dur);
    noise.start(t); noise.stop(t+dur+0.02);
  }
  const humT=now+cnt*0.08+0.05; const humDur=rand(0.45,0.65); const bf=rand(230,270);
  const o=ctx.createOscillator(); const g=createGain(0); o.type='sawtooth';
  o.frequency.setValueAtTime(bf,humT); o.frequency.linearRampToValueAtTime(bf*1.06,humT+0.12);
  o.frequency.exponentialRampToValueAtTime(bf*0.92,humT+humDur);
  const lpf=createFilter('lowpass',600,2); o.connect(lpf); lpf.connect(g); g.connect(_sfxGain);
  g.gain.setValueAtTime(0,humT); g.gain.linearRampToValueAtTime(0.26,humT+0.05);
  g.gain.setValueAtTime(0.22,humT+humDur*0.65); g.gain.linearRampToValueAtTime(0,humT+humDur);
  o.start(humT); o.stop(humT+humDur+0.05);
}

/** ??湲곴린: 議몃┛ ??? 由대옓??"誘瑜대Ⅴ~" ?뚮━ */
export function playSoundBack() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx(); const now = ctx.currentTime;
  const baseFreq = rand(190,240); const dur = rand(0.7,0.95);
  const trem=ctx.createOscillator(); trem.type='sine'; trem.frequency.value=rand(4,6);
  const tremGain=createGain(0.08); trem.connect(tremGain);
  const o1=ctx.createOscillator(); const o2=ctx.createOscillator(); const g=createGain(0);
  o1.type='sawtooth'; o2.type='triangle';
  o1.frequency.setValueAtTime(baseFreq,now);
  o1.frequency.linearRampToValueAtTime(baseFreq*1.04,now+0.2);
  o1.frequency.exponentialRampToValueAtTime(baseFreq*0.90,now+dur);
  o2.frequency.value=baseFreq*2; tremGain.connect(o1.frequency);
  const lpf=createFilter('lowpass',550,1.5);
  o1.connect(lpf); o2.connect(lpf); lpf.connect(g); g.connect(_sfxGain);
  g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.22,now+0.08);
  g.gain.setValueAtTime(0.20,now+dur*0.7); g.gain.linearRampToValueAtTime(0,now+dur);
  const noise=createNoise(dur); const nlpf=createFilter('lowpass',300,1);
  const ng=createGain(0.07); noise.connect(nlpf); nlpf.connect(ng); ng.connect(_sfxGain);
  noise.start(now); noise.stop(now+dur+0.05);
  trem.start(now); trem.stop(now+dur+0.05);
  o1.start(now); o1.stop(now+dur+0.05); o2.start(now); o2.stop(now+dur+0.05);
}

let _clipperHumActive = false;
let _clipperOsc = null;
let _clipperLfo = null;
let _clipperGain = null;

/**
 * 諛붾━源?怨듯쉶??紐⑦꽣 吏꾨룞???쒖옉
 */
export function startClipperHum() {
  if (_clipperHumActive) return;
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  
  _clipperHumActive = true;
  
  // 紐⑦꽣 湲곕낯??(??? 二쇳뙆???깅땲??
  _clipperOsc = ctx.createOscillator();
  _clipperOsc.type = 'sawtooth';
  _clipperOsc.frequency.setValueAtTime(105, now);
  
  // 湲곌퀎 ?⑤┝???곗텧??鍮좊Ⅸ 吏꾨룞 LFO
  _clipperLfo = ctx.createOscillator();
  _clipperLfo.type = 'sine';
  _clipperLfo.frequency.setValueAtTime(45, now); // 45Hz
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(6, now); // 짹6Hz 二쇳뙆??蹂議?
  // ????꾪꽣濡?遺?쒕읇寃?源롮쓬
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(320, now);
  
  _clipperGain = ctx.createGain();
  _clipperGain.gain.setValueAtTime(0, now);
  // ?댄깮 ?④낵 (?먯쭊??耳쒖쭚)
  _clipperGain.gain.linearRampToValueAtTime(0.28, now + 0.15);
  
  // ?곌껐
  _clipperLfo.connect(lfoGain);
  lfoGain.connect(_clipperOsc.frequency);
  
  _clipperOsc.connect(lpf);
  lpf.connect(_clipperGain);
  _clipperGain.connect(_sfxGain);
  
  _clipperOsc.start(now);
  _clipperLfo.start(now);
}

/**
 * 諛붾━源?怨듯쉶??紐⑦꽣 吏꾨룞???뺤?
 */
export function stopClipperHum() {
  if (!_clipperHumActive) return;
  _clipperHumActive = false;
  
  const ctx = getCtx();
  const now = ctx.currentTime;
  
  if (_clipperGain) {
    // ?붿????④낵 (遺?쒕읇寃?爰쇱쭚)
    _clipperGain.gain.cancelScheduledValues(now);
    _clipperGain.gain.setValueAtTime(_clipperGain.gain.value, now);
    _clipperGain.gain.linearRampToValueAtTime(0, now + 0.12);
  }
  
  const oscToStop = _clipperOsc;
  const lfoToStop = _clipperLfo;
  const gainToDisconnect = _clipperGain;
  
  setTimeout(() => {
    try { oscToStop.stop(); } catch(e){}
    try { lfoToStop.stop(); } catch(e){}
    try { oscToStop.disconnect(); } catch(e){}
    try { lfoToStop.disconnect(); } catch(e){}
    try { gainToDisconnect.disconnect(); } catch(e){}
  }, 150);
  
  _clipperOsc = null;
  _clipperLfo = null;
  _clipperGain = null;
}

let _shearNoiseTimeout = null;
let _shearIsActive = false;
let _shearMotion = 0; // 0~1, ?ъ씤???띾룄 湲곕컲 媛뺣룄

/** ?멸퉶湲?留덉같??媛뺣룄 (?띾룄 0~20px/frame ?뺢퇋?? */
export function setShearMotion(speed) {
  _shearMotion = Math.min(1, Math.max(0, speed / 14));
}

export function startShearSound() {
  if (_shearIsActive) return;
  _shearIsActive = true;
  _loopShearTick();
}

function _loopShearTick() {
  if (!_shearIsActive || !isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const motion = Math.max(0.25, _shearMotion);
  const dur = 0.05 + (1 - motion) * 0.04;

  // 嫄곗튇 留덉같 ?덉씠??  const noise = createNoise(dur + 0.03);
  const bpf1  = createFilter('bandpass', rand(2200, 4200) + motion * 1800, 1.8);
  const lpf   = createFilter('lowpass', rand(5000, 8000) + motion * 2000);
  const env   = createGain(0);
  noise.connect(bpf1); bpf1.connect(lpf); lpf.connect(env); env.connect(_sfxGain);
  const vol = (0.22 + motion * 0.38) * rand(0.92, 1.08);
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(vol, now + 0.008);
  env.gain.linearRampToValueAtTime(vol * 0.75, now + dur * 0.55);
  env.gain.linearRampToValueAtTime(0, now + dur);
  noise.start(now); noise.stop(now + dur + 0.02);

  // 遺?쒕윭????諛由??덉씠??(?띾룄 ?믪쓣?섎줉 ?먭퍖寃?
  if (motion > 0.35) {
    const soft = createNoise(dur * 1.2);
    const softLpf = createFilter('lowpass', rand(900, 1400), 0.8);
    const softEnv = createGain(0);
    soft.connect(softLpf); softLpf.connect(softEnv); softEnv.connect(_sfxGain);
    const softVol = motion * rand(0.08, 0.16);
    softEnv.gain.setValueAtTime(0, now);
    softEnv.gain.linearRampToValueAtTime(softVol, now + 0.012);
    softEnv.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.04);
    soft.start(now); soft.stop(now + dur + 0.06);
  }

  const interval = Math.max(18, (dur * 1000) * (1.1 - motion * 0.45) + rand(2, 12));
  _shearNoiseTimeout = setTimeout(_loopShearTick, interval);
}

export function stopShearSound() {
  _shearIsActive = false;
  _shearMotion = 0;
  clearTimeout(_shearNoiseTimeout);
  _shearNoiseTimeout = null;
}

/** ???⑹뼱由??몄씠 踰쀪꺼吏???吏㏃? 移댄?瑜댁떆????*/
export function playShearPeelPop(intensity = 0.6) {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const vol = 0.12 + intensity * 0.22;

  const noise = createNoise(0.06);
  const bpf = createFilter('bandpass', rand(600, 1100), 0.9);
  const ng = createGain(0);
  noise.connect(bpf); bpf.connect(ng); ng.connect(_sfxGain);
  ng.gain.setValueAtTime(0, now);
  ng.gain.linearRampToValueAtTime(vol, now + 0.006);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  noise.start(now); noise.stop(now + 0.08);

  const o = ctx.createOscillator();
  const og = createGain(0);
  o.type = 'triangle';
  o.frequency.setValueAtTime(rand(180, 260), now);
  o.frequency.exponentialRampToValueAtTime(rand(90, 140), now + 0.09);
  o.connect(og); og.connect(_sfxGain);
  og.gain.setValueAtTime(0, now);
  og.gain.linearRampToValueAtTime(vol * 0.5, now + 0.01);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  o.start(now); o.stop(now + 0.12);
}

// --- ASMR ---

export const ASMR_LIST = [
  { id: 'dreamy_meadow', category: 'signature', emoji: '🌾', name: 'Dreamy Meadow', desc: 'Soft meadow air with distant sheep and a night hush' },
  { id: 'moonlight_ranch', category: 'signature', emoji: '🌙', name: 'Moonlight Ranch', desc: 'Wide-open pasture calm with cool breeze and sleepy night textures' },
  { id: 'cozy_hearth', category: 'signature', emoji: '🔥', name: 'Cozy Hearth', desc: 'Warm fireplace comfort with gentle room tone and soft wind' },
  { id: 'dreamlike_atmosphere', category: 'signature', emoji: '☁️', name: 'Dreamlike Atmosphere', desc: 'Low, floating ambience made for slow drifting and deep rest' },
  { id: 'tea_house', category: 'cozy', emoji: '🍵', name: 'Tea House', desc: 'A quiet tea house with warm room presence and soft preparation sounds' },
  { id: 'library_evening', category: 'cozy', emoji: '📚', name: 'Library Evening', desc: 'Late-night studying with page turns, paper rustling, and gentle study sounds' },
  { id: 'cozy_cafe', category: 'cozy', emoji: '☕', name: 'Cozy Cafe', desc: 'A mellow cafe glow with distant chatter, cups, and easy movement' },
  { id: 'rainy_cottage', category: 'cozy', emoji: '🏡', name: 'Rainy Cottage', desc: 'Rainy evening indoors with hearth warmth and sleepy crickets' },
  { id: 'zen_garden', category: 'nature', emoji: '🪷', name: 'Zen Garden', desc: 'Soft water drops, wind chimes, and a balanced garden hush' },
  { id: 'forest_camp', category: 'nature', emoji: '🏕️', name: 'Forest Camp', desc: 'Quiet forest air with a gentle fire and distant night birds' },
  { id: 'rainy_window', category: 'nature', emoji: '🌧️', name: 'Rainy Window', desc: 'Soft rain against the glass with a close, intimate hush' },
  { id: 'ocean_shore', category: 'nature', emoji: '🌊', name: 'Ocean Shore', desc: 'A calm shoreline at night with steady waves and quiet air' },
  { id: 'korean_traditional_night', category: 'signature', emoji: '🎋', name: 'Korean Traditional Night', desc: 'Very soft gayageum and a quiet courtyard night' },
  { id: 'japanese_traditional_night', category: 'signature', emoji: '🌿', name: 'Japanese Traditional Night', desc: 'Soft koto tones with subtle garden ambience and wind chimes' },
  { id: 'chinese_traditional_night', category: 'signature', emoji: '🏮', name: 'Chinese Traditional Night', desc: 'Soft guzheng tones with flowing water and reflective stillness' },
  { id: 'tingle_therapy', category: 'cozy', emoji: '✨', name: 'Tingle Therapy', desc: 'Gentle tapping and brushing for soft relaxation' },
  { id: 'summer_insect_night', category: 'nature', emoji: '🦗', name: 'Summer Insect Night', desc: 'Crickets, distant insects, and a quiet breeze after sunset' },
  { id: 'cozy_plaza', category: 'cozy', emoji: '🪑', name: 'Cozy Plaza', desc: 'A peaceful town square with faraway chatter and fountain air' },
  { id: 'laundry_room', category: 'cozy', emoji: '🧺', name: 'Laundry Room', desc: 'A late-night laundry room with gentle hums and soft water textures' },
  { id: 'space_station_night', category: 'nature', emoji: '🚀', name: 'Space Station Night', desc: 'Deep background fan hums and soft system clicks from orbit' },
];
export function getAsmrItem(id) {
  return getAsmrList().find(i => i.id === id) ?? null;
}

export function getLastAsmrId() {
  return _prefs.lastAsmrId ?? null;
}

export function isAsmrSleepAutoplay() {
  return _prefs.asmrSleepAutoplay !== false;
}

export function setAsmrSleepAutoplay(v) {
  _prefs.asmrSleepAutoplay = !!v;
  savePrefs();
}

export function getAsmrList() {
  const lang = getSettings().language || DEFAULT_LANGUAGE;
  return ASMR_LIST.map(item => ({
    ...item,
    name: t(`asmr.${item.id}.name`, {}, lang) || item.name,
    desc: t(`asmr.${item.id}.desc`, {}, lang) || item.desc,
  }));
}

let _currentAsmrId   = null;
let _asmrNodes       = [];
let _asmrScheduleId  = null;
let _asmrTimerId     = null;
let _asmrTimerEnd    = null;

export function playAsmr(id, opts = {}) {
  if (_bgmRunning) {
    fadeOutBgm(1.5);
  }

  stopAsmr({ keepTimer: true });
  if (!isAsmrEnabled()) return;
  _currentAsmrId = id;
  _prefs.lastAsmrId = id;
  savePrefs();
  if (opts.fadeIn) _fadeInAsmrGain(opts.fadeInSec ?? 2.5);
  _startAsmrById(id);
  // 재생 상태 sessionStorage 저장
  try {
    sessionStorage.setItem('ss_asmr_id', id);
    sessionStorage.setItem('ss_asmr_running', 'true');
  } catch(e) {}
}

export function stopAsmr(opts = {}) {
  _currentAsmrId = null;
  clearTimeout(_asmrScheduleId);
  _asmrScheduleId = null;
  _asmrNodes.forEach(n => {
    try { n.stop(); } catch (e) { /* noop */ }
    try { n.disconnect(); } catch (e) { /* noop */ }
  });
  _asmrNodes = [];
  if (_asmrtGain) _asmrtGain.gain.value = getAsmrVolume();
  if (!opts.keepTimer) clearAsmrSleepTimer();
  // sessionStorage 업데이트
  try {
    sessionStorage.setItem('ss_asmr_id', '');
    sessionStorage.setItem('ss_asmr_running', 'false');
  } catch(e) {}

  // ASMR 종료 시, 현재 페이지가 기본 BGM 가능 페이지라면 기본 BGM을 서서히 켬
  if (_isBgmAllowedPage()) {
    fadeInBgm(1.5);
  }
}

export function fadeOutAndStopAsmr(sec = 4) {
  if (!_asmrtGain || !_currentAsmrId) {
    stopAsmr();
    return;
  }
  const ctx = getCtx();
  const g = _asmrtGain.gain;
  const vol = getAsmrVolume();
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(0.001, ctx.currentTime + sec);
  setTimeout(() => {
    stopAsmr();
    if (_asmrtGain) _asmrtGain.gain.value = vol;
  }, sec * 1000 + 50);
}

export function setAsmrSleepTimer(minutes) {
  clearAsmrSleepTimer();
  if (!minutes || minutes <= 0) return;
  const endTime = Date.now() + minutes * 60 * 1000;
  _asmrTimerEnd = endTime;
  _asmrTimerId = setTimeout(() => {
    fadeOutAndStopAsmr(5);
    fadeOutAndStopBinaural(5);
    try { sessionStorage.removeItem('ss_timer_end'); } catch(e) {}
  }, minutes * 60 * 1000);
  _prefs.asmrTimerMin = minutes;
  savePrefs();
  // 타이머 종료 시간 sessionStorage 저장
  try { sessionStorage.setItem('ss_timer_end', String(endTime)); } catch(e) {}
}

export function clearAsmrSleepTimer() {
  clearTimeout(_asmrTimerId);
  _asmrTimerId = null;
  _asmrTimerEnd = null;
  _prefs.asmrTimerMin = 0;
  savePrefs();
}

export function getAsmrTimerMinutesLeft() {
  if (!_asmrTimerEnd) return 0;
  return Math.max(0, Math.ceil((_asmrTimerEnd - Date.now()) / 60000));
}

export function getAsmrSleepTimerMinutes() {
  return _prefs.asmrTimerMin ?? 0;
}

export function getCurrentAsmrId() { return _currentAsmrId; }

function _registerNode(node) { _asmrNodes.push(node); return node; }

function _fadeInAsmrGain(sec) {
  if (!_asmrtGain) return;
  const ctx = getCtx();
  const target = getAsmrVolume();
  const g = _asmrtGain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(0.001, ctx.currentTime);
  g.linearRampToValueAtTime(target, ctx.currentTime + sec);
}

function _startAsmrById(id) {
  switch (id) {
    case 'dreamy_meadow': _asmrDreamyMeadow(); break;
    case 'moonlight_ranch': _asmrMoonlightRanch(); break;
    case 'cozy_hearth': _asmrCozyHearth(); break;
    case 'dreamlike_atmosphere': _asmrDreamlikeAtmosphere(); break;
    case 'tea_house': _asmrTeaHouse(); break;
    case 'library_evening': _asmrLibraryEvening(); break;
    case 'cozy_cafe': _asmrCozyCafe(); break;
    case 'rainy_cottage': _asmrRainyCottage(); break;
    case 'zen_garden': _asmrZenGarden(); break;
    case 'forest_camp': _asmrForestCamp(); break;
    case 'rainy_window': _asmrRainyWindow(); break;
    case 'ocean_shore': _asmrOceanShore(); break;
    case 'korean_traditional_night': _asmrKoreanTraditionalNight(); break;
    case 'japanese_traditional_night': _asmrJapaneseTraditionalNight(); break;
    case 'chinese_traditional_night': _asmrChineseTraditionalNight(); break;
    case 'tingle_therapy': _asmrTingleTherapy(); break;
    case 'summer_insect_night': _asmrSummerInsectNight(); break;
    case 'cozy_plaza': _asmrCozyPlaza(); break;
    case 'laundry_room': _asmrLaundryRoom(); break;
    case 'space_station_night': _asmrSpaceStationNight(); break;
    case 'sheep': _asmrDreamyMeadow(); break;
    case 'ranch': _asmrMoonlightRanch(); break;
    case 'bugs': _asmrForestCamp(); break;
    case 'wind': _asmrDreamyMeadow(); break;
    case 'rain': _asmrRainyWindow(); break;
    case 'snow': _asmrRainyCottage(); break;
    case 'ocean': _asmrOceanShore(); break;
    case 'water':
    case 'river': _asmrZenGarden(); break;
    case 'birds': _asmrDreamyMeadow(); break;
    case 'fire': _asmrCozyHearth(); break;
    case 'cottage': _asmrRainyCottage(); break;
    case 'forest': _asmrForestCamp(); break;
    case 'pencil': _asmrLibraryEvening(); break;
    case 'pages': _asmrLibraryEvening(); break;
    case 'white': _asmrDreamlikeAtmosphere(); break;
    case 'brown': _asmrDreamlikeAtmosphere(); break;
    case 'heartbeat': _asmrDreamlikeAtmosphere(); break;
    case 'piano': _asmrCozyCafe(); break;
    case 'musicbox': _asmrCozyCafe(); break;
    case 'kalimba': _asmrCozyCafe(); break;
    case 'koto': _asmrTeaHouse(); break;
    case 'gayageum': _asmrTeaHouse(); break;
    case 'preset_rainy': _asmrRainyWindow(); break;
    case 'preset_cozy': _asmrCozyHearth(); break;
    case 'preset_deep': _asmrDreamlikeAtmosphere(); break;
    case 'preset_starry': _asmrMoonlightRanch(); break;
    case 'preset_ocean': _asmrOceanShore(); break;
    case 'preset_cottage': _asmrRainyCottage(); break;
    case 'preset_zen': _asmrZenGarden(); break;
    case 'preset_study': _asmrLibraryEvening(); break;
    case 'preset_traditional': _asmrTeaHouse(); break;
    case 'tingle_soft': _asmrDreamlikeAtmosphere(); break;
    case 'tingle_bell': _asmrTeaHouse(); break;
  }
}

function _scheduleLoop(id, afterMs) {
  _asmrScheduleId = setTimeout(() => {
    if (_currentAsmrId === id) {
      _asmrNodes.forEach(n => { try { n.disconnect(); } catch(e) {} });
      _asmrNodes = [];
      _startAsmrById(id);
    }
  }, afterMs);
}

function _asmrSheep() {
  const ctx = getCtx();
  const dur = 12;
  const now = ctx.currentTime;
  [0, 2.5, 5.2, 8.0, 10.5].forEach(offset => {
    const t = now + offset;
    const maaDur = rand(0.6, 1.0);
    const o  = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g  = createGain(0);
    o.type  = 'sawtooth'; o.frequency.value = rand(180, 220);
    o2.type = 'sine';     o2.frequency.value = rand(360, 440);
    const lpf = createFilter('lowpass', 600, 2);
    o.connect(lpf); o2.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.18, 0.28), t + 0.05);
    g.gain.setValueAtTime(rand(0.12, 0.22), t + maaDur * 0.6);
    g.gain.linearRampToValueAtTime(0, t + maaDur);
    o.frequency.setValueAtTime(rand(180, 220), t);
    o.frequency.linearRampToValueAtTime(rand(200, 260), t + 0.15);
    o.frequency.linearRampToValueAtTime(rand(160, 200), t + maaDur);
    _registerNode(o);  o.start(t);  o.stop(t + maaDur + 0.1);
    _registerNode(o2); o2.start(t); o2.stop(t + maaDur + 0.1);
  });
  _addSoftWind(now, dur, 0.08);
  _scheduleLoop('sheep', dur * 1000);
}

function _asmrRanch() {
  const ctx = getCtx();
  const dur = 15;
  const now = ctx.currentTime;
  _addSoftWind(now, dur, 0.25);
  _addCrickets(now, dur, 0.3);
  [2, 7, 12].forEach(offset => {
    const t = now + offset;
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'sawtooth'; o.frequency.value = 190;
    const lpf = createFilter('lowpass', 400);
    o.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + 0.7);
    _registerNode(o); o.start(t); o.stop(t + 0.7);
  });
  _scheduleLoop('ranch', dur * 1000);
}

function _asmrForestCamp() {
  const dur = 24;
  const now = getCtx().currentTime;
  // 자연음 65% - 바람 + 새소리
  _addSoftWind(now, dur, 0.12);
  _addBirdChirps(now, dur, 5, 0.038);
  _addCrickets(now, dur, 0.06);
  // 특색음 35% - 모닥불 + 장작 튀는 소리 강화
  _asmrFireLayer(now, dur, 0.10);
  _addFirewoodCrackle(now, dur, 30, 0.055);
  _scheduleLoop('forest_camp', dur * 1000);
}

function _asmrRainyWindow() {
  const dur = 20;
  const now = getCtx().currentTime;
  const noise = createNoise(dur);
  const lpf = createFilter('lowpass', 1800);
  const hpf = createFilter('highpass', 220);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.26, now + 1.2);
  for (let i = 0; i < 24; i++) {
    const tapTime = now + rand(0.1, dur - 0.4);
    const tap = createNoise(0.04);
    const bpf = createFilter('bandpass', rand(4200, 9000), rand(0.6, 1.8));
    const tg = createGain(0);
    tap.connect(bpf); bpf.connect(tg); tg.connect(_asmrtGain);
    tg.gain.setValueAtTime(rand(0.04, 0.1), tapTime);
    tg.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.04);
    _registerNode(tap); tap.start(tapTime); tap.stop(tapTime + 0.06);
  }
  g.gain.setValueAtTime(0.26, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  _scheduleLoop('rainy_window', dur * 1000);
}

function _asmrBugs() {
  const dur = 16;
  const now = getCtx().currentTime;
  _addCrickets(now, dur, 0.55);
  _scheduleLoop('bugs', dur * 1000);
}

function _asmrWind() {
  const dur = 18;
  const now = getCtx().currentTime;
  _addWind(now, dur, 0.5);
  _scheduleLoop('wind', dur * 1000);
}

function _asmrRain() {
  const ctx = getCtx();
  const dur = 20;
  const now = ctx.currentTime;
  const noise = createNoise(dur);
  const lpf   = createFilter('lowpass', 2000);
  const hpf   = createFilter('highpass', 200);
  const g     = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.35, now + 1.5);
  g.gain.setValueAtTime(0.35, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  for (let i = 0; i < 40; i++) {
    const t   = now + rand(0, dur - 0.5);
    const drp = createNoise(0.05);
    const bpf = createFilter('bandpass', rand(4000, 10000), rand(1, 3));
    const dg  = createGain(0);
    drp.connect(bpf); bpf.connect(dg); dg.connect(_asmrtGain);
    dg.gain.setValueAtTime(rand(0.05, 0.2), t);
    dg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    _registerNode(drp); drp.start(t); drp.stop(t + 0.06);
  }
  _scheduleLoop('rain', dur * 1000);
}

function _asmrFire() {
  const ctx = getCtx();
  const dur = 18;
  const now = ctx.currentTime;
  const noise = createNoise(dur);
  const lpf   = createFilter('lowpass', 500);
  const g     = createGain(0);
  noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.25, now + 1);
  g.gain.setValueAtTime(0.25, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  for (let i = 0; i < 25; i++) {
    const t   = now + rand(0.5, dur - 1);
    const crk = createNoise(0.08);
    const bpf = createFilter('bandpass', rand(200, 1200), rand(0.5, 2));
    const cg  = createGain(0);
    crk.connect(bpf); bpf.connect(cg); cg.connect(_asmrtGain);
    cg.gain.setValueAtTime(0, t);
    cg.gain.linearRampToValueAtTime(rand(0.1, 0.3), t + 0.01);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    _registerNode(crk); crk.start(t); crk.stop(t + 0.1);
  }
  _scheduleLoop('fire', dur * 1000);
}

function _asmrTingleSoft() {
  const ctx = getCtx();
  const dur = 12;
  const now = ctx.currentTime;

  // 가벼운 하이밴드 노이즈 펄스들을 불규칙하게 배치
  let t = 0;
  while (t < dur) {
    const offset = rand(0.02, 0.2);
    const burstTime = now + t + offset;
    const burstDur = rand(0.04, 0.12);
    const noise = createNoise(burstDur);
    const bpf = createFilter('bandpass', rand(4000, 9000), rand(0.8, 2.2));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, burstTime);
    g.gain.linearRampToValueAtTime(rand(0.04, 0.16), burstTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, burstTime + burstDur);
    _registerNode(noise);
    noise.start(burstTime); noise.stop(burstTime + burstDur + 0.02);
    t += rand(0.35, 1.4);
  }
  // 은은한 저주파 배경을 살짝 추가해 공간감을 줌
  _addSoftWind(now, dur, 0.04);
  _scheduleLoop('tingle_soft', dur * 1000);
}

function _asmrTingleBell() {
  const ctx = getCtx();
  const dur = 14;
  const now = ctx.currentTime;

  // 짧은 벨 톤 네트워크: 여러 옥타브의 높은 톤을 작은 데케이로 재생
  for (let i = 0; i < 10; i++) {
    const offset = rand(0, dur - 0.08);
    const t = now + offset;
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'triangle';
    const base = rand(900, 2800);
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * rand(0.9, 1.05), t + 0.02);
    o.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.06, 0.18), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.06, 0.18));
    _registerNode(o);
    o.start(t); o.stop(t + rand(0.06, 0.22));

    // 작은 하이노이즈 반짝임 추가
    const nDur = rand(0.03, 0.09);
    const noise = createNoise(nDur);
    const bpf = createFilter('bandpass', base * rand(0.6, 1.4), rand(1, 2.5));
    const ng = createGain(0);
    noise.connect(bpf); bpf.connect(ng); ng.connect(_asmrtGain);
    ng.gain.setValueAtTime(rand(0.02, 0.08), t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + nDur);
    _registerNode(noise);
    noise.start(t); noise.stop(t + nDur + 0.02);
  }

  _addSoftWind(now, dur, 0.03);
  _scheduleLoop('tingle_bell', dur * 1000);
}

function _addTeaCupSounds(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.4, dur - 0.4);
    const noise = createNoise(rand(0.03, 0.08));
    const bpf = createFilter('bandpass', rand(1400, 2600), rand(1.2, 2.2));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.6, 1.0), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.05, 0.12));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.16);
  }
}

function _addKettleSounds(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.4, dur - 0.4);
    const osc = getCtx().createOscillator();
    const g = createGain(0);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rand(180, 260), t);
    osc.frequency.exponentialRampToValueAtTime(rand(120, 170), t + rand(0.18, 0.28));
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.2, 0.33));
    _registerNode(osc); osc.start(t); osc.stop(t + 0.4);
  }
}

function _addRoomPresence(now, dur, vol) {
  const noise = createBrownNoise(dur);
  const lpf = createFilter('lowpass', 650);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.2);
  g.gain.setValueAtTime(vol, now + dur - 1.5);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addPaperRustling(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.2, dur - 0.2);
    const noise = createNoise(rand(0.08, 0.16));
    const bpf = createFilter('bandpass', rand(1000, 1800), rand(1.5, 3));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.7, 1.0), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.12, 0.22));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.25);
  }
}

function _addCafeChatter(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.4, dur - 0.4);
    const noise = createNoise(rand(0.12, 0.24));
    const bpf = createFilter('bandpass', rand(900, 1500), rand(1.2, 2.4));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.18, 0.3));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.35);
  }
}

function _addCupClinks(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.4, dur - 0.4);
    const osc = getCtx().createOscillator();
    const g = createGain(0);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(rand(700, 1100), t);
    osc.frequency.exponentialRampToValueAtTime(rand(500, 800), t + rand(0.05, 0.12));
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.09, 0.16));
    _registerNode(osc); osc.start(t); osc.stop(t + 0.2);
  }
}

function _addSoftFootsteps(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.5, dur - 0.5);
    const noise = createNoise(rand(0.05, 0.1));
    const bpf = createFilter('bandpass', rand(1200, 2200), rand(1.2, 2.2));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.07, 0.12));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.15);
  }
}

function _addPencilSkritch(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.2, dur - 0.2);
    const noise = createNoise(rand(0.04, 0.1));
    const bpf = createFilter('bandpass', rand(1800, 3200), rand(2, 4));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.7, 1.0), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.06, 0.12));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.15);
  }
}

function _addTableTaps(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.5, dur - 0.5);
    const noise = createNoise(rand(0.02, 0.05));
    const bpf = createFilter('bandpass', rand(1200, 2400), rand(1.2, 2.4));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.8, 1.0), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.05, 0.09));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.12);
  }
}

function _addFountainAmbience(now, dur, vol) {
  const noise = createNoise(dur);
  const lpf = createFilter('lowpass', 1400);
  const hpf = createFilter('highpass', 160);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.2);
  g.gain.setValueAtTime(vol, now + dur - 1.5);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addWindChimes(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.6, dur - 0.8);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(2000, t);
    lpf.Q.setValueAtTime(0.5, t);
    
    osc.type = 'sine';
    const baseFreq = rand(1100, 1600);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.015, t + 0.15); // 완만한 피치 스윕
    
    osc.connect(lpf);
    lpf.connect(g);
    g.connect(_asmrtGain);
    
    const attack = 0.05; // 50ms 어택으로 클릭음 완전 제거
    const release = rand(0.7, 1.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.9, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + release);
    
    _registerNode(osc);
    _registerNode(lpf);
    _registerNode(g);
    osc.start(t);
    osc.stop(t + release + 0.1);
  }
}

function _addDistantInsects(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.3, dur - 0.3);
    const osc = getCtx().createOscillator();
    const g = createGain(0);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(rand(3200, 5200), t);
    osc.frequency.exponentialRampToValueAtTime(rand(2800, 4500), t + rand(0.06, 0.12));
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.08, 0.16));
    _registerNode(osc); osc.start(t); osc.stop(t + 0.2);
  }
}

function _addTingleTap(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.2, dur - 0.2);
    const noise = createNoise(rand(0.02, 0.05));
    const bpf = createFilter('bandpass', rand(3600, 7200), rand(1.2, 2.6));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.05, 0.1));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.12);
  }
}

function _addSoftBrush(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.25, dur - 0.25);
    const noise = createNoise(rand(0.03, 0.08));
    const bpf = createFilter('bandpass', rand(1400, 2600), rand(1.4, 2.8));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.7, 1.0), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.08, 0.15));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.18);
  }
}

function _addSparseInstrumentPhrase(now, dur, notes, vol, type = 'triangle', gap = 3.2) {
  const ctx = getCtx();
  notes.forEach((freq, idx) => {
    const start = now + 0.8 + idx * gap + rand(-0.12, 0.12);
    if (start >= now + dur - 0.4) return;
    const osc = ctx.createOscillator();
    const g = createGain(0);
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.setValueAtTime(rand(-8, 8), start);
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, start + rand(1.1, 1.7));
    _registerNode(osc); osc.start(start); osc.stop(start + 1.9);
  });
}

function _addCourtyardAmbience(now, dur, vol) {
  const noise = createBrownNoise(dur);
  const lpf = createFilter('lowpass', 900);
  const hpf = createFilter('highpass', 100);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.5);
  g.gain.setValueAtTime(vol, now + dur - 1.5);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addHanokCourtyard(now, dur, vol) {
  const noise = createBrownNoise(dur);
  const lpf = createFilter('lowpass', 720);
  const hpf = createFilter('highpass', 130);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.2);
  g.gain.setValueAtTime(vol, now + dur - 1.4);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addShishiOdoshi(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.6, dur - 0.8);
    const noise = createNoise(rand(0.05, 0.1));
    const bpf = createFilter('bandpass', rand(900, 1400), rand(0.8, 1.6));
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.12, 0.22));
    _registerNode(noise); noise.start(t); noise.stop(t + 0.25);
  }
}

function _addPavilionAmbience(now, dur, vol) {
  const noise = createBrownNoise(dur);
  const lpf = createFilter('lowpass', 1100);
  const hpf = createFilter('highpass', 80);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.4);
  g.gain.setValueAtTime(vol, now + dur - 1.3);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addGayageumPhrase(now, dur, vol) {
  const ctx = getCtx();
  const phrase = [196, 220, 246.94];
  phrase.forEach((freq, idx) => {
    const start = now + 1.0 + idx * 5.0;
    if (start >= now + dur - 0.6) return;
    const osc = ctx.createOscillator();
    const g = createGain(0);
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.setValueAtTime(rand(-2, 2), start);
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol * 0.7, start + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, start + rand(1.7, 2.4));
    _registerNode(osc); osc.start(start); osc.stop(start + 2.6);
  });
}

function _addKotoPhrase(now, dur, vol) {
  const ctx = getCtx();
  const phrase = [392, 493.88, 587.33];
  phrase.forEach((freq, idx) => {
    const start = now + 0.9 + idx * 4.8;
    if (start >= now + dur - 0.6) return;
    const osc = ctx.createOscillator();
    const g = createGain(0);
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.setValueAtTime(rand(-1.5, 1.5), start);
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol * 0.68, start + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, start + rand(1.4, 2.0));
    _registerNode(osc); osc.start(start); osc.stop(start + 2.2);
  });
}

/**
 * 해금풍: 삼각파 + 지연 비브라토 LFO.
 * click 방지: attack 0.8s, hold 유지 후 release 1.2s
 */
function _addKoreanHaegeum(now, dur, vol) {
  const ctx = getCtx();
  const notes = [
    { freq: 293.66, t: 1.0,  hold: 5.0 },
    { freq: 246.94, t: 8.5,  hold: 5.5 },
    { freq: 329.63, t: 17.0, hold: 5.0 },
    { freq: 220.00, t: 25.0, hold: 4.5 },
  ];
  notes.forEach(({ freq, t, hold }) => {
    const start = now + t;
    if (start >= now + dur - 1.0) return;
    const attack  = 0.8;
    const release = 1.2;
    const osc     = ctx.createOscillator();
    const vibLfo  = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const env     = ctx.createGain();
    const lpf     = ctx.createBiquadFilter();
    lpf.type  = 'lowpass';
    lpf.frequency.value = 900;
    lpf.Q.value = 0.8;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    // LFO: 처음 2초는 0, 이후 서서히 깊어짐 → 클릭 방지
    vibGain.gain.setValueAtTime(0, start);
    vibGain.gain.linearRampToValueAtTime(3.5, start + 2.5);
    vibLfo.type = 'sine';
    vibLfo.frequency.value = 5.2;
    vibLfo.connect(vibGain);
    vibGain.connect(osc.frequency);
    osc.connect(lpf); lpf.connect(env); env.connect(_asmrtGain);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(vol, start + attack);
    env.gain.setValueAtTime(vol, start + hold - release);
    env.gain.linearRampToValueAtTime(0, start + hold);
    _registerNode(osc); _registerNode(vibLfo);
    vibLfo.start(start); vibLfo.stop(start + hold + 0.2);
    osc.start(start);    osc.stop(start + hold + 0.2);
  });
}

/**
 * 대금풍: 저역 밴드패스 노이즈(숨결) + 느린 사인파 멜로디.
 * click 방지: noise gain은 linearRamp, osc attack 1.0s
 */
function _addKoreanDaegeum(now, dur, vol) {
  const ctx = getCtx();
  const notes = [
    { freq: 196.00, t: 3.5,  hold: 6.0 },
    { freq: 174.61, t: 12.5, hold: 6.5 },
    { freq: 196.00, t: 22.0, hold: 5.5 },
  ];
  notes.forEach(({ freq, t, hold }) => {
    const start   = now + t;
    if (start >= now + dur - 1.0) return;
    const attack  = 1.0;
    const release = 1.5;
    // 숨결 노이즈
    const breath = createNoise(hold + 0.3);
    const bpf    = createFilter('bandpass', freq * 1.3, 6);
    const ng     = ctx.createGain();
    breath.connect(bpf); bpf.connect(ng); ng.connect(_asmrtGain);
    ng.gain.setValueAtTime(0, start);
    ng.gain.linearRampToValueAtTime(vol * 0.28, start + attack);
    ng.gain.setValueAtTime(vol * 0.28, start + hold - release);
    ng.gain.linearRampToValueAtTime(0, start + hold);
    _registerNode(breath); breath.start(start); breath.stop(start + hold + 0.3);
    // 피치
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 700; lpf.Q.value = 0.7;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(lpf); lpf.connect(env); env.connect(_asmrtGain);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(vol, start + attack);
    env.gain.setValueAtTime(vol * 0.85, start + hold - release);
    env.gain.linearRampToValueAtTime(0, start + hold);
    _registerNode(osc); osc.start(start); osc.stop(start + hold + 0.2);
  });
}

/**
 * 샤쿠하치풍: 저역 노이즈(숨결) + 사인파. 긴 어택으로 부드러운 진입.
 * click 방지: attack 1.2s, release 1.5s
 */
function _addJapaneseShakunoflute(now, dur, vol) {
  const ctx = getCtx();
  const notes = [
    { freq: 207.65, t: 1.5,  hold: 7.0 },
    { freq: 184.99, t: 11.5, hold: 6.5 },
    { freq: 207.65, t: 20.5, hold: 7.0 },
  ];
  notes.forEach(({ freq, t, hold }) => {
    const start   = now + t;
    if (start >= now + dur - 1.0) return;
    const attack  = 1.2;
    const release = 1.5;
    // 숨결
    const breath = createNoise(hold + 0.3);
    const lpfN   = createFilter('lowpass', freq * 2.2, 1.5);
    const ng     = ctx.createGain();
    breath.connect(lpfN); lpfN.connect(ng); ng.connect(_asmrtGain);
    ng.gain.setValueAtTime(0, start);
    ng.gain.linearRampToValueAtTime(vol * 0.38, start + attack);
    ng.gain.setValueAtTime(vol * 0.38, start + hold - release);
    ng.gain.linearRampToValueAtTime(0, start + hold);
    _registerNode(breath); breath.start(start); breath.stop(start + hold + 0.3);
    // 피치
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 650; lpf.Q.value = 0.7;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(lpf); lpf.connect(env); env.connect(_asmrtGain);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(vol * 0.85, start + attack);
    env.gain.setValueAtTime(vol * 0.85, start + hold - release);
    env.gain.linearRampToValueAtTime(0, start + hold);
    _registerNode(osc); osc.start(start); osc.stop(start + hold + 0.2);
  });
}

/**
 * 고쟁 프레이즈: 플럭드 사인파. attack 0.06s(자연스러운 튕김), decay 긺.
 * click 방지: setValueAtTime(0) 후 linearRamp, 절대 직접점프 없음
 */
function _addGuzhengPhrase(now, dur, vol) {
  const ctx = getCtx();
  const phrase = [
    { freq: 293.66, t: 1.5  },
    { freq: 329.63, t: 6.5  },
    { freq: 261.63, t: 12.5 },
    { freq: 293.66, t: 18.0 },
    { freq: 246.94, t: 23.5 },
  ];
  phrase.forEach(({ freq, t }) => {
    const start   = now + t;
    if (start >= now + dur - 1.0) return;
    const decay   = rand(3.5, 5.0);
    const osc     = ctx.createOscillator();
    const env     = ctx.createGain();
    const lpf     = ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 1200; lpf.Q.value = 0.8;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(lpf); lpf.connect(env); env.connect(_asmrtGain);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(vol, start + 0.06);
    env.gain.exponentialRampToValueAtTime(0.001, start + decay);
    _registerNode(osc); osc.start(start); osc.stop(start + decay + 0.2);
  });
}

/**
 * 얼후풍: 삼각파 + 지연 비브라토. 긴 어택으로 전자음 완전 제거.
 * click 방지: attack 0.9s, release 1.3s, LFO 딜레이 2s
 */
function _addChineseErhu(now, dur, vol) {
  const ctx = getCtx();
  const notes = [
    { freq: 293.66, t: 2.5,  hold: 6.0 },
    { freq: 329.63, t: 11.5, hold: 5.5 },
    { freq: 261.63, t: 20.0, hold: 6.0 },
  ];
  notes.forEach(({ freq, t, hold }) => {
    const start   = now + t;
    if (start >= now + dur - 1.0) return;
    const attack  = 0.9;
    const release = 1.3;
    const osc     = ctx.createOscillator();
    const vibLfo  = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const env     = ctx.createGain();
    const lpf     = ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 1000; lpf.Q.value = 0.8;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    vibGain.gain.setValueAtTime(0, start);
    vibGain.gain.linearRampToValueAtTime(4.5, start + 2.0);
    vibLfo.type = 'sine';
    vibLfo.frequency.value = 5.8;
    vibLfo.connect(vibGain); vibGain.connect(osc.frequency);
    osc.connect(lpf); lpf.connect(env); env.connect(_asmrtGain);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(vol, start + attack);
    env.gain.setValueAtTime(vol, start + hold - release);
    env.gain.linearRampToValueAtTime(0, start + hold);
    _registerNode(osc); _registerNode(vibLfo);
    vibLfo.start(start); vibLfo.stop(start + hold + 0.2);
    osc.start(start);    osc.stop(start + hold + 0.2);
  });
}
function _asmrDreamyMeadow() {
  const dur = 24;
  const now = getCtx().currentTime;
  // 자연음 65%
  _addSoftWind(now, dur, 0.14);
  _addBirdChirps(now, dur, 7, 0.045);
  _addCrickets(now, dur, 0.07);
  // 특색음 35% - 양 방울 + 양 울음
  _asmrSheepLayer(now, dur, 0.06);
  _addSheepBell(now, dur, 4, 0.065);
  _addDistantSheepBaa(now, dur, 2, 0.055);
  _scheduleLoop('dreamy_meadow', dur * 1000);
}

function _asmrMoonlightRanch() {
  const dur = 26;
  const now = getCtx().currentTime;
  // 자연음 65% - 깊은 밤 공간감
  _addSoftWind(now, dur, 0.16);
  _addCrickets(now, dur, 0.18);
  _addGrasshopperLayer(now, dur, 0.08);
  // 특색음 35% - 양 소리 + 멀리 개구리
  _asmrSheepLayer(now, dur, 0.07);
  _addSheepBell(now, dur, 3, 0.06);
  _addFrogChoruses(now, dur, 2, 0.035);
  _addDistantOwl(now, dur, 1, 0.04);
  _scheduleLoop('moonlight_ranch', dur * 1000);
}

function _asmrCozyHearth() {
  const dur = 22;
  const now = getCtx().currentTime;
  _asmrFireLayer(now, dur, 0.2);
  _addSoftWind(now, dur, 0.08);
  _scheduleLoop('cozy_hearth', dur * 1000);
}

function _asmrDreamlikeAtmosphere() {
  const dur = 28;
  const now = getCtx().currentTime;
  _asmrBrownLayer(now, dur, 0.16);
  _addSoftWind(now, dur, 0.04);
  _asmrHeartbeatLayer(now, dur, 0.04);
  _scheduleLoop('dreamlike_atmosphere', dur * 1000);
}

function _asmrTeaHouse() {
  const dur = 24;
  const now = getCtx().currentTime;
  _asmrBrownLayer(now, dur, 0.09);
  _addTeaCupSounds(now, dur, 14, 0.058);
  _addKettleSounds(now, dur, 9, 0.05);
  _addRoomPresence(now, dur, 0.055);
  _addSoftWind(now, dur, 0.008);
  _addPluckedMelody(now, dur, [523.25, 659.25, 783.99], 0.02, 'triangle');
  _scheduleLoop('tea_house', dur * 1000);
}

function _asmrLibraryEvening() {
  const dur = 22;
  const now = getCtx().currentTime;
  // 자연음 65% - 도서관 공조음 + 기본 사운드
  _asmrBrownLayer(now, dur, 0.06);  // 공조기/환풍기 저음
  _addPageTurns(now, dur, 12, 0.12);
  _addWritingScratches(now, dur, 44, 0.10, 2400);
  _addPaperRustling(now, dur, 10, 0.06);
  // 특색음 35% - 연필, 키보드, 타자
  _addPencilSkritch(now, dur, 20, 0.065);
  _addKeyboardTaps(now, dur, 18, 0.045);
  _scheduleLoop('library_evening', dur * 1000);
}

function _asmrCozyCafe() {
  const dur = 24;
  const now = getCtx().currentTime;
  // 자연음 65% - 카페 배경음
  _addCafeChatter(now, dur, 7, 0.038);
  _addCupClinks(now, dur, 5, 0.04);
  _addSoftFootsteps(now, dur, 5, 0.028);
  _addTableTaps(now, dur, 4, 0.028);
  _asmrBrownLayer(now, dur, 0.04);
  // 특색음 35% - 로파이 재즈 + 커피머신
  _addLofiJazzMelody(now, dur, 0.055);
  _addCoffeeMachineBuzz(now, dur, 0.045);
  _scheduleLoop('cozy_cafe', dur * 1000);
}

function _asmrRainyCottage() {
  const dur = 24;
  const now = getCtx().currentTime;
  _asmrRainLayer(now, dur, 0.16);
  _asmrFireLayer(now, dur, 0.16);
  _addSoftWind(now, dur, 0.08);
  _addCrickets(now, dur, 0.16);
  _scheduleLoop('rainy_cottage', dur * 1000);
}

function _asmrOceanShore() {
  const dur = 24;
  const now = getCtx().currentTime;
  _asmrOceanLayer(now, dur, 0.3, 8);
  _addSoftWind(now, dur, 0.05);
  _addBirdChirps(now, dur, 4, 0.02);
  _scheduleLoop('ocean_shore', dur * 1000);
}

function _asmrKoreanTraditionalNight() {
  const dur = 28; // 가야금, 대금, 해금 선율이 완전히 연주되도록 28초로 연장
  const now = getCtx().currentTime;
  
  // 자연 배경음 (바람 소리 극소화 및 한옥 마당, 밤벌레 최소화)
  _addSoftWind(now, dur, 0.002);
  _addHanokCourtyard(now, dur, 0.045);
  _addDistantInsects(now, dur, 4, 0.015);
  
  // 풍경 소리 합성음은 1회로 극소화하고 볼륨도 대폭 감쇠시켜 단순한 배경 요소로만 처리 (삑/삐링 소리 제거)
  _addWindChimes(now, dur, 1, 0.004);
  
  // 한국 전통 악기 메인 배치
  _addGayageumPhrase(now, dur, 0.20);  // 가야금 (메인 선율)
  _addKoreanDaegeum(now, dur, 0.12);   // 대금 (긴 숨결 관악)
  _addKoreanHaegeum(now, dur, 0.14);   // 해금 (은은한 여운 현악)
  
  _scheduleLoop('korean_traditional_night', dur * 1000);
}

function _asmrJapaneseTraditionalNight() {
  const dur = 28; // 고토와 샤쿠하치 선율이 완전히 연주되도록 28초로 연장
  const now = getCtx().currentTime;
  
  // 자연 배경음 (바람 소리 극소화 및 시시오도시 최소화)
  _addSoftWind(now, dur, 0.002);
  _addShishiOdoshi(now, dur, 2, 0.015);
  
  // 풍경 소리 합성음은 2회로 극소화하고 볼륨도 대폭 감쇠시켜 배경으로 처리 (삑/삐링 소리 제거)
  _addWindChimes(now, dur, 2, 0.005);
  
  // 일본 전통 악기 메인 배치
  _addKotoPhrase(now, dur, 0.20);             // 고토 (메인 현악)
  _addJapaneseShakunoflute(now, dur, 0.15);   // 샤쿠하치 (천천히 흐르는 관악)
  
  _scheduleLoop('japanese_traditional_night', dur * 1000);
}

function _asmrChineseTraditionalNight() {
  const dur = 28; // 고쟁과 얼후 선율이 완전히 연주되도록 28초로 유지
  const now = getCtx().currentTime;
  
  // 자연 배경음 (바람 소리 극소화 및 정자 앰비언스)
  _addSoftWind(now, dur, 0.002);
  _addPavilionAmbience(now, dur, 0.045);
  
  // 물방울 합성음은 횟수를 3회로 극소화하고 볼륨도 대폭 감쇠시켜 단순한 배경 요소로만 격하 (뿅/삑 소리 제거)
  _addWaterDrops(now, dur, 3, 0.006);
  
  // 중국 전통 악기 메인 배치 (누가 들어도 선명하게 구별되는 고쟁과 얼후)
  _addGuzhengPhrase(now, dur, 0.22); // 고쟁 프레이즈 (메인 뜯는 악기)
  _addChineseErhu(now, dur, 0.15);   // 얼후 프레이즈 (서브 활현 악기)
  
  _scheduleLoop('chinese_traditional_night', dur * 1000);
}

function _asmrTingleTherapy() {
  const dur = 16;
  const now = getCtx().currentTime;
  // 자연음 65% - 기본 ASMR 트리거
  _addTingleTap(now, dur, 10, 0.036);
  _addSoftBrush(now, dur, 8, 0.026);
  _addPaperRustling(now, dur, 5, 0.022);
  // 특색음 35% - 마사지 오일 + 속삭임 호흡
  _addMassageOilSound(now, dur, 5, 0.055);
  _addWhisperBreath(now, dur, 4, 0.048);
  _scheduleLoop('tingle_therapy', dur * 1000);
}

function _asmrSummerInsectNight() {
  const dur = 20;
  const now = getCtx().currentTime;
  // 자연음 65% - 귀뚜라미 + 풀벌레 밸런스 조정
  _addCrickets(now, dur, 0.13);
  _addDistantInsects(now, dur, 5, 0.038);
  _addGrasshopperLayer(now, dur, 0.07);
  _addSoftWind(now, dur, 0.022);
  // 특색음 35% - 개구리 + 부엉이로 여름 밤 풍성함
  _addFrogChoruses(now, dur, 4, 0.05);
  _addDistantOwl(now, dur, 1, 0.04);
  _scheduleLoop('summer_insect_night', dur * 1000);
}

function _asmrCozyPlaza() {
  const dur = 22;
  const now = getCtx().currentTime;
  _addCafeChatter(now, dur, 14, 0.038);
  _addSoftFootsteps(now, dur, 12, 0.035);
  _addFountainAmbience(now, dur, 0.076);
  _addSoftWind(now, dur, 0.012);
  _scheduleLoop('cozy_plaza', dur * 1000);
}

function _asmrLaundryRoom() {
  const ctx = getCtx();
  const dur = 16;
  const now = ctx.currentTime;

  // 1. 낮은 기계 진동음 (Low hum - 55Hz 대역 sine파)
  const humOsc = ctx.createOscillator();
  const humGain = createGain(0.045);
  const humFilter = createFilter('lowpass', 80);
  humOsc.type = 'sine';
  humOsc.frequency.setValueAtTime(55, now);
  humOsc.connect(humFilter); humFilter.connect(humGain); humGain.connect(_asmrtGain);
  
  humGain.gain.setValueAtTime(0, now);
  humGain.gain.linearRampToValueAtTime(0.045, now + 1.5);
  humGain.gain.setValueAtTime(0.045, now + dur - 1.5);
  humGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(humOsc);
  humOsc.start(now);
  humOsc.stop(now + dur + 0.1);

  // 1-b. 세탁기 드럼 모터 웅웅 보강 (120Hz 사인파 — 조용하고 두꺼운 배음 레이어)
  const drumHumOsc = ctx.createOscillator();
  const drumHumGain = createGain(0);
  const drumHumFilter = createFilter('lowpass', 160, 1.2);
  drumHumOsc.type = 'sine';
  drumHumOsc.frequency.setValueAtTime(120, now);
  drumHumOsc.connect(drumHumFilter); drumHumFilter.connect(drumHumGain); drumHumGain.connect(_asmrtGain);

  drumHumGain.gain.setValueAtTime(0, now);
  drumHumGain.gain.linearRampToValueAtTime(0.028, now + 2.0);
  // 6초 주기로 아주 살짝 흔들림 — 드럼 회전 질감
  for (let t = 2; t < dur - 1; t += 0.2) {
    const v = 0.028 + 0.007 * Math.sin(2 * Math.PI * (t / 6));
    drumHumGain.gain.setValueAtTime(v, now + t);
  }
  drumHumGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(drumHumOsc);
  drumHumOsc.start(now);
  drumHumOsc.stop(now + dur + 0.1);

  // 2. 세탁기 회전음 (80Hz 삼각파 변조)
  const motorOsc = ctx.createOscillator();
  const motorGain = createGain(0);
  const motorFilter = createFilter('lowpass', 110);
  motorOsc.type = 'triangle';
  motorOsc.frequency.setValueAtTime(80, now);
  motorOsc.connect(motorFilter); motorFilter.connect(motorGain); motorGain.connect(_asmrtGain);
  
  // LFO: 4초 주기로 부드럽게 세탁기 회전음 세기 변조
  motorGain.gain.setValueAtTime(0.012, now);
  for (let t = 0; t < dur; t += 0.1) {
    const lfoVal = 0.012 + 0.009 * Math.sin(2 * Math.PI * (t / 4));
    motorGain.gain.setValueAtTime(lfoVal, now + t);
  }
  motorGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(motorOsc);
  motorOsc.start(now);
  motorOsc.stop(now + dur + 0.1);

  // 3. 물이 천천히 출렁이는 소리 (노이즈 소스를 스위핑 밴드패스 필터로 가공)
  const waterNoise = createNoise(dur);
  const waterFilter = createFilter('bandpass', 350, 1.5);
  const waterGain = createGain(0);
  waterNoise.connect(waterFilter); waterFilter.connect(waterGain); waterGain.connect(_asmrtGain);

  waterGain.gain.setValueAtTime(0.016, now);
  for (let t = 0; t < dur; t += 0.1) {
    // 4초 주기로 물소리 볼륨 및 필터 주파수가 휩쓸며 변동 (회전음과 위상 다르게 조화)
    const lfoVal = 0.016 + 0.011 * Math.sin(2 * Math.PI * (t / 4) + Math.PI / 2);
    waterGain.gain.setValueAtTime(lfoVal, now + t);
    
    const freqVal = 420 + 180 * Math.sin(2 * Math.PI * (t / 4));
    waterFilter.frequency.setValueAtTime(freqVal, now + t);
  }
  waterGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(waterNoise);
  waterNoise.start(now);
  waterNoise.stop(now + dur + 0.1);

  // 3-b. 드럼 내부 잔잔한 물 출렁임 (150~280Hz 로우 밴드패스 — 아주 부드럽게)
  const sloshNoise = createNoise(dur);
  const sloshFilter = createFilter('bandpass', 200, 2.0);
  const sloshGain = createGain(0);
  sloshNoise.connect(sloshFilter); sloshFilter.connect(sloshGain); sloshGain.connect(_asmrtGain);

  sloshGain.gain.setValueAtTime(0, now);
  sloshGain.gain.linearRampToValueAtTime(0.014, now + 2.0);
  // 7초 주기 — 드럼 안 물이 아주 느리게 출렁이는 느낌
  for (let t = 2; t < dur - 1; t += 0.15) {
    const sv = 0.014 + 0.008 * Math.sin(2 * Math.PI * (t / 7));
    sloshGain.gain.setValueAtTime(sv, now + t);
    const sf = 190 + 70 * Math.sin(2 * Math.PI * (t / 7) + 1.2);
    sloshFilter.frequency.setValueAtTime(sf, now + t);
  }
  sloshGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(sloshNoise);
  sloshNoise.start(now);
  sloshNoise.stop(now + dur + 0.1);

  // 4. 건조기 회전음 (65Hz 톱니파 + 로우패스 필터링 및 5초 주기 LFO)
  const dryerOsc = ctx.createOscillator();
  const dryerGain = createGain(0);
  const dryerFilter = createFilter('lowpass', 85);
  dryerOsc.type = 'sawtooth';
  dryerOsc.frequency.setValueAtTime(65, now);
  dryerOsc.connect(dryerFilter); dryerFilter.connect(dryerGain); dryerGain.connect(_asmrtGain);

  dryerGain.gain.setValueAtTime(0.008, now);
  for (let t = 0; t < dur; t += 0.1) {
    const lfoVal = 0.008 + 0.006 * Math.sin(2 * Math.PI * (t / 5));
    dryerGain.gain.setValueAtTime(lfoVal, now + t);
  }
  dryerGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(dryerOsc);
  dryerOsc.start(now);
  dryerOsc.stop(now + dur + 0.1);

  // 건조기 옷감의 쿵쿵대는 둔탁한 Thump 소리 (25~45Hz 대역의 스위프)
  const thumpCount = Math.floor(rand(2, 4));
  for (let i = 0; i < thumpCount; i++) {
    const thumpTime = now + rand(1.5, dur - 1.5);
    const thumpOsc = ctx.createOscillator();
    const thumpG = createGain(0);
    const thumpFilter = createFilter('lowpass', 45);
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(40, thumpTime);
    thumpOsc.frequency.exponentialRampToValueAtTime(20, thumpTime + 0.35);
    thumpOsc.connect(thumpFilter); thumpFilter.connect(thumpG); thumpG.connect(_asmrtGain);

    thumpG.gain.setValueAtTime(0, thumpTime);
    thumpG.gain.linearRampToValueAtTime(0.035, thumpTime + 0.03);
    thumpG.gain.exponentialRampToValueAtTime(0.001, thumpTime + 0.45);

    _registerNode(thumpOsc);
    thumpOsc.start(thumpTime);
    thumpOsc.stop(thumpTime + 0.5);
  }

  // 5. 옷감이 부드럽게 스치는 소리 (Fabric rustling)
  const rustleCount = Math.floor(rand(3, 5));
  for (let i = 0; i < rustleCount; i++) {
    const rTime = now + rand(1, dur - 2);
    const rDur = rand(0.6, 1.3);
    const rNoise = createNoise(rDur);
    const rFilter = createFilter('bandpass', rand(900, 1800), 2.5);
    const rGain = createGain(0);
    rNoise.connect(rFilter); rFilter.connect(rGain); rGain.connect(_asmrtGain);

    rGain.gain.setValueAtTime(0, rTime);
    rGain.gain.linearRampToValueAtTime(rand(0.006, 0.012), rTime + rDur * 0.25);
    rGain.gain.linearRampToValueAtTime(rand(0.004, 0.009), rTime + rDur * 0.65);
    rGain.gain.exponentialRampToValueAtTime(0.001, rTime + rDur);

    _registerNode(rNoise);
    rNoise.start(rTime);
    rNoise.stop(rTime + rDur + 0.1);
  }

  _scheduleLoop('laundry_room', dur * 1000);
}

function _asmrSpaceStationNight() {
  const ctx = getCtx();
  const dur = 20;
  const now = ctx.currentTime;

  // 1. 공조기(HVAC) 소리 - 잔잔히 깔리는 기류음 (Low-passed noise)
  const airNoise = createNoise(dur);
  const airLpf = createFilter('lowpass', 110, 1.2);
  const airHpf = createFilter('highpass', 35, 1.0);
  const airGain = createGain(0);
  
  airNoise.connect(airLpf); airLpf.connect(airHpf); airHpf.connect(airGain); airGain.connect(_asmrtGain);
  
  airGain.gain.setValueAtTime(0, now);
  airGain.gain.linearRampToValueAtTime(0.065, now + 2.0);
  airGain.gain.setValueAtTime(0.065, now + dur - 2.0);
  airGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(airNoise);
  airNoise.start(now);
  airNoise.stop(now + dur + 0.1);

  // 2. 환풍기 모터 회전음 (90Hz, 135Hz 화음의 사인파 중첩)
  const f1 = ctx.createOscillator();
  const f2 = ctx.createOscillator();
  const fg1 = createGain(0);
  const fanFilter = createFilter('lowpass', 140);

  f1.type = 'sine';
  f1.frequency.setValueAtTime(90, now);
  f2.type = 'sine';
  f2.frequency.setValueAtTime(135, now);

  f1.connect(fanFilter);
  f2.connect(fanFilter);
  fanFilter.connect(fg1);
  fg1.connect(_asmrtGain);

  fg1.gain.setValueAtTime(0, now);
  fg1.gain.linearRampToValueAtTime(0.012, now + 2.5);
  fg1.gain.setValueAtTime(0.012, now + dur - 2.5);
  fg1.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(f1); _registerNode(f2);
  f1.start(now); f1.stop(now + dur + 0.1);
  f2.start(now); f2.stop(now + dur + 0.1);

  // 3. 아주 작은 기계 동작음 (Deep background vibration - 48Hz triangle)
  const deepOsc = ctx.createOscillator();
  const deepGain = createGain(0);
  deepOsc.type = 'triangle';
  deepOsc.frequency.setValueAtTime(48, now);
  deepOsc.connect(deepGain); deepGain.connect(_asmrtGain);

  deepGain.gain.setValueAtTime(0, now);
  deepGain.gain.linearRampToValueAtTime(0.024, now + 2.0);
  deepGain.gain.setValueAtTime(0.024, now + dur - 2.0);
  deepGain.gain.linearRampToValueAtTime(0, now + dur);

  _registerNode(deepOsc);
  deepOsc.start(now);
  deepOsc.stop(now + dur + 0.1);

  // 4. 드물게 들리는 시스템 릴레이 클릭 (Relay clicks)
  const clickCount = Math.floor(rand(2, 4));
  for (let i = 0; i < clickCount; i++) {
    const cTime = now + rand(2, dur - 2);
    const clickLen = rand(0.005, 0.01);
    const cNoise = createNoise(clickLen);
    const cFilter = createFilter('bandpass', rand(3500, 5000), 3.5);
    const cGain = createGain(0);
    cNoise.connect(cFilter); cFilter.connect(cGain); cGain.connect(_asmrtGain);

    cGain.gain.setValueAtTime(0, cTime);
    cGain.gain.linearRampToValueAtTime(rand(0.003, 0.006), cTime);
    cGain.gain.exponentialRampToValueAtTime(0.0001, cTime + clickLen);

    _registerNode(cNoise);
    cNoise.start(cTime);
    cNoise.stop(cTime + clickLen + 0.02);
  }

  // 5. 아주 드물고 작은 시스템 비프음 (Rare system beep)
  if (Math.random() < 0.6) {
    const bTime = now + rand(3, dur - 4);
    const bFreq = rand(1600, 1850);
    const bDur = rand(0.07, 0.12);
    const beepOsc = ctx.createOscillator();
    const beepGain = createGain(0);
    
    beepOsc.type = 'sine';
    beepOsc.frequency.setValueAtTime(bFreq, bTime);
    beepOsc.connect(beepGain); beepGain.connect(_asmrtGain);
    
    beepGain.gain.setValueAtTime(0, bTime);
    beepGain.gain.linearRampToValueAtTime(0.002, bTime + 0.005);
    beepGain.gain.setValueAtTime(0.002, bTime + bDur - 0.01);
    beepGain.gain.exponentialRampToValueAtTime(0.0001, bTime + bDur);

    _registerNode(beepOsc);
    beepOsc.start(bTime);
    beepOsc.stop(bTime + bDur + 0.05);
  }

  _scheduleLoop('space_station_night', dur * 1000);
}

function _asmrForest() {
  const ctx = getCtx();
  const dur = 20;
  const now = ctx.currentTime;
  _addSoftWind(now, dur, 0.15);
  const birds = [
    { times: [0.5, 4.0, 9.0, 14.0], freqs: [1800, 2200, 1600, 2000] },
    { times: [2.0, 6.5, 12.0, 17.0], freqs: [2400, 2800, 2200, 2600] },
  ];
  birds.forEach(bird => {
    bird.times.forEach((offset, ti) => {
      const t    = now + offset;
      const dur2 = rand(0.15, 0.35);
      const o    = ctx.createOscillator();
      const g    = createGain(0);
      o.type = 'sine';
      o.frequency.setValueAtTime(bird.freqs[ti % bird.freqs.length], t);
      o.frequency.linearRampToValueAtTime(bird.freqs[ti % bird.freqs.length] * rand(1.1, 1.3), t + dur2 * 0.5);
      o.frequency.linearRampToValueAtTime(bird.freqs[ti % bird.freqs.length] * rand(0.8, 1.0), t + dur2);
      o.connect(g); g.connect(_asmrtGain);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(rand(0.08, 0.14), t + 0.02);
      g.gain.linearRampToValueAtTime(0, t + dur2);
      _registerNode(o); o.start(t); o.stop(t + dur2 + 0.05);
    });
  });
  _scheduleLoop('forest', dur * 1000);
}

function _asmrRiver() {
  const ctx = getCtx();
  const dur = 18;
  const now = ctx.currentTime;
  const noise = createNoise(dur);
  const bpf   = createFilter('bandpass', 900, 0.5);
  const lpf   = createFilter('lowpass', 3000);
  const g     = createGain(0);
  noise.connect(bpf); bpf.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.3, now + 1.5);
  g.gain.setValueAtTime(0.3, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  for (let i = 0; i < 30; i++) {
    const t  = now + rand(0, dur - 0.3);
    const dp = createNoise(0.06);
    const bf = createFilter('bandpass', rand(1500, 4000), rand(2, 5));
    const dg = createGain(rand(0.03, 0.1));
    dp.connect(bf); bf.connect(dg); dg.connect(_asmrtGain);
    dg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    _registerNode(dp); dp.start(t); dp.stop(t + 0.08);
  }
  _scheduleLoop('river', dur * 1000);
}

function _asmrWhite() {
  const ctx = getCtx();
  const dur = 30;
  const now = ctx.currentTime;
  const noise = createNoise(dur);
  const g     = createGain(0);
  noise.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.3, now + 2);
  g.gain.setValueAtTime(0.3, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  _scheduleLoop('white', dur * 1000);
}

function _asmrPiano() {
  const ctx = getCtx();
  const dur = 24;
  const now = ctx.currentTime;
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
  _addSoftWind(now, dur, 0.08);
  const usedTimes = [];
  for (let i = 0; i < 30; i++) {
    let t;
    do { t = now + rand(0.5, dur - 1.5); }
    while (usedTimes.some(u => Math.abs(u - t) < 0.15));
    usedTimes.push(t);
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const noteDur = rand(1.0, 2.5);
    const o  = ctx.createOscillator();
    const g  = createGain(0);
    o.type = 'sine'; o.frequency.value = freq;
    o.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.06, 0.12), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
    _registerNode(o); o.start(t); o.stop(t + noteDur + 0.1);
    const o2 = ctx.createOscillator();
    const g2 = createGain(0);
    o2.type = 'sine'; o2.frequency.value = freq * 2;
    o2.connect(g2); g2.connect(_asmrtGain);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(rand(0.02, 0.05), t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, t + noteDur * 0.6);
    _registerNode(o2); o2.start(t); o2.stop(t + noteDur * 0.7);
  }
  _scheduleLoop('piano', dur * 1000);
}

function _asmrSnow() {
  const ctx = getCtx();
  const dur = 22;
  const now = ctx.currentTime;
  const noise = createNoise(dur);
  const lpf = createFilter('lowpass', 1200);
  const hpf = createFilter('highpass', 120);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.22, now + 2);
  g.gain.setValueAtTime(0.22, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  for (let i = 0; i < 55; i++) {
    const t = now + rand(0, dur - 0.4);
    const drp = createNoise(0.08);
    const bpf = createFilter('bandpass', rand(800, 2400), rand(0.4, 1.2));
    const dg = createGain(0);
    drp.connect(bpf); bpf.connect(dg); dg.connect(_asmrtGain);
    dg.gain.setValueAtTime(rand(0.02, 0.08), t);
    dg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    _registerNode(drp); drp.start(t); drp.stop(t + 0.14);
  }
  _scheduleLoop('snow', dur * 1000);
}

function _asmrOcean() {
  const ctx = getCtx();
  const dur = 24;
  const now = ctx.currentTime;
  for (let w = 0; w < 6; w++) {
    const t = now + w * 4 + rand(0, 0.5);
    const waveDur = rand(3.2, 4.5);
    const noise = createNoise(waveDur);
    const lpf = createFilter('lowpass', rand(280, 480));
    const g = createGain(0);
    noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.2, 0.32), t + waveDur * 0.45);
    g.gain.linearRampToValueAtTime(0, t + waveDur);
    _registerNode(noise); noise.start(t); noise.stop(t + waveDur + 0.1);
  }
  _addSoftWind(now, dur, 0.12);
  _scheduleLoop('ocean', dur * 1000);
}

function _asmrFan() {
  const ctx = getCtx();
  const dur = 28;
  const now = ctx.currentTime;
  const noise = createBrownNoise(dur);
  const bpf = createFilter('bandpass', 180, 0.35);
  const g = createGain(0);
  noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.28, now + 2);
  g.gain.setValueAtTime(0.28, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  _scheduleLoop('fan', dur * 1000);
}

function _asmrBrown() {
  const ctx = getCtx();
  const dur = 32;
  const now = ctx.currentTime;
  const noise = createBrownNoise(dur);
  const lpf = createFilter('lowpass', 420);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.32, now + 2.5);
  g.gain.setValueAtTime(0.32, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
  _scheduleLoop('brown', dur * 1000);
}

function _asmrHeartbeat() {
  const ctx = getCtx();
  const dur = 20;
  const now = ctx.currentTime;
  const bpm = 58;
  const beat = 60 / bpm;
  const beats = Math.floor(dur / beat);
  for (let i = 0; i < beats; i++) {
    const t = now + i * beat;
    [[0, 55, 0.14], [0.14, 42, 0.1]].forEach(([off, freq, noteDur]) => {
      const o = ctx.createOscillator();
      const g = createGain(0);
      o.type = 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(_asmrtGain);
      g.gain.setValueAtTime(0, t + off);
      g.gain.linearRampToValueAtTime(0.12, t + off + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + noteDur);
      _registerNode(o); o.start(t + off); o.stop(t + off + noteDur + 0.05);
    });
  }
  _scheduleLoop('heartbeat', dur * 1000);
}

function _asmrMusicbox() {
  const ctx = getCtx();
  const dur = 26;
  const now = ctx.currentTime;
  const melody = [523.25, 523.25, 783.99, 783.99, 880.0, 880.0, 783.99, 659.25, 659.25, 587.33, 587.33, 523.25];
  melody.forEach((freq, i) => {
    const t = now + 0.8 + i * 0.55;
    const noteDur = 0.48;
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'triangle'; o.frequency.value = freq;
    o.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
    _registerNode(o); o.start(t); o.stop(t + noteDur + 0.05);
  });
  _addSoftWind(now, dur, 0.06);
  _scheduleLoop('musicbox', dur * 1000);
}

function _asmrPresetRainy() {
  const dur = 20;
  const now = getCtx().currentTime;
  _asmrRainLayer(now, dur, 0.3);
  _addSoftWind(now, dur, 0.14);
  _scheduleLoop('preset_rainy', dur * 1000);
}

function _asmrPresetCozy() {
  const dur = 18;
  const now = getCtx().currentTime;
  _asmrFireLayer(now, dur, 0.22);
  _addSoftWind(now, dur, 0.1);
  _scheduleLoop('preset_cozy', dur * 1000);
}

function _asmrPresetDeep() {
  const dur = 30;
  const now = getCtx().currentTime;
  _asmrBrownLayer(now, dur, 0.26);
  _asmrHeartbeatLayer(now, dur, 0.08);
  _scheduleLoop('preset_deep', dur * 1000);
}

function _asmrPresetStarry() {
  const dur = 16;
  const now = getCtx().currentTime;
  _addSoftWind(now, dur, 0.2);
  _addCrickets(now, dur, 0.28);
  _asmrSheepLayer(now, dur, 0.05);
  _scheduleLoop('preset_starry', dur * 1000);
}

function _asmrPresetOcean() {
  const dur = 24;
  const now = getCtx().currentTime;
  _asmrOceanLayer(now, dur);
  _addCrickets(now, dur, 0.12);
  _scheduleLoop('preset_ocean', dur * 1000);
}

function _asmrWater() {
  const dur = 18;
  const now = getCtx().currentTime;
  _asmrRiverLayer(now, dur, 0.24);
  _addWaterDrops(now, dur, 18, 0.12);
  _scheduleLoop('water', dur * 1000);
}

function _asmrBirds() {
  const dur = 18;
  const now = getCtx().currentTime;
  _addSoftWind(now, dur, 0.12);
  _addBirdChirps(now, dur, 12, 0.09);
  _scheduleLoop('birds', dur * 1000);
}

function _asmrCottage() {
  const dur = 20;
  const now = getCtx().currentTime;
  _asmrFireLayer(now, dur, 0.16);
  _addSoftWind(now, dur, 0.1);
  _addCrickets(now, dur, 0.16);
  _scheduleLoop('cottage', dur * 1000);
}

function _asmrPencil() {
  const dur = 15;
  const now = getCtx().currentTime;
  _addWritingScratches(now, dur, 34, 0.12, 2200);
  _scheduleLoop('pencil', dur * 1000);
}

function _asmrBrush() {
  const dur = 16;
  const now = getCtx().currentTime;
  _addWritingScratches(now, dur, 22, 0.08, 900);
  _addSoftWind(now, dur, 0.04);
  _scheduleLoop('brush', dur * 1000);
}

function _asmrChalk() {
  const dur = 15;
  const now = getCtx().currentTime;
  _addWritingScratches(now, dur, 28, 0.1, 3300);
  _scheduleLoop('chalk', dur * 1000);
}

function _asmrPages() {
  const dur = 16;
  const now = getCtx().currentTime;
  _addPageTurns(now, dur, 9, 0.16);
  _scheduleLoop('pages', dur * 1000);
}

function _asmrKalimba() {
  const dur = 18;
  const now = getCtx().currentTime;
  _addPluckedMelody(now, dur, [523.25, 659.25, 783.99, 880, 659.25], 0.12, 'sine');
  _scheduleLoop('kalimba', dur * 1000);
}

function _asmrKoto() {
  const dur = 20;
  const now = getCtx().currentTime;
  _addPluckedMelody(now, dur, [392, 493.88, 587.33, 659.25, 783.99], 0.1, 'triangle');
  _addSoftWind(now, dur, 0.05);
  _scheduleLoop('koto', dur * 1000);
}

function _asmrGayageum() {
  const dur = 20;
  const now = getCtx().currentTime;
  _addPluckedMelody(now, dur, [440, 523.25, 587.33, 659.25, 783.99], 0.1, 'triangle');
  _addSoftWind(now, dur, 0.04);
  _scheduleLoop('gayageum', dur * 1000);
}

function _asmrZenGarden() {
  const dur = 20;
  const now = getCtx().currentTime;
  _asmrRiverLayer(now, dur, 0.11);
  _addWaterDrops(now, dur, 10, 0.032);
  _addSoftWind(now, dur, 0.05);
  _addZenBells(now, dur, 5, 0.07);
  _scheduleLoop('zen_garden', dur * 1000);
}

function _asmrPresetCottage() {
  const dur = 22;
  const now = getCtx().currentTime;
  _asmrFireLayer(now, dur, 0.14);
  _addSoftWind(now, dur, 0.09);
  _addCrickets(now, dur, 0.14);
  _addBirdChirps(now, dur, 3, 0.035);
  _scheduleLoop('preset_cottage', dur * 1000);
}

function _asmrPresetZen() {
  const dur = 22;
  const now = getCtx().currentTime;
  _asmrRiverLayer(now, dur, 0.11);
  _addSoftWind(now, dur, 0.07);
  _addZenBells(now, dur, 6, 0.075);
  _scheduleLoop('preset_zen', dur * 1000);
}

function _asmrPresetStudy() {
  const dur = 20;
  const now = getCtx().currentTime;
  _addWritingScratches(now, dur, 24, 0.09, 2100);
  _addPageTurns(now, dur, 4, 0.1);
  _addSoftWind(now, dur, 0.04);
  _scheduleLoop('preset_study', dur * 1000);
}

function _asmrPresetTraditional() {
  const dur = 22;
  const now = getCtx().currentTime;
  _addPluckedMelody(now, dur, [392, 440, 523.25, 587.33, 659.25, 783.99], 0.085, 'triangle');
  _addZenBells(now, dur, 3, 0.045);
  _addSoftWind(now, dur, 0.045);
  _scheduleLoop('preset_traditional', dur * 1000);
}

function _asmrRainLayer(now, dur, vol) {
  const ctx = getCtx();
  const noise = createNoise(dur);
  const lpf = createFilter('lowpass', 2000);
  const hpf = createFilter('highpass', 200);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.2);
  g.gain.setValueAtTime(vol, now + dur - 1.5);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _asmrFireLayer(now, dur, vol) {
  const ctx = getCtx();
  const noise = createNoise(dur);
  const lpf = createFilter('lowpass', 500);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1);
  g.gain.setValueAtTime(vol, now + dur - 1.5);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _asmrBrownLayer(now, dur, vol) {
  const noise = createBrownNoise(dur);
  const lpf = createFilter('lowpass', 420);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 2);
  g.gain.setValueAtTime(vol, now + dur - 2);
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _asmrHeartbeatLayer(now, dur, vol) {
  const ctx = getCtx();
  const beat = 60 / 58;
  const beats = Math.floor(dur / beat);
  for (let i = 0; i < beats; i++) {
    const t = now + i * beat;
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'sine'; o.frequency.value = 50;
    o.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    _registerNode(o); o.start(t); o.stop(t + 0.22);
  }
}

function _asmrSheepLayer(now, dur, vol) {
  [3, 9].forEach(offset => {
    const t = now + offset;
    const o = getCtx().createOscillator();
    const g = createGain(0);
    const lpf = createFilter('lowpass', 500);
    o.type = 'sawtooth'; o.frequency.value = 200;
    o.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.08);
    g.gain.linearRampToValueAtTime(0, t + 0.55);
    _registerNode(o); o.start(t); o.stop(t + 0.6);
  });
}

function _asmrOceanLayer(now, dur, vol = 0.26, waves = 5) {
  for (let w = 0; w < waves; w++) {
    const t = now + w * (dur / Math.max(3, waves));
    const waveDur = Math.max(2.8, dur / Math.max(4, waves));
    const noise = createNoise(waveDur);
    const lpf = createFilter('lowpass', 380);
    const g = createGain(0);
    noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 2);
    g.gain.linearRampToValueAtTime(0, t + waveDur);
    _registerNode(noise); noise.start(t); noise.stop(t + waveDur + 0.1);
  }
}

function _asmrRiverLayer(now, dur, vol) {
  const noise = createNoise(dur);
  const lpf = createFilter('lowpass', 1200);
  const hpf = createFilter('highpass', 180);
  const g = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.2);
  for (let t = 2; t < dur - 1; t += 2.2) {
    g.gain.linearRampToValueAtTime(vol * rand(0.75, 1.1), now + t);
  }
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addWaterDrops(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.2, dur - 0.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(750, t);
    lpf.Q.setValueAtTime(0.4, t);
    
    osc.type = 'sine';
    const startFreq = rand(450, 750); // 고음을 낮추어 한결 부드럽게
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.68, t + 0.16); // 부드럽고 완만한 피치 스윕
    
    osc.connect(lpf);
    lpf.connect(g);
    g.connect(_asmrtGain);
    
    const attack = 0.04; // 40ms 어택으로 클릭 노이즈(뿅/뾱) 방지
    const release = rand(0.3, 0.65);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.5, 0.95), t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + release);
    
    _registerNode(osc);
    _registerNode(lpf);
    _registerNode(g);
    osc.start(t);
    osc.stop(t + release + 0.1);
  }
}

function _addBirdChirps(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.4, dur - 0.4);
    const osc = ctx.createOscillator();
    const g = createGain(0);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rand(1200, 2200), t);
    osc.frequency.linearRampToValueAtTime(rand(1800, 3200), t + 0.08);
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.12, 0.22));
    _registerNode(osc); osc.start(t); osc.stop(t + 0.28);
  }
}

function _addWritingScratches(now, dur, count, vol, freq) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.1, dur - 0.1);
    const scratch = createNoise(rand(0.045, 0.14));
    const bpf = createFilter('bandpass', freq * rand(0.75, 1.25), rand(5, 12));
    const g = createGain(0);
    scratch.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.4, 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.05, 0.16));
    _registerNode(scratch); scratch.start(t); scratch.stop(t + 0.2);
  }
}

function _addPageTurns(now, dur, count, vol) {
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.4, dur - 0.4);
    const page = createNoise(rand(0.22, 0.42));
    const hpf = createFilter('highpass', 900);
    const lpf = createFilter('lowpass', 4200);
    const g = createGain(0);
    page.connect(hpf); hpf.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.5, 1), t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.24, 0.45));
    _registerNode(page); page.start(t); page.stop(t + 0.5);
  }
}

function _addPluckedMelody(now, dur, notes, vol, type = 'triangle') {
  const ctx = getCtx();
  for (let t = 0.4, i = 0; t < dur - 0.5; t += rand(1.2, 2.2), i++) {
    const start = now + t;
    const freq = notes[i % notes.length] * rand(0.99, 1.01);
    const osc = ctx.createOscillator();
    const g = createGain(0);
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, start + rand(1.0, 1.8));
    _registerNode(osc); osc.start(start); osc.stop(start + 2);
  }
}

function _addZenBells(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.8, dur - 1.0);
    [1, 2.01, 3.02].forEach((mul, idx) => {
      const osc = ctx.createOscillator();
      const g = createGain(0);
      osc.type = 'sine';
      osc.frequency.value = rand(440, 660) * mul;
      osc.connect(g); g.connect(_asmrtGain);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol / (idx + 1), t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + rand(1.4, 2.6));
      _registerNode(osc); osc.start(t); osc.stop(t + 2.8);
    });
  }
}

function createBrownNoise(duration) {
  const ctx = getCtx();
  const frames = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frames; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + white * 0.02) / 1.02;
    data[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

// --- 諛붿씠?몃윺 鍮꾪듃 (ASMR怨??숈떆 ?ъ깮 媛?? ---

export const BINARURAL_LIST = [
  { id: 'delta_2',  emoji: '🌙', nameKey: 'asmr.binaural.delta2.name', descKey: 'asmr.binaural.delta2.desc', carrier: 200, beat: 2 },
  { id: 'delta_1',  emoji: '🌌', nameKey: 'asmr.binaural.delta1.name', descKey: 'asmr.binaural.delta1.desc', carrier: 180, beat: 1 },
  { id: 'theta_6',  emoji: '🫧', nameKey: 'asmr.binaural.theta6.name', descKey: 'asmr.binaural.theta6.desc', carrier: 220, beat: 6 },
  { id: 'theta_4',  emoji: '🧘', nameKey: 'asmr.binaural.theta4.name', descKey: 'asmr.binaural.theta4.desc', carrier: 210, beat: 4 },
  { id: 'alpha_10', emoji: '🌤️', nameKey: 'asmr.binaural.alpha10.name', descKey: 'asmr.binaural.alpha10.desc', carrier: 240, beat: 10 },
];

let _binauralOscL = null;
let _binauralOscR = null;
let _currentBinauralId = null;

const BINARURAL_MAX_GAIN = 0.22;

function _binauralTargetGain() {
  return (getBinauralVolume() / 100) * BINARURAL_MAX_GAIN;
}

function _applyBinauralGain() {
  if (!_binauralGain) return;
  _binauralGain.gain.value = _currentBinauralId ? _binauralTargetGain() : 0;
}

export function getBinauralList() {
  const lang = getSettings().language || DEFAULT_LANGUAGE;
  return BINARURAL_LIST.map(item => ({
    ...item,
    name: t(item.nameKey, {}, lang) || item.name || item.nameKey,
    desc: t(item.descKey, {}, lang) || item.desc || item.descKey,
  }));
}

export function getBinauralItem(id) {
  return getBinauralList().find(i => i.id === id) ?? null;
}

export function getBinauralVolume() {
  const v = _prefs.binauralVol ?? 15;
  return Math.max(1, Math.min(100, Math.round(v)));
}

export function setBinauralVolume(v) {
  _prefs.binauralVol = Math.max(1, Math.min(100, Math.round(v)));
  savePrefs();
  _applyBinauralGain();
}

export function getCurrentBinauralId() { return _currentBinauralId; }

export function getLastBinauralId() { return _prefs.lastBinauralId ?? null; }

export function playBinaural(id, opts = {}) {
  stopBinaural();
  const item = getBinauralItem(id);
  if (!item) return;
  const ctx = getCtx();
  _currentBinauralId = id;
  _prefs.lastBinauralId = id;
  savePrefs();

  const oscL = ctx.createOscillator();
  const oscR = ctx.createOscillator();
  oscL.type = 'sine';
  oscR.type = 'sine';
  oscL.frequency.value = item.carrier;
  oscR.frequency.value = item.carrier + item.beat;

  const panL = ctx.createStereoPanner();
  const panR = ctx.createStereoPanner();
  panL.pan.value = -1;
  panR.pan.value = 1;

  const gL = createGain(0.5);
  const gR = createGain(0.5);

  oscL.connect(gL); gL.connect(panL); panL.connect(_binauralGain);
  oscR.connect(gR); gR.connect(panR); panR.connect(_binauralGain);

  oscL.start();
  oscR.start();
  _binauralOscL = oscL;
  _binauralOscR = oscR;

  if (opts.fadeIn) {
    const target = _binauralTargetGain();
    const g = _binauralGain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(0.001, ctx.currentTime);
    g.linearRampToValueAtTime(target, ctx.currentTime + (opts.fadeInSec ?? 2.5));
  } else {
    _applyBinauralGain();
  }
}

export function stopBinaural() {
  [_binauralOscL, _binauralOscR].forEach(o => {
    if (!o) return;
    try { o.stop(); } catch (e) { /* noop */ }
    try { o.disconnect(); } catch (e) { /* noop */ }
  });
  _binauralOscL = _binauralOscR = null;
  _currentBinauralId = null;
  if (_binauralGain) _binauralGain.gain.value = 0;
}

export function fadeOutAndStopBinaural(sec = 4) {
  if (!_binauralGain || !_currentBinauralId) {
    stopBinaural();
    return;
  }
  const ctx = getCtx();
  const g = _binauralGain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(0.001, ctx.currentTime + sec);
  setTimeout(() => stopBinaural(), sec * 1000 + 50);
}

// --- 怨듭쑀 釉붾줉 ---

function _addSoftWind(now, dur, vol) {
  const ctx = getCtx();
  const noise = createNoise(dur);
  const lpf   = createFilter('lowpass', 300);
  const hpf   = createFilter('highpass', 60);
  const g     = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 1.5);
  for (let t = 2; t < dur - 2; t += 3) {
    g.gain.linearRampToValueAtTime(vol * rand(0.6, 1.0), now + t);
  }
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addWind(now, dur, vol) {
  const ctx = getCtx();
  const noise = createNoise(dur);
  const lpf   = createFilter('lowpass', 600);
  const hpf   = createFilter('highpass', 80);
  const g     = createGain(0);
  noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 2);
  for (let t = 3; t < dur - 2; t += 2.5) {
    g.gain.linearRampToValueAtTime(vol * rand(0.4, 1.0), now + t);
  }
  g.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

function _addCrickets(now, dur, vol) {
  const ctx = getCtx();
  const noise = createNoise(dur);
  const bpf   = createFilter('bandpass', rand(3500, 5000), 8);
  const g     = createGain(0);
  noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
  const chirpRate = rand(6, 10);
  const chirpDur  = 1 / chirpRate;
  for (let t = 0; t < dur; t += chirpDur) {
    const on  = now + t;
    const off = on + chirpDur * rand(0.3, 0.5);
    g.gain.setValueAtTime(0, on);
    g.gain.linearRampToValueAtTime(vol, on + 0.005);
    g.gain.setValueAtTime(vol, off);
    g.gain.linearRampToValueAtTime(0, off + 0.01);
  }
  _registerNode(noise); noise.start(now); noise.stop(now + dur + 0.1);
}

// --- ASMR 2차 개선 헬퍼 함수들 ---

/** 양 방울 소리: 금속 배음 조합 */
function _addSheepBell(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.5, dur - 0.5);
    const freqs = [rand(680, 820), rand(1380, 1620), rand(2180, 2420)];
    freqs.forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = createGain(0);
      o.type = idx === 0 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f, t);
      o.connect(g); g.connect(_asmrtGain);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * (1 - idx * 0.28), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.4, 0.9) - idx * 0.1);
      _registerNode(o); o.start(t); o.stop(t + 1.1);
    });
  }
}

/** 원거리 양 울음: LFO 비브라토 적용 */
function _addDistantSheepBaa(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(1, dur - 2);
    const baseFreq = rand(260, 340);
    const baaLen   = rand(0.5, 1.0);
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = createGain(rand(6, 14));
    const lpf = createFilter('lowpass', 700, 2);
    const g = createGain(0);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(baseFreq, t);
    o.frequency.linearRampToValueAtTime(baseFreq * 1.15, t + baaLen * 0.2);
    o.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, t + baaLen);
    lfo.frequency.value = rand(5, 8);
    lfo.connect(lfoGain); lfoGain.connect(o.frequency);
    o.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.5, 0.9), t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + baaLen + 0.1);
    _registerNode(o); _registerNode(lfo);
    lfo.start(t); lfo.stop(t + baaLen + 0.15);
    o.start(t); o.stop(t + baaLen + 0.15);
  }
}

/** 개구리 소리: 펄스 노이즈 변조 */
function _addFrogChoruses(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.3, dur - 0.5);
    const ribbitLen = rand(0.06, 0.12);
    const reps = Math.floor(rand(2, 4));
    for (let r = 0; r < reps; r++) {
      const rt = t + r * (ribbitLen + 0.04);
      const noise = createNoise(ribbitLen);
      const bpf = createFilter('bandpass', rand(380, 520), 12);
      const g = createGain(0);
      noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
      g.gain.setValueAtTime(0, rt);
      g.gain.linearRampToValueAtTime(vol * rand(0.6, 1), rt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, rt + ribbitLen);
      _registerNode(noise); noise.start(rt); noise.stop(rt + ribbitLen + 0.05);
    }
  }
}

/** 밤 부엉이 소리: 2단계 피치 벤딩 */
function _addDistantOwl(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(1.5, dur - 3);
    const baseF = rand(220, 300);
    const o = ctx.createOscillator();
    const lpf = createFilter('lowpass', 600, 2);
    const g = createGain(0);
    o.type = 'sine';
    o.frequency.setValueAtTime(baseF * 1.08, t);
    o.frequency.linearRampToValueAtTime(baseF, t + 0.18);
    o.frequency.setValueAtTime(baseF, t + 0.5);
    o.frequency.linearRampToValueAtTime(baseF * 0.88, t + 0.72);
    o.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.5, 0.85), t + 0.06);
    g.gain.setValueAtTime(vol * rand(0.5, 0.85), t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    _registerNode(o); o.start(t); o.stop(t + 1.0);
  }
}

/** 커피머신 스팀 + 모터음 */
function _addCoffeeMachineBuzz(now, dur, vol) {
  const ctx = getCtx();
  // 스팀 노이즈
  const steam = createNoise(dur);
  const bpf = createFilter('bandpass', rand(3200, 4800), 3);
  const sg = createGain(0);
  steam.connect(bpf); bpf.connect(sg); sg.connect(_asmrtGain);
  sg.gain.setValueAtTime(0, now);
  sg.gain.linearRampToValueAtTime(vol * 0.4, now + 0.3);
  sg.gain.setValueAtTime(vol * 0.4, now + dur - 0.5);
  sg.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(steam); steam.start(now); steam.stop(now + dur + 0.1);
  // 모터 저음
  const motor = ctx.createOscillator();
  const mg = createGain(0);
  motor.type = 'sawtooth';
  motor.frequency.setValueAtTime(rand(48, 60), now);
  motor.connect(createFilter('lowpass', 140, 2)).connect(mg); mg.connect(_asmrtGain);
  mg.gain.setValueAtTime(0, now);
  mg.gain.linearRampToValueAtTime(vol * 0.2, now + 0.5);
  mg.gain.setValueAtTime(vol * 0.2, now + dur - 0.5);
  mg.gain.linearRampToValueAtTime(0, now + dur);
  _registerNode(motor); motor.start(now); motor.stop(now + dur + 0.1);
}

/** 로파이 재즈 멜로디: 따뜻한 삼각파 */
function _addLofiJazzMelody(now, dur, vol) {
  const ctx = getCtx();
  const jazzChords = [
    [261.63, 329.63, 392.00],  // C maj
    [220.00, 277.18, 329.63],  // A min
    [174.61, 220.00, 261.63],  // F maj
    [196.00, 246.94, 293.66],  // G maj
  ];
  const stepLen = 3.2;
  let t = now + 0.5;
  while (t < now + dur - stepLen) {
    const chord = jazzChords[Math.floor(rand(0, jazzChords.length))];
    const noteFreq = chord[Math.floor(rand(0, chord.length))];
    const noteDur = rand(0.5, 1.2);
    const o = ctx.createOscillator();
    const lpf = createFilter('lowpass', rand(900, 1400), 1.5);
    const g = createGain(0);
    o.type = 'triangle';
    o.frequency.setValueAtTime(noteFreq, t);
    o.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.6, 1.0), t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
    _registerNode(o); o.start(t); o.stop(t + noteDur + 0.05);
    t += rand(stepLen * 0.6, stepLen * 1.2);
  }
}

/** 장작 튀는 소리: 하이패스 극단적 쇼트 노이즈 */
function _addFirewoodCrackle(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.1, dur - 0.1);
    const clickLen = rand(0.008, 0.025);
    const noise = createNoise(clickLen);
    const hpf = createFilter('highpass', rand(2000, 5000), 1.5);
    const g = createGain(0);
    noise.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(vol * rand(0.4, 1.0), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + clickLen);
    _registerNode(noise); noise.start(t); noise.stop(t + clickLen + 0.01);
  }
}

/** 마사지 오일 문지름음: 사인 곡선 엔벨로프 필터 */
function _addMassageOilSound(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.3, dur - 1.5);
    const strokeLen = rand(0.8, 1.8);
    const noise = createNoise(strokeLen);
    const bpf = createFilter('bandpass', rand(1800, 3200), 4);
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.5, 1.0), t + strokeLen * 0.2);
    g.gain.linearRampToValueAtTime(vol * rand(0.3, 0.7), t + strokeLen * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + strokeLen);
    _registerNode(noise); noise.start(t); noise.stop(t + strokeLen + 0.05);
  }
}

/** 속삭임 호흡음: 스위핑 밴드패스 */
function _addWhisperBreath(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.5, dur - 2.0);
    const breathLen = rand(1.0, 2.2);
    const noise = createNoise(breathLen);
    const bpf = createFilter('bandpass', rand(800, 1800), 3);
    const g = createGain(0);
    noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.4, 0.8), t + breathLen * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + breathLen);
    bpf.frequency.setValueAtTime(rand(600, 1000), t);
    bpf.frequency.linearRampToValueAtTime(rand(1600, 2400), t + breathLen * 0.5);
    bpf.frequency.linearRampToValueAtTime(rand(400, 800), t + breathLen);
    _registerNode(noise); noise.start(t); noise.stop(t + breathLen + 0.05);
  }
}

/** 풀벌레(메뚜기) 소리: 고주파 진폭 변조 노이즈 */
function _addGrasshopperLayer(now, dur, vol) {
  const ctx = getCtx();
  const noise = createNoise(dur);
  const bpf = createFilter('bandpass', rand(5500, 7500), 6);
  const g = createGain(0);
  noise.connect(bpf); bpf.connect(g); g.connect(_asmrtGain);
  // 진폭 변조 LFO
  const lfo = ctx.createOscillator();
  const lfoG = createGain(vol * 0.5);
  lfo.frequency.value = rand(14, 22);
  lfo.connect(lfoG); lfoG.connect(g.gain);
  g.gain.setValueAtTime(vol * 0.5, now);
  _registerNode(noise); _registerNode(lfo);
  noise.start(now); noise.stop(now + dur + 0.1);
  lfo.start(now); lfo.stop(now + dur + 0.1);
}

/** 도서관 키보드 도각거림: 삼각파 + 노이즈 믹스 */
function _addKeyboardTaps(now, dur, count, vol) {
  const ctx = getCtx();
  for (let i = 0; i < count; i++) {
    const t = now + rand(0.2, dur - 0.2);
    // 노이즈 클릭
    const clickLen = rand(0.015, 0.04);
    const noise = createNoise(clickLen);
    const hpf = createFilter('highpass', rand(1800, 3500), 1.2);
    const g = createGain(0);
    noise.connect(hpf); hpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(vol * rand(0.4, 1.0), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + clickLen);
    _registerNode(noise); noise.start(t); noise.stop(t + clickLen + 0.01);
  }
}

// ?€?€?€ BGM (?ㅻⅤ怨?諛곌꼍?뚯븙) ?€?€?€

// ?좎옄湲?醫뗭? ?ㅻⅤ怨?硫쒕줈???명듃 諛곗뿴 (二쇳뙆?? 諛뺤옄湲몄씠)
// 오르골 멜로디: BPM 52, 저음(C4~A4) 위주, 긴 음 + 충분한 쉼표
// 잠들기 직전 들을 법한 단순하고 여유로운 흐름
const BGM_MELODY = [
  // ── 1 절 ─────────────────────────────────────────────────
  [261.63, 2.0], [0, 1.5],   // C4 길게 → 쉼
  [329.63, 2.5], [0, 1.5],   // E4 길게 → 쉼
  [392.00, 3.0], [0, 2.0],   // G4 더 길게 → 긴 쉼

  [329.63, 2.0], [0, 1.5],   // E4 → 쉼
  [261.63, 3.5], [0, 3.0],   // C4 충분히 → 긴 쉼

  // ── 2 절 (변주) ──────────────────────────────────────────
  [293.66, 2.0], [0, 1.5],   // D4 → 쉼
  [329.63, 2.5], [0, 1.5],   // E4 → 쉼
  [392.00, 2.0], [0, 1.5],   // G4 → 쉼
  [329.63, 3.5], [0, 2.5],   // E4 길게 → 긴 쉼

  [261.63, 2.0], [0, 1.5],   // C4 → 쉼
  [246.94, 4.0], [0, 4.0],   // B3 아주 길게 → 아주 긴 쉼
];

const BGM_BPM = 52; // 잠들기 직전 오르골 — BPM 52로 더 느리게
const BGM_BEAT_SEC = 60 / BGM_BPM;

let _bgmRunning = false;
let _bgmTimeout = null;
let _bgmNodes = [];

/**
 * 오르골 단일 노트 합성
 * 오르골 특성: 어택은 40ms로 소프트하게 조정하여 쨍한 디지털 톤 억제, 로우패스 필터로 따뜻함 유지
 */
/**
 * 오르골 단일 노트 합성 — 따뜻하고 포근한 음색
 *
 * 목표: 장난감·전자음 완전 제거, 잠들기 직전 듣는 뮤직박스
 * 방법:
 *   · attack 60ms (너무 급격한 시작 → click 방지)
 *   · 2배음 비중 4% 이하 (밝은 고음 억제)
 *   · LPF 컷오프 = freq × 1.6 (고음대 잘라내기)
 *   · decay = min(duration × 1.4, 4.0)s (충분히 울리다가 자연소멸)
 */
function _playMusicBoxNote(ctx, freq, startTime, duration) {
  if (!_bgmGain) return;
  if (freq <= 0) return; // 쉼표

  const osc  = ctx.createOscillator();
  const env  = ctx.createGain();
  // 2배음 (극히 약하게 — 따뜻함만 추가)
  const osc2 = ctx.createOscillator();
  const env2 = ctx.createGain();
  // 따뜻한 로우패스: 고음 대역 강하게 차단
  const lpf  = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(freq * 1.6, startTime);
  lpf.Q.setValueAtTime(0.5, startTime);

  osc.type  = 'sine';
  osc2.type = 'sine';
  osc.frequency.setValueAtTime(freq,       startTime);
  osc2.frequency.setValueAtTime(freq * 2,  startTime);

  osc.connect(env);    env.connect(lpf);
  osc2.connect(env2);  env2.connect(lpf);
  lpf.connect(_bgmGain);

  const attackTime = 0.06;                            // 60ms — 클릭 방지
  const decayTime  = Math.min(duration * 1.4, 4.0);  // 충분히 울리다가 소멸

  // 기본음: attack → 부드러운 소멸
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(0.48, startTime + attackTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

  // 2배음: 훨씬 작게, 더 빨리 소멸
  env2.gain.setValueAtTime(0, startTime);
  env2.gain.linearRampToValueAtTime(0.04, startTime + attackTime);
  env2.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.35);

  const stopAt = startTime + decayTime + 0.15;
  osc.start(startTime);   osc.stop(stopAt);
  osc2.start(startTime);  osc2.stop(stopAt);

  _bgmNodes.push(osc, env, osc2, env2, lpf);
}

/**
 * ?ㅻⅤ怨?諛곌꼍?뚯븙 ???ъ씠???ъ깮
 */
function _playBgmCycle() {
  if (!_bgmRunning || !isBgmEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime + 0.05; // ?쎄컙???ъ쑀

  let t = now;
  let totalDuration = 0;
  BGM_MELODY.forEach(([freq, beats]) => {
    const dur = beats * BGM_BEAT_SEC;
    _playMusicBoxNote(ctx, freq, t, dur);
    t += dur;
    totalDuration += dur;
  });

  // 留덉?留??명듃 ?댄썑 ?좎떆 ?ъ뿀?ㅺ? ?ㅼ떆 諛섎났 (?먯뿰?ㅻ윭??猷⑦봽)
  const loopAfter = (totalDuration + 2.0) * 1000;
  _bgmTimeout = setTimeout(() => {
    // ?댁쟾 ?몃뱶 ?뺣━
    _bgmNodes.forEach(n => { try { n.disconnect(); } catch(e) {} });
    _bgmNodes = [];
    if (_bgmRunning && isBgmEnabled()) _playBgmCycle();
  }, loopAfter);
}

function _getCurrentPageType() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';
  if (filename === 'index.html' || filename === 'home.html' || filename === '') {
    return 'home';
  } else if (filename === 'friends.html') {
    return 'friends';
  } else if (filename === 'workshop.html') {
    return 'workshop';
  } else if (filename === 'gallery.html') {
    return 'gallery';
  } else if (filename === 'sleep.html') {
    return 'sleep';
  }
  return 'other';
}

function _isBgmAllowedPage() {
  const page = _getCurrentPageType();
  return ['home', 'friends', 'workshop', 'gallery'].includes(page);
}

/** 기본 BGM 재생 및 상태 관리 */
let _bgmFirstStart = true;

export function startBgm() {
  if (_bgmRunning) return;
  if (!isBgmEnabled()) return;
  if (_currentAsmrId) return; // ASMR이 켜져 있으면 재생 안 함
  if (!_isBgmAllowedPage()) return; // 허용된 페이지가 아니면 자동 재생 안 함

  _bgmRunning = true;
  if (_bgmGain) {
    _bgmGain.gain.setValueAtTime(getBgmVolume(), getCtx().currentTime);
  }

  if (_bgmFirstStart) {
    _bgmFirstStart = false;
    _playWindUpSound();
    setTimeout(() => {
      if (_bgmRunning) _playBgmCycle();
    }, 950);
  } else {
    _playBgmCycle();
  }
  try { sessionStorage.setItem('ss_bgm_running', 'true'); } catch(e) {}
}

export function stopBgm() {
  _bgmRunning = false;
  clearTimeout(_bgmTimeout);
  _bgmNodes.forEach(n => { try { n.stop(); } catch(e) {} try { n.disconnect(); } catch(e) {} });
  _bgmNodes = [];
}

export function isBgmPlaying() { return _bgmRunning; }

/** BGM 서서히 줄여서 끄기 */
export function fadeOutBgm(sec = 1.5) {
  if (!_bgmGain || !_bgmRunning) return;
  const ctx = getCtx();
  const g = _bgmGain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(0.001, ctx.currentTime + sec);
  setTimeout(() => {
    // 램프 완료 후 실제로 정지
    if (_bgmRunning) {
      stopBgm();
    }
  }, sec * 1000 + 50);
}

/** BGM 서서히 켜기 */
export function fadeInBgm(sec = 1.5) {
  if (!isBgmEnabled() || _currentAsmrId) return;
  if (!_isBgmAllowedPage()) return;
  const ctx = getCtx();
  _bgmRunning = true;
  _bgmGain.gain.cancelScheduledValues(ctx.currentTime);
  _bgmGain.gain.setValueAtTime(0.001, ctx.currentTime);
  _playBgmCycle();
  _bgmGain.gain.linearRampToValueAtTime(getBgmVolume(), ctx.currentTime + sec);
  try { sessionStorage.setItem('ss_bgm_running', 'true'); } catch(e) {}
}

let _morningAlarmRunning = false;
let _morningAlarmTimeout = null;
let _morningAlarmNodes = [];
let _morningAlarmPreset = 'dreamy';

/**
 * 紐⑤떇肄??뚮엺: ?붿옍???ㅻⅤ怨??꾨Ⅴ?섏???+ ?쒕━誘?"硫붿뿉~" 諛섎났
 */
export function playMorningCallAlarm(preset = null) {
  if (!isSfxEnabled()) return;
  const settings = getSettings();
  _morningAlarmPreset = preset || settings.morningCallPreset || 'dreamy';
  stopMorningCallAlarm();
  _morningAlarmRunning = true;
  _playMorningAlarmCycle();
}

function _playMorningNote(ctx, startTime, freq, duration, type = 'sine', gainLevel = 0.16) {
  const o = ctx.createOscillator();
  const g = createGain(0);
  o.type = type;
  o.frequency.setValueAtTime(freq, startTime);
  if (type === 'sine') {
    o.frequency.linearRampToValueAtTime(freq * 1.03, startTime + 0.05);
    o.frequency.exponentialRampToValueAtTime(freq * 0.96, startTime + duration);
  }
  o.connect(g);
  g.connect(_sfxGain);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gainLevel, startTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration + 0.08);
  o.start(startTime);
  o.stop(startTime + duration + 0.1);
  _morningAlarmNodes.push(o, g);
}

function _playDreamyMorningMotif(ctx, startTime, preset) {
  switch (preset) {
    case 'gentle':
      _playMorningNote(ctx, startTime, 523.25, 0.32, 'triangle', 0.12);
      _playMorningNote(ctx, startTime + 0.48, 659.25, 0.36, 'sine', 0.11);
      break;
    case 'cozy':
      _playMorningNote(ctx, startTime, 349.23, 0.44, 'sine', 0.14);
      _playMorningNote(ctx, startTime + 0.58, 392, 0.42, 'triangle', 0.13);
      break;
    default:
      _playMorningNote(ctx, startTime, 440, 0.42, 'sine', 0.16);
      _playMorningNote(ctx, startTime + 0.56, 392, 0.48, 'triangle', 0.14);
  }
}

function _playMorningAlarmCycle() {
  if (!_morningAlarmRunning || !isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime + 0.05;
  _playDreamyMorningMotif(ctx, now, _morningAlarmPreset);

  _morningAlarmTimeout = setTimeout(() => {
    _morningAlarmNodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
    _morningAlarmNodes = [];
    if (_morningAlarmRunning) _playMorningAlarmCycle();
  }, 3200);
}

/** 紐⑤떇肄??뚮엺 ?뺤? */
export function stopMorningCallAlarm() {
  _morningAlarmRunning = false;
  clearTimeout(_morningAlarmTimeout);
  _morningAlarmNodes.forEach(n => {
    try { n.stop(); } catch (e) {}
    try { n.disconnect(); } catch (e) {}
  });
  _morningAlarmNodes = [];
}

export function initSound() {
  syncVolumes();
}

export function resumeAudio() {
  if (_ctx && _ctx.state === 'suspended') {
    _ctx.resume();
  }
}

/**
 * 페이지 이동 후 이전 재생 상태(BGM/ASMR)를 sessionStorage에서 복원
 * 반드시 사용자 인터랙션 이후(click/touchstart 등) 호출되어야 함
 */
export function recoverAudioState() {
  try {
    const bgmRunningSession = sessionStorage.getItem('ss_bgm_running') === 'true';
    const asmrId = sessionStorage.getItem('ss_asmr_id');
    const asmrRunning = sessionStorage.getItem('ss_asmr_running') === 'true';

    const currentPage = _getCurrentPageType();
    const isBgmPage = _isBgmAllowedPage();

    // 1. ASMR 복구 여부 결정
    if (asmrId && asmrRunning && isAsmrEnabled()) {
      if (!_currentAsmrId) {
        playAsmr(asmrId, { fadeIn: true, fadeInSec: 1.5 });
      }
      // ASMR이 켜져 있는 동안에는 기본 BGM은 절대로 재생되지 않아야 함
      if (_bgmRunning) {
        stopBgm();
      }
    } else {
      // 2. ASMR이 없는 경우 BGM 복구 처리
      if (isBgmPage) {
        if (bgmRunningSession && !_bgmRunning && isBgmEnabled()) {
          startBgm();
        }
      } else if (currentPage === 'sleep') {
        // 수면 페이지인 경우 기본 BGM 재생 금지 및 Fade Out
        if (_bgmRunning) {
          fadeOutBgm(1.5);
        }
      }
    }

    // 수면 타이머 복원
    const timerEnd = parseInt(sessionStorage.getItem('ss_timer_end') || '0', 10);
    if (timerEnd > 0) {
      const remaining = timerEnd - Date.now();
      if (remaining > 5000) {
        const remainingMin = Math.ceil(remaining / 60000);
        setAsmrSleepTimer(remainingMin);
      } else {
        sessionStorage.removeItem('ss_timer_end');
      }
    }
  } catch (e) {
    // sessionStorage 접근 실패 시 무시
  }
}

/** 페이지 이동 전 현재 재생 상태를 sessionStorage에 저장 */
export function saveAudioState() {
  try {
    sessionStorage.setItem('ss_bgm_running', _bgmRunning ? 'true' : 'false');
    sessionStorage.setItem('ss_asmr_id', _currentAsmrId || '');
    sessionStorage.setItem('ss_asmr_running', _currentAsmrId ? 'true' : 'false');
  } catch (e) {}
}

/** 오르골 태엽 감기 소리: 페이지 첫 로드 시 선행 재생 */
function _playWindUpSound() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + 0.05;
  const dur = 0.8;
  // 태엽이 감기는 마찰음 (고주파 노이즈 스위핑)
  for (let i = 0; i < 5; i++) {
    const t = now + i * 0.13;
    const noise = createNoise(0.09);
    const hpf = createFilter('highpass', rand(4000, 7000), 2.5);
    const g = createGain(0);
    noise.connect(hpf); hpf.connect(g); g.connect(_bgmGain);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    _bgmNodes.push(noise);
    noise.start(t); noise.stop(t + 0.12);
  }
  // 마지막 "딸깍" 클릭음
  const clickNoise = createNoise(0.02);
  const bpf = createFilter('bandpass', rand(2000, 3500), 4);
  const cg = createGain(0.22);
  clickNoise.connect(bpf); bpf.connect(cg); cg.connect(_bgmGain);
  _bgmNodes.push(clickNoise);
  clickNoise.start(now + dur - 0.08);
  clickNoise.stop(now + dur);
}

