/**
 * sound.js - Sleepy Sheep 사운드 시스템
 * Web Audio API를 사용한 프로시저럴 사운드 합성
 */

let _ctx = null;
let _masterGain = null;
let _sfxGain = null;
let _asmrtGain = null;

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
export function getSfxVolume()  { return _prefs.sfxVol  ?? 0.9; }
export function getAsmrVolume() { return _prefs.asmrVol ?? 0.6; }
export function isSfxEnabled()  { return _prefs.sfxOn  !== false; }
export function isAsmrEnabled() { return _prefs.asmrOn !== false; }
export function setSfxEnabled(v)  { _prefs.sfxOn  = v; savePrefs(); }
export function setAsmrEnabled(v) { _prefs.asmrOn = v; savePrefs(); }

function syncVolumes() {
  if (_sfxGain)   _sfxGain.gain.value   = getSfxVolume();
  if (_asmrtGain) _asmrtGain.gain.value  = getAsmrVolume();
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

export function playSoundPet() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const count = Math.floor(rand(2, 4));
  for (let i = 0; i < count; i++) {
    const t = now + i * rand(0.08, 0.14);
    const dur = rand(0.18, 0.32);
    const noise = createNoise(dur + 0.05);
    const lpf   = createFilter('lowpass', rand(800, 1600));
    const hpf   = createFilter('highpass', rand(200, 500));
    const env   = createGain(0);
    const pan   = ctx.createStereoPanner();
    pan.pan.value = rand(-0.4, 0.4);
    noise.connect(lpf); lpf.connect(hpf); hpf.connect(env); env.connect(pan); pan.connect(_sfxGain);
    const vol = rand(0.25, 0.45);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + dur * 0.2);
    env.gain.linearRampToValueAtTime(vol * 0.6, t + dur * 0.7);
    env.gain.linearRampToValueAtTime(0, t + dur);
    noise.start(t); noise.stop(t + dur + 0.02);
  }
}

export function playSoundFeed() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const bites = Math.floor(rand(3, 6));
  for (let i = 0; i < bites; i++) {
    const t   = now + i * rand(0.12, 0.22);
    const dur = rand(0.06, 0.12);
    const noise = createNoise(dur + 0.05);
    const bpf   = createFilter('bandpass', rand(600, 2200), rand(2, 5));
    const env   = createGain(0);
    noise.connect(bpf); bpf.connect(env); env.connect(_sfxGain);
    const vol = rand(0.3, 0.55);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.start(t); noise.stop(t + dur + 0.02);
  }
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

let _shearNoiseTimeout = null;
let _shearIsActive = false;

export function startShearSound() {
  if (_shearIsActive) return;
  _shearIsActive = true;
  _loopShearTick();
}

function _loopShearTick() {
  if (!_shearIsActive || !isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const dur = 0.07;
  const noise = createNoise(dur + 0.02);
  const bpf1  = createFilter('bandpass', rand(3000, 5000), 2);
  const lpf   = createFilter('lowpass',  rand(6000, 9000));
  const env   = createGain(0);
  noise.connect(bpf1); bpf1.connect(lpf); lpf.connect(env); env.connect(_sfxGain);
  const vol = rand(0.35, 0.55);
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(vol, now + 0.01);
  env.gain.linearRampToValueAtTime(vol * 0.8, now + dur * 0.6);
  env.gain.linearRampToValueAtTime(0, now + dur);
  noise.start(now); noise.stop(now + dur + 0.02);
  _shearNoiseTimeout = setTimeout(_loopShearTick, dur * 1000 + rand(5, 20));
}

export function stopShearSound() {
  _shearIsActive = false;
  clearTimeout(_shearNoiseTimeout);
  _shearNoiseTimeout = null;
}

// --- ASMR ---

export const ASMR_LIST = [
  { id: 'sheep',   icon: 'sheep-icon.svg',  emoji: '🐑', name: '양 울음소리',    desc: '메에~ 부드러운 양 울음' },
  { id: 'ranch',   icon: 'ranch-icon.svg',  emoji: '🌙', name: '밤의 목장',       desc: '고요한 밤 목장의 바람과 풀벌레' },
  { id: 'bugs',    icon: 'bugs-icon.svg',   emoji: '🦗', name: '풀벌레 소리',     desc: '여름밤 귀뚜라미와 풀벌레' },
  { id: 'wind',    icon: 'wind-icon.svg',   emoji: '🍃', name: '바람 소리',        desc: '살랑살랑 산들바람' },
  { id: 'rain',    icon: 'rain-icon.svg',   emoji: '🌧️', name: '빗소리',           desc: '창문에 떨어지는 빗방울 소리' },
  { id: 'fire',    icon: 'fire-icon.svg',   emoji: '🔥', name: '장작 타는 소리',  desc: '포근한 벽난로 장작불' },
  { id: 'forest',  icon: 'forest-icon.svg', emoji: '🌲', name: '숲속 새벽',        desc: '새벽 숲에서 들려오는 새소리' },
  { id: 'river',   icon: 'river-icon.svg',  emoji: '💧', name: '시냇물',           desc: '졸졸 흐르는 맑은 시냇물' },
  { id: 'white',   icon: 'white-icon.svg',  emoji: '⬜', name: '백색소음',         desc: '집중과 수면에 도움되는 화이트 노이즈' },
  { id: 'piano',   icon: 'piano-icon.svg',  emoji: '🎹', name: '잔잔한 피아노',   desc: '자연과 함께하는 피아노 선율' },
];

export function getAsmrList() { return ASMR_LIST; }

let _currentAsmrId   = null;
let _asmrNodes       = [];
let _asmrScheduleId  = null;

export function playAsmr(id) {
  stopAsmr();
  if (!isAsmrEnabled()) return;
  _currentAsmrId = id;
  _startAsmrById(id);
}

export function stopAsmr() {
  _currentAsmrId = null;
  clearTimeout(_asmrScheduleId);
  _asmrNodes.forEach(n => {
    try { n.stop(); } catch(e) {}
    try { n.disconnect(); } catch(e) {}
  });
  _asmrNodes = [];
}

export function getCurrentAsmrId() { return _currentAsmrId; }

function _registerNode(node) { _asmrNodes.push(node); return node; }

function _startAsmrById(id) {
  switch(id) {
    case 'sheep':  _asmrSheep();  break;
    case 'ranch':  _asmrRanch();  break;
    case 'bugs':   _asmrBugs();   break;
    case 'wind':   _asmrWind();   break;
    case 'rain':   _asmrRain();   break;
    case 'fire':   _asmrFire();   break;
    case 'forest': _asmrForest(); break;
    case 'river':  _asmrRiver();  break;
    case 'white':  _asmrWhite();  break;
    case 'piano':  _asmrPiano();  break;
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

export function initSound() {
  syncVolumes();
}

export function resumeAudio() {
  if (_ctx && _ctx.state === 'suspended') {
    _ctx.resume();
  }
}