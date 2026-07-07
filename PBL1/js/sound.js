/**
 * sound.js - Sleepy Sheep 사운드 시스템
 * Web Audio API를 사용한 프로시저럴 사운드 합성
 */

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
    _bgmGain.gain.value = 0.18; // 배경음악은 기본적으로 작게
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

// --- 쓰다듬기 전용 합성음 (효과음·울음 다양 변주) ---

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 공통 양 울음 합성 */
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

// ── 쓰다듬기 효과음 변주 ──

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

// ── 양 울음 변주 ──

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

/** @deprecated 호환용 — 랜덤 쓰다듬기+울음 */
export function playSoundPet() {
  playRandomPetStroke();
  setTimeout(playRandomPetBaa, rand(100, 280));
}

/**
 * 쓰다듬기 랜덤 사운드 묶음 (효과음 + 울음, 매번 다른 조합)
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

  // 1) 냠냠 씹는 소리 (높은 주파수 밴드패스 필터 노이즈)
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

  // 2) 만족스러운 짧은 "메에" 소리
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

// ─── 부위별 상호작용 효과음 ───

/** 귀 간지럽히기: 높고 떨리는 당황 소리 */
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

/** 머리 쓰다듬기: 낮고 부드러운 편안한 소리 */
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

/** 얼굴 쓰다듬기: 높고 짧은 행복 "메에!♡" 소리 */
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

/** 배 긁기: 통통 긁는 만족 소리 */
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

/** 등 긁기: 졸린 낮은 릴랙스 "므르르~" 소리 */
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
 * 바리깡 공회전 모터 진동음 시작
 */
export function startClipperHum() {
  if (_clipperHumActive) return;
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  
  _clipperHumActive = true;
  
  // 모터 기본음 (낮은 주파수 톱니파)
  _clipperOsc = ctx.createOscillator();
  _clipperOsc.type = 'sawtooth';
  _clipperOsc.frequency.setValueAtTime(105, now);
  
  // 기계 떨림을 연출할 빠른 진동 LFO
  _clipperLfo = ctx.createOscillator();
  _clipperLfo.type = 'sine';
  _clipperLfo.frequency.setValueAtTime(45, now); // 45Hz
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(6, now); // ±6Hz 주파수 변조
  
  // 저역 필터로 부드럽게 깎음
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(320, now);
  
  _clipperGain = ctx.createGain();
  _clipperGain.gain.setValueAtTime(0, now);
  // 어택 효과 (점진적 켜짐)
  _clipperGain.gain.linearRampToValueAtTime(0.28, now + 0.15);
  
  // 연결
  _clipperLfo.connect(lfoGain);
  lfoGain.connect(_clipperOsc.frequency);
  
  _clipperOsc.connect(lpf);
  lpf.connect(_clipperGain);
  _clipperGain.connect(_sfxGain);
  
  _clipperOsc.start(now);
  _clipperLfo.start(now);
}

/**
 * 바리깡 공회전 모터 진동음 정지
 */
export function stopClipperHum() {
  if (!_clipperHumActive) return;
  _clipperHumActive = false;
  
  const ctx = getCtx();
  const now = ctx.currentTime;
  
  if (_clipperGain) {
    // 디케이 효과 (부드럽게 꺼짐)
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
let _shearMotion = 0; // 0~1, 포인터 속도 기반 강도

/** 털깎기 마찰음 강도 (속도 0~20px/frame 정규화) */
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

  // 거친 마찰 레이어
  const noise = createNoise(dur + 0.03);
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

  // 부드러운 솜 밀림 레이어 (속도 높을수록 두껍게)
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

/** 큰 덩어리 털이 벗겨질 때 짧은 카타르시스 팝 */
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
  { id: 'sheep',   category: 'cozy',   icon: 'sheep-icon.svg',  emoji: '🐑', name: '양 울음소리',    desc: '메에~ 부드러운 양 울음' },
  { id: 'ranch',   category: 'nature', icon: 'ranch-icon.svg',  emoji: '🌙', name: '밤의 목장',       desc: '고요한 밤 목장의 바람과 풀벌레' },
  { id: 'bugs',    category: 'nature', icon: 'bugs-icon.svg',   emoji: '🦗', name: '풀벌레 소리',     desc: '여름밤 귀뚜라미와 풀벌레' },
  { id: 'wind',    category: 'nature', icon: 'wind-icon.svg',   emoji: '🍃', name: '바람 소리',        desc: '살랑살랑 산들바람' },
  { id: 'rain',    category: 'nature', icon: 'rain-icon.svg',   emoji: '🌧️', name: '빗소리',           desc: '창문에 떨어지는 빗방울 소리' },
  { id: 'snow',    category: 'nature', icon: 'snow-icon.svg',   emoji: '❄️', name: '눈 내리는 밤',     desc: '고요한 겨울밤 눈발 소리' },
  { id: 'ocean',   category: 'nature', icon: 'ocean-icon.svg',  emoji: '🌊', name: '파도 소리',        desc: '해변에 밀려오는 잔잔한 파도' },
  { id: 'river',   category: 'nature', icon: 'river-icon.svg',  emoji: '💧', name: '시냇물',           desc: '졸졸 흐르는 맑은 시냇물' },
  { id: 'forest',  category: 'nature', icon: 'forest-icon.svg', emoji: '🌲', name: '숲속 새벽',        desc: '새벽 숲에서 들려오는 새소리' },
  { id: 'fire',    category: 'cozy',   icon: 'fire-icon.svg',   emoji: '🔥', name: '장작 타는 소리',  desc: '포근한 벽난로 장작불' },
  { id: 'fan',     category: 'focus',  icon: 'fan-icon.svg',    emoji: '🌀', name: '선풍기',           desc: '규칙적인 팬 소음으로 숙면 유도' },
  { id: 'white',   category: 'focus',  icon: 'white-icon.svg',  emoji: '⬜', name: '백색소음',         desc: '집중과 수면에 도움되는 화이트 노이즈' },
  { id: 'brown',   category: 'focus',  icon: 'brown-icon.svg',  emoji: '🟤', name: '브라운 노이즈',    desc: '더 깊고 포근한 저음 노이즈' },
  { id: 'heartbeat', category: 'focus', icon: 'heart-icon.svg', emoji: '💓', name: '심장 박동',        desc: '느린 리듬의 안정감' },
  { id: 'piano',   category: 'cozy',   icon: 'piano-icon.svg',  emoji: '🎹', name: '잔잔한 피아노',   desc: '자연과 함께하는 피아노 선율' },
  { id: 'musicbox', category: 'cozy', icon: 'box-icon.svg',    emoji: '🎠', name: '오르골',           desc: '자장가 같은 오르골 멜로디' },
  { id: 'preset_rainy',  category: 'preset', emoji: '🌧️', name: '비 오는 밤',   desc: '빗소리 + 살랑 바람 믹스' },
  { id: 'preset_cozy',   category: 'preset', emoji: '🔥', name: '포근한 난로',  desc: '장작불 + 잔잔한 바람' },
  { id: 'preset_deep',   category: 'preset', emoji: '😴', name: '깊은 잠',      desc: '브라운 노이즈 + 심장 박동' },
  { id: 'preset_starry', category: 'preset', emoji: '✨', name: '별빛 목장',    desc: '밤 목장 + 풀벌레' },
  { id: 'preset_ocean',  category: 'preset', emoji: '🌊', name: '해변의 밤',    desc: '파도 + 귀뚜라미' },
];

export function getAsmrItem(id) {
  return ASMR_LIST.find(i => i.id === id) ?? null;
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

export function getAsmrList() { return ASMR_LIST; }

let _currentAsmrId   = null;
let _asmrNodes       = [];
let _asmrScheduleId  = null;
let _asmrTimerId     = null;
let _asmrTimerEnd    = null;

export function playAsmr(id, opts = {}) {
  stopAsmr({ keepTimer: true });
  if (!isAsmrEnabled()) return;
  _currentAsmrId = id;
  _prefs.lastAsmrId = id;
  savePrefs();
  if (opts.fadeIn) _fadeInAsmrGain(2.5);
  _startAsmrById(id);
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
  _asmrTimerEnd = Date.now() + minutes * 60 * 1000;
  _asmrTimerId = setTimeout(() => {
    fadeOutAndStopAsmr(5);
    fadeOutAndStopBinaural(5);
  }, minutes * 60 * 1000);
  _prefs.asmrTimerMin = minutes;
  savePrefs();
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
    case 'sheep':  _asmrSheep();  break;
    case 'ranch':  _asmrRanch();  break;
    case 'bugs':   _asmrBugs();   break;
    case 'wind':   _asmrWind();   break;
    case 'rain':   _asmrRain();   break;
    case 'snow':   _asmrSnow();   break;
    case 'ocean':  _asmrOcean();  break;
    case 'fire':   _asmrFire();   break;
    case 'fan':    _asmrFan();    break;
    case 'forest': _asmrForest(); break;
    case 'river':  _asmrRiver();  break;
    case 'white':  _asmrWhite();  break;
    case 'brown':  _asmrBrown();  break;
    case 'heartbeat': _asmrHeartbeat(); break;
    case 'piano':  _asmrPiano();  break;
    case 'musicbox': _asmrMusicbox(); break;
    case 'preset_rainy':  _asmrPresetRainy();  break;
    case 'preset_cozy':   _asmrPresetCozy();   break;
    case 'preset_deep':   _asmrPresetDeep();   break;
    case 'preset_starry': _asmrPresetStarry(); break;
    case 'preset_ocean':  _asmrPresetOcean();  break;
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
    g.gain.linearRampToValueAtTime(0, t + 0.6);
    _registerNode(o); o.start(t); o.stop(t + 0.7);
  });
  _scheduleLoop('ranch', dur * 1000);
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

function _asmrOceanLayer(now, dur) {
  for (let w = 0; w < 5; w++) {
    const t = now + w * 4.5;
    const waveDur = 4;
    const noise = createNoise(waveDur);
    const lpf = createFilter('lowpass', 380);
    const g = createGain(0);
    noise.connect(lpf); lpf.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.26, t + 2);
    g.gain.linearRampToValueAtTime(0, t + waveDur);
    _registerNode(noise); noise.start(t); noise.stop(t + waveDur + 0.1);
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

// --- 바이노럴 비트 (ASMR과 동시 재생 가능) ---

export const BINARURAL_LIST = [
  { id: 'delta_2',  emoji: '🌙', name: '깊은 수면',  desc: '2Hz 델타 · 깊은 숙면 유도',     carrier: 200, beat: 2 },
  { id: 'delta_1',  emoji: '💤', name: '초깊은 잠',  desc: '1Hz 델타 · 아주 느린 뇌파',     carrier: 180, beat: 1 },
  { id: 'theta_6',  emoji: '🧘', name: '이완',       desc: '6Hz 세타 · 몸과 마음 풀기',     carrier: 220, beat: 6 },
  { id: 'theta_4',  emoji: '😌', name: '명상',       desc: '4Hz 세타 · 호흡에 집중',        carrier: 210, beat: 4 },
  { id: 'alpha_10', emoji: '☁️', name: '안정',       desc: '10Hz 알파 · 긴장 완화',         carrier: 240, beat: 10 },
];

let _binauralOscL = null;
let _binauralOscR = null;
let _currentBinauralId = null;

const BINARURAL_MAX_GAIN = 0.38;

function _binauralTargetGain() {
  return (getBinauralVolume() / 100) * BINARURAL_MAX_GAIN;
}

function _applyBinauralGain() {
  if (!_binauralGain) return;
  _binauralGain.gain.value = _currentBinauralId ? _binauralTargetGain() : 0;
}

export function getBinauralList() { return BINARURAL_LIST; }

export function getBinauralItem(id) {
  return BINARURAL_LIST.find(i => i.id === id) ?? null;
}

export function getBinauralVolume() {
  const v = _prefs.binauralVol ?? 25;
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

// --- 공유 블록 ---

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

// ─── BGM (오르골 배경음악) ───

// 잠자기 좋은 오르골 멜로디 노트 배열 (주파수, 박자길이)
// C장조 계열의 잔잔한 멜로디
const BGM_MELODY = [
  // 1절: 자장가 느낌의 C장조 선율
  [523.25, 0.5], [659.25, 0.5], [783.99, 0.5], [659.25, 0.5],
  [783.99, 0.5], [880.00, 0.5], [1046.5, 1.0],
  [880.00, 0.5], [783.99, 0.5], [659.25, 0.5], [523.25, 0.5],
  [392.00, 0.5], [440.00, 0.5], [523.25, 1.5],
  // 2절: 조금 더 높게
  [659.25, 0.5], [783.99, 0.5], [880.00, 0.5], [783.99, 0.5],
  [659.25, 0.5], [587.33, 0.5], [523.25, 1.0],
  [440.00, 0.5], [523.25, 0.5], [587.33, 0.5], [523.25, 0.5],
  [493.88, 0.5], [440.00, 0.5], [392.00, 1.5],
  // 3절: 마무리
  [523.25, 0.5], [587.33, 0.5], [659.25, 0.5], [587.33, 0.5],
  [523.25, 0.5], [493.88, 0.5], [440.00, 1.0],
  [392.00, 0.5], [440.00, 0.5], [493.88, 0.5], [523.25, 0.5],
  [659.25, 0.5], [783.99, 0.5], [523.25, 2.0],
];

const BGM_BPM = 72; // 느리고 잔잔하게
const BGM_BEAT_SEC = 60 / BGM_BPM;

let _bgmRunning = false;
let _bgmTimeout = null;
let _bgmNodes = [];

/**
 * 오르골 단일 노트 합성
 * 오르골 특성: 즉각적인 어택, 사인파+약간의 배음, 빠른 감쇠
 */
function _playMusicBoxNote(ctx, freq, startTime, duration) {
  if (!_bgmGain) return;

  // 기본 사인파 (오르골의 맑은 음색)
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;

  // 2배음 (약하게, 오르골 특유의 따듯한 배음)
  const osc2 = ctx.createOscillator();
  const env2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;

  // 3배음 (매우 약하게)
  const osc3 = ctx.createOscillator();
  const env3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.value = freq * 3;

  osc.connect(env);   env.connect(_bgmGain);
  osc2.connect(env2); env2.connect(_bgmGain);
  osc3.connect(env3); env3.connect(_bgmGain);

  const attackTime = 0.005; // 오르골의 즉각적인 어택
  const decayTime  = Math.min(duration * 0.85, 1.8); // 오르골 특유의 긴 여운

  // 기본음 엔벨로프
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(0.7, startTime + attackTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

  // 2배음 엔벨로프 (더 빨리 감쇠)
  env2.gain.setValueAtTime(0, startTime);
  env2.gain.linearRampToValueAtTime(0.2, startTime + attackTime);
  env2.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.5);

  // 3배음 엔벨로프 (가장 빨리 감쇠)
  env3.gain.setValueAtTime(0, startTime);
  env3.gain.linearRampToValueAtTime(0.06, startTime + attackTime);
  env3.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.25);

  const stopAt = startTime + decayTime + 0.05;
  osc.start(startTime);  osc.stop(stopAt);
  osc2.start(startTime); osc2.stop(stopAt * 0.6);
  osc3.start(startTime); osc3.stop(stopAt * 0.3);

  _bgmNodes.push(osc, env, osc2, env2, osc3, env3);
}

/**
 * 오르골 배경음악 한 사이클 재생
 */
function _playBgmCycle() {
  if (!_bgmRunning || !isBgmEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime + 0.05; // 약간의 여유

  let t = now;
  let totalDuration = 0;
  BGM_MELODY.forEach(([freq, beats]) => {
    const dur = beats * BGM_BEAT_SEC;
    _playMusicBoxNote(ctx, freq, t, dur);
    t += dur;
    totalDuration += dur;
  });

  // 마지막 노트 이후 잠시 쉬었다가 다시 반복 (자연스러운 루프)
  const loopAfter = (totalDuration + 2.0) * 1000;
  _bgmTimeout = setTimeout(() => {
    // 이전 노드 정리
    _bgmNodes.forEach(n => { try { n.disconnect(); } catch(e) {} });
    _bgmNodes = [];
    if (_bgmRunning && isBgmEnabled()) _playBgmCycle();
  }, loopAfter);
}

/** 오르골 배경음악 시작 */
export function startBgm() {
  if (_bgmRunning) return;
  if (!isBgmEnabled()) return;
  _bgmRunning = true;
  _playBgmCycle();
}

/** 오르골 배경음악 정지 */
export function stopBgm() {
  _bgmRunning = false;
  clearTimeout(_bgmTimeout);
  _bgmNodes.forEach(n => { try { n.stop(); } catch(e) {} try { n.disconnect(); } catch(e) {} });
  _bgmNodes = [];
}

/** 현재 BGM 재생 중 여부 */
export function isBgmPlaying() { return _bgmRunning; }

let _morningAlarmRunning = false;
let _morningAlarmTimeout = null;
let _morningAlarmNodes = [];

/**
 * 모닝콜 알람: 잔잔한 오르골 아르페지오 + 드리미 "메에~" 반복
 */
export function playMorningCallAlarm() {
  if (!isSfxEnabled()) return;
  stopMorningCallAlarm();
  _morningAlarmRunning = true;
  _playMorningAlarmCycle();
}

function _playSheepBaa(ctx, startTime) {
  const o = ctx.createOscillator();
  const g = createGain(0);
  o.type = 'sine';
  o.frequency.setValueAtTime(520, startTime);
  o.frequency.linearRampToValueAtTime(780, startTime + 0.08);
  o.frequency.exponentialRampToValueAtTime(420, startTime + 0.45);
  o.connect(g);
  g.connect(_sfxGain);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
  o.start(startTime);
  o.stop(startTime + 0.55);
  _morningAlarmNodes.push(o, g);
}

function _playMorningChime(ctx, startTime) {
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const t = startTime + i * 0.18;
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'triangle';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(_sfxGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.start(t);
    o.stop(t + 0.95);
    _morningAlarmNodes.push(o, g);
  });
}

function _playMorningAlarmCycle() {
  if (!_morningAlarmRunning || !isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime + 0.05;
  _playMorningChime(ctx, now);
  _playSheepBaa(ctx, now + 0.55);
  _playSheepBaa(ctx, now + 1.15);

  _morningAlarmTimeout = setTimeout(() => {
    _morningAlarmNodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
    _morningAlarmNodes = [];
    if (_morningAlarmRunning) _playMorningAlarmCycle();
  }, 2800);
}

/** 모닝콜 알람 정지 */
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