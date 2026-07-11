/**
 * sound.js - Sleepy Sheep ?ъ슫???쒖뒪?? * Web Audio API瑜??ъ슜???꾨줈?쒖????ъ슫???⑹꽦
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
  { id: 'preset_rainy', category: 'preset', emoji: '🌧️', name: '비 오는 밤', desc: '빗소리와 부드러운 바람 믹스' },
  { id: 'preset_ocean', category: 'preset', emoji: '🌊', name: '해변의 밤', desc: '파도와 먼 풀벌레가 섞인 밤바다' },
  { id: 'preset_cottage', category: 'preset', emoji: '🏕️', name: '밤의 산장', desc: '장작불, 바람, 밤벌레가 있는 산장' },
  { id: 'preset_zen', category: 'preset', emoji: '🪷', name: '젠 가든', desc: '물소리, 바람종, 작은 종소리' },
  { id: 'preset_study', category: 'preset', emoji: '✏️', name: '조용한 필기방', desc: '연필, 책장, 잔잔한 실내 공기' },
  { id: 'preset_traditional', category: 'preset', emoji: '🎐', name: '전통 악기 명상', desc: '동아시아 현악기와 부드러운 공간감' },
  { id: 'preset_cozy', category: 'preset', emoji: '🔥', name: '포근한 난로', desc: '장작불과 잔잔한 바람' },
  { id: 'preset_deep', category: 'preset', emoji: '😴', name: '깊은 잠', desc: '브라운 노이즈와 느린 심장 박동' },
  { id: 'preset_starry', category: 'preset', emoji: '✨', name: '별빛 목장', desc: '밤 목장, 풀벌레, 먼 양 울음' },
  { id: 'rain', category: 'nature', emoji: '🌧️', name: '빗소리', desc: '창문에 부딪히는 촉촉한 비' },
  { id: 'ocean', category: 'nature', emoji: '🌊', name: '바다소리', desc: '멀리서 밀려오는 낮은 파도' },
  { id: 'river', category: 'nature', emoji: '💧', name: '시냇물', desc: '작게 흐르는 맑은 물소리' },
  { id: 'water', category: 'nature', emoji: '🚿', name: '잔잔한 물소리', desc: '작은 물방울과 흐르는 물' },
  { id: 'forest', category: 'nature', emoji: '🌲', name: '숲속 새벽', desc: '새소리와 나뭇잎이 섞인 숲' },
  { id: 'birds', category: 'nature', emoji: '🐦', name: '시골 새소리', desc: '멀리 들리는 아침 새소리' },
  { id: 'bugs', category: 'nature', emoji: '🦗', name: '풀벌레', desc: '여름밤 귀뚜라미와 풀벌레' },
  { id: 'wind', category: 'nature', emoji: '🍃', name: '바람소리', desc: '커튼을 스치는 부드러운 바람' },
  { id: 'snow', category: 'nature', emoji: '❄️', name: '눈 내리는 밤', desc: '고요한 겨울밤의 공기' },
  { id: 'fire', category: 'cozy', emoji: '🔥', name: '장작불', desc: '작게 타닥이는 벽난로' },
  { id: 'cottage', category: 'cozy', emoji: '🏕️', name: '밤의 산장', desc: '산장 안팎의 밤 공기' },
  { id: 'sheep', category: 'cozy', emoji: '🐑', name: '양 울음소리', desc: '멀리서 들리는 부드러운 양 울음' },
  { id: 'ranch', category: 'cozy', emoji: '🌙', name: '밤 목장', desc: '목장 바람과 풀벌레' },
  { id: 'fan', category: 'focus', emoji: '🌀', name: '선풍기', desc: '규칙적인 실내 바람' },
  { id: 'pencil', category: 'texture', emoji: '✏️', name: '연필 필기', desc: '종이 위를 사각이는 연필' },
  { id: 'brush', category: 'texture', emoji: '🖌️', name: '붓질', desc: '붓이 종이를 스치는 부드러운 소리' },
  { id: 'chalk', category: 'texture', emoji: '🧑‍🏫', name: '분필', desc: '칠판에 작게 쓰는 분필 소리' },
  { id: 'pages', category: 'texture', emoji: '📖', name: '책장 넘김', desc: '책장을 사락사락 넘기는 소리' },
  { id: 'white', category: 'focus', emoji: '▫️', name: '화이트 노이즈', desc: '집중과 수면을 돕는 밝은 노이즈' },
  { id: 'brown', category: 'focus', emoji: '🟫', name: '브라운 노이즈', desc: '낮고 포근한 깊은 노이즈' },
  { id: 'heartbeat', category: 'focus', emoji: '💗', name: '심장 박동', desc: '느린 리듬의 안정감' },
  { id: 'piano', category: 'music', emoji: '🎹', name: '잔잔한 피아노', desc: '느린 수면용 피아노 음색' },
  { id: 'musicbox', category: 'music', emoji: '🎠', name: '오르골', desc: '자장가 같은 작은 오르골' },
  { id: 'kalimba', category: 'music', emoji: '🎶', name: '칼림바', desc: '맑고 짧게 울리는 엄지 피아노' },
  { id: 'koto', category: 'music', emoji: '🎐', name: '고토풍 현악기', desc: '일본 정원 느낌의 뜯는 현악기' },
  { id: 'gayageum', category: 'music', emoji: '🪕', name: '가야금풍 현악기', desc: '한국 전통 현악기 느낌의 평온한 선율' },
  { id: 'zen_garden', category: 'music', emoji: '🪷', name: '젠 가든', desc: '물, 바람종, 종소리의 명상 테마' },
  { id: 'tingle_soft', category: 'texture', emoji: '✨', name: '부드러운 팅글', desc: '작은 고주파 펄스가 간질이는 느낌' },
  { id: 'tingle_bell', category: 'texture', emoji: '🔔', name: '종소리 팅글', desc: '짧고 반짝이는 벨 텍스처' },
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
    case 'water':  _asmrWater();  break;
    case 'birds':  _asmrBirds();  break;
    case 'fire':   _asmrFire();   break;
    case 'cottage': _asmrCottage(); break;
    case 'fan':    _asmrFan();    break;
    case 'forest': _asmrForest(); break;
    case 'river':  _asmrRiver();  break;
    case 'pencil': _asmrPencil(); break;
    case 'brush':  _asmrBrush();  break;
    case 'chalk':  _asmrChalk();  break;
    case 'pages':  _asmrPages();  break;
    case 'white':  _asmrWhite();  break;
    case 'brown':  _asmrBrown();  break;
    case 'heartbeat': _asmrHeartbeat(); break;
    case 'piano':  _asmrPiano();  break;
    case 'musicbox': _asmrMusicbox(); break;
    case 'kalimba': _asmrKalimba(); break;
    case 'koto': _asmrKoto(); break;
    case 'gayageum': _asmrGayageum(); break;
    case 'zen_garden': _asmrZenGarden(); break;
    case 'preset_rainy':  _asmrPresetRainy();  break;
    case 'preset_cozy':   _asmrPresetCozy();   break;
    case 'preset_deep':   _asmrPresetDeep();   break;
    case 'preset_starry': _asmrPresetStarry(); break;
    case 'preset_ocean':  _asmrPresetOcean();  break;
    case 'preset_cottage': _asmrPresetCottage(); break;
    case 'preset_zen': _asmrPresetZen(); break;
    case 'preset_study': _asmrPresetStudy(); break;
    case 'preset_traditional': _asmrPresetTraditional(); break;
    case 'tingle_soft': _asmrTingleSoft(); break;
    case 'tingle_bell': _asmrTingleBell(); break;
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
  _asmrRiverLayer(now, dur, 0.12);
  _addSoftWind(now, dur, 0.08);
  _addZenBells(now, dur, 5, 0.08);
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
    const g = createGain(0);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rand(700, 1200), t);
    osc.frequency.exponentialRampToValueAtTime(rand(280, 460), t + 0.12);
    osc.connect(g); g.connect(_asmrtGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * rand(0.4, 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.12, 0.24));
    _registerNode(osc); osc.start(t); osc.stop(t + 0.28);
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
  { id: 'delta_2',  emoji: '🌙', name: '깊은 수면',   desc: '2Hz 델타, 깊은 수면 유도', carrier: 200, beat: 2 },
  { id: 'delta_1',  emoji: '🌌', name: '초저속 델타', desc: '1Hz 델타, 아주 느린 뇌파', carrier: 180, beat: 1 },
  { id: 'theta_6',  emoji: '🫧', name: '이완',        desc: '6Hz 세타, 몸과 마음 풀기', carrier: 220, beat: 6 },
  { id: 'theta_4',  emoji: '🧘', name: '명상',        desc: '4Hz 세타, 잔잔한 집중', carrier: 210, beat: 4 },
  { id: 'alpha_10', emoji: '🌤️', name: '안정',       desc: '10Hz 알파, 긴장 완화', carrier: 240, beat: 10 },
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

export function getBinauralList() { return BINARURAL_LIST; }

export function getBinauralItem(id) {
  return BINARURAL_LIST.find(i => i.id === id) ?? null;
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

// ??? BGM (?ㅻⅤ怨?諛곌꼍?뚯븙) ???

// ?좎옄湲?醫뗭? ?ㅻⅤ怨?硫쒕줈???명듃 諛곗뿴 (二쇳뙆?? 諛뺤옄湲몄씠)
const BGM_MELODY = [
  // 1?? ?먯옣媛 ?먮굦??C?μ“ ?좎쑉
  [523.25, 0.5], [659.25, 0.5], [783.99, 0.5], [659.25, 0.5],
  [783.99, 0.5], [880.00, 0.5], [1046.5, 1.0],
  [880.00, 0.5], [783.99, 0.5], [659.25, 0.5], [523.25, 0.5],
  [392.00, 0.5], [440.00, 0.5], [523.25, 1.5],
  // 2?? 議곌툑 ???믨쾶
  [659.25, 0.5], [783.99, 0.5], [880.00, 0.5], [783.99, 0.5],
  [659.25, 0.5], [587.33, 0.5], [523.25, 1.0],
  [440.00, 0.5], [523.25, 0.5], [587.33, 0.5], [523.25, 0.5],
  [493.88, 0.5], [440.00, 0.5], [392.00, 1.5],
  // 3?? 留덈Т由?  [523.25, 0.5], [587.33, 0.5], [659.25, 0.5], [587.33, 0.5],
  [523.25, 0.5], [493.88, 0.5], [440.00, 1.0],
  [392.00, 0.5], [440.00, 0.5], [493.88, 0.5], [523.25, 0.5],
  [659.25, 0.5], [783.99, 0.5], [523.25, 2.0],
];

const BGM_BPM = 72; // ?먮━怨??붿옍?섍쾶
const BGM_BEAT_SEC = 60 / BGM_BPM;

let _bgmRunning = false;
let _bgmTimeout = null;
let _bgmNodes = [];

/**
 * ?ㅻⅤ怨??⑥씪 ?명듃 ?⑹꽦
 * ?ㅻⅤ怨??뱀꽦: 利됯컖?곸씤 ?댄깮, ?ъ씤???쎄컙??諛곗쓬, 鍮좊Ⅸ 媛먯뇿
 */
function _playMusicBoxNote(ctx, freq, startTime, duration) {
  if (!_bgmGain) return;

  // 湲곕낯 ?ъ씤??(?ㅻⅤ怨⑥쓽 留묒? ?뚯깋)
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;

  // 2諛곗쓬 (?쏀븯寃? ?ㅻⅤ怨??뱀쑀???곕벏??諛곗쓬)
  const osc2 = ctx.createOscillator();
  const env2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;

  // 3諛곗쓬 (留ㅼ슦 ?쏀븯寃?
  const osc3 = ctx.createOscillator();
  const env3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.value = freq * 3;

  osc.connect(env);   env.connect(_bgmGain);
  osc2.connect(env2); env2.connect(_bgmGain);
  osc3.connect(env3); env3.connect(_bgmGain);

  const attackTime = 0.005; // ?ㅻⅤ怨⑥쓽 利됯컖?곸씤 ?댄깮
  const decayTime  = Math.min(duration * 0.85, 1.8); // ?ㅻⅤ怨??뱀쑀??湲??ъ슫

  // 湲곕낯???붾꺼濡쒗봽
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(0.7, startTime + attackTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

  // 2諛곗쓬 ?붾꺼濡쒗봽 (??鍮⑤━ 媛먯뇿)
  env2.gain.setValueAtTime(0, startTime);
  env2.gain.linearRampToValueAtTime(0.2, startTime + attackTime);
  env2.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.5);

  // 3諛곗쓬 ?붾꺼濡쒗봽 (媛??鍮⑤━ 媛먯뇿)
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

/** ?ㅻⅤ怨?諛곌꼍?뚯븙 ?쒖옉 */
export function startBgm() {
  if (_bgmRunning) return;
  if (!isBgmEnabled()) return;
  _bgmRunning = true;
  _playBgmCycle();
}

/** ?ㅻⅤ怨?諛곌꼍?뚯븙 ?뺤? */
export function stopBgm() {
  _bgmRunning = false;
  clearTimeout(_bgmTimeout);
  _bgmNodes.forEach(n => { try { n.stop(); } catch(e) {} try { n.disconnect(); } catch(e) {} });
  _bgmNodes = [];
}

/** ?꾩옱 BGM ?ъ깮 以??щ? */
export function isBgmPlaying() { return _bgmRunning; }

let _morningAlarmRunning = false;
let _morningAlarmTimeout = null;
let _morningAlarmNodes = [];

/**
 * 紐⑤떇肄??뚮엺: ?붿옍???ㅻⅤ怨??꾨Ⅴ?섏???+ ?쒕━誘?"硫붿뿉~" 諛섎났
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
