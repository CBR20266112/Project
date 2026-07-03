/**
 * sound.js - Sleepy Sheep 사운드 시스템
 * Web Audio API를 사용한 프로시저럴 사운드 합성
 */

let _ctx = null;
let _masterGain = null;
let _sfxGain = null;
let _asmrtGain = null;
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

/**
 * 양 쓰다듬기 소리: 귀여운 "뾱뾱" pitch glide + "메에~" 양 울음 혼합
 */
export function playSoundPet() {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;

  // 1) 뾱뾱 (짧은 pitch glide 연속)
  const boingCount = Math.floor(rand(2, 4));
  for (let i = 0; i < boingCount; i++) {
    const t = now + i * rand(0.07, 0.13);
    const o = ctx.createOscillator();
    const g = createGain(0);
    o.type = 'sine';
    const startFreq = rand(900, 1400);
    o.frequency.setValueAtTime(startFreq * 0.6, t);
    o.frequency.linearRampToValueAtTime(startFreq, t + 0.025);
    o.frequency.exponentialRampToValueAtTime(startFreq * 0.4, t + 0.18);
    o.connect(g); g.connect(_sfxGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.3, 0.45), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.start(t); o.stop(t + 0.22);
  }

  // 2) 뒤따라 나오는 양 울음 "메에~"
  const maaTime = now + boingCount * 0.1 + rand(0.05, 0.12);
  const maaDur  = rand(0.38, 0.58);
  const baseFreq = rand(310, 370);
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const maaGain = createGain(0);
  o1.type = 'sawtooth';
  o2.type = 'sine';
  o1.frequency.setValueAtTime(baseFreq, maaTime);
  o1.frequency.linearRampToValueAtTime(baseFreq * 1.18, maaTime + 0.07);
  o1.frequency.exponentialRampToValueAtTime(baseFreq * 0.88, maaTime + maaDur);
  o2.frequency.setValueAtTime(baseFreq * 2.02, maaTime);
  o2.frequency.linearRampToValueAtTime(baseFreq * 2.35, maaTime + 0.07);
  o2.frequency.exponentialRampToValueAtTime(baseFreq * 1.75, maaTime + maaDur);
  const lpf = createFilter('lowpass', 900, 2);
  o1.connect(lpf); o2.connect(lpf); lpf.connect(maaGain); maaGain.connect(_sfxGain);
  maaGain.gain.setValueAtTime(0, maaTime);
  maaGain.gain.linearRampToValueAtTime(0.28, maaTime + 0.04);
  maaGain.gain.setValueAtTime(0.22, maaTime + maaDur * 0.7);
  maaGain.gain.linearRampToValueAtTime(0, maaTime + maaDur);
  o1.start(maaTime); o1.stop(maaTime + maaDur + 0.05);
  o2.start(maaTime); o2.stop(maaTime + maaDur + 0.05);
}

/**
 * 먹이주기 소리: 냠냠 씹어먹는 소리 + 짧고 만족스러운 "메에~"
 */
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

export function initSound() {
  syncVolumes();
}

export function resumeAudio() {
  if (_ctx && _ctx.state === 'suspended') {
    _ctx.resume();
  }
}