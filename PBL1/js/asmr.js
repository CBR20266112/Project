/**
 * asmr.js - ASMR UI 공통 바인딩
 */
import {
  resumeAudio,
  getAsmrList,
  getAsmrItem,
  playAsmr,
  stopAsmr,
  getCurrentAsmrId,
  setAsmrSleepTimer,
  clearAsmrSleepTimer,
  getAsmrTimerMinutesLeft,
  getAsmrSleepTimerMinutes,
  isAsmrSleepAutoplay,
  setAsmrSleepAutoplay,
  getBinauralList,
  getBinauralItem,
  playBinaural,
  stopBinaural,
  getCurrentBinauralId,
  getBinauralVolume,
  setBinauralVolume,
} from './sound.js';

export const ASMR_CATEGORIES = [
  { id: 'all',    label: '전체' },
  { id: 'preset', label: '추천 믹스' },
  { id: 'nature', label: '자연' },
  { id: 'cozy',   label: '포근함' },
  { id: 'focus',  label: '집중·수면' },
];

export const ASMR_TIMER_OPTIONS = [
  { min: 15, label: '15분' },
  { min: 30, label: '30분' },
  { min: 60, label: '60분' },
  { min: 0,  label: '끄기' },
];

function filterAsmrList(category) {
  const list = getAsmrList();
  if (!category || category === 'all') return list;
  return list.filter(i => i.category === category);
}

export function createAsmrCard(item) {
  const card = document.createElement('div');
  card.className = 'asmr-card';
  card.dataset.id = item.id;
  card.innerHTML = `
    <div class="asmr-emoji">${item.emoji}</div>
    <div class="asmr-name">${item.name}</div>
    <div class="asmr-desc">${item.desc}</div>
    <div class="asmr-badge">▶ 재생 중</div>
  `;
  card.addEventListener('click', () => {
    resumeAudio();
    const cur = getCurrentAsmrId();
    if (cur === item.id) {
      stopAsmr();
      updateNowPlayingBar(null);
    } else {
      playAsmr(item.id);
      updateNowPlayingBar(item);
    }
    syncAsmrPlayingState();
    document.dispatchEvent(new CustomEvent('ss-asmr-change'));
  });
  return card;
}

export function createAsmrChip(item, { compact = false } = {}) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = compact ? 'asmr-chip-compact' : 'home-asmr-chip';
  chip.dataset.id = item.id;
  chip.innerHTML = compact
    ? `<span class="emoji">${item.emoji}</span>`
    : `<span class="emoji">${item.emoji}</span><span>${item.name}</span>`;
  chip.title = item.name;
  chip.addEventListener('click', () => {
    resumeAudio();
    if (getCurrentAsmrId() === item.id) stopAsmr();
    else playAsmr(item.id);
    syncAsmrPlayingState();
    const bar = document.getElementById('now-playing-bar');
    if (bar) updateNowPlayingBar(getAsmrItem(getCurrentAsmrId()));
    document.dispatchEvent(new CustomEvent('ss-asmr-change'));
  });
  return chip;
}

let _nowPlayingEls = null;

export function registerNowPlayingBar(els) {
  _nowPlayingEls = els;
  const cur = getCurrentAsmrId();
  updateNowPlayingBar(cur ? getAsmrItem(cur) : null);
}

export function updateNowPlayingBar(item) {
  if (!_nowPlayingEls) return;
  const { bar, icon, name, bars, btnStop } = _nowPlayingEls;
  if (!bar) return;
  if (item) {
    bar.classList.remove('idle');
    if (icon) icon.textContent = item.emoji;
    if (name) name.textContent = item.name;
    bars?.forEach(b => b.classList.remove('paused'));
    if (btnStop) btnStop.style.display = '';
  } else {
    bar.classList.add('idle');
    if (icon) icon.textContent = '🔇';
    if (name) name.textContent = '재생 중인 사운드 없음';
    bars?.forEach(b => b.classList.add('paused'));
    if (btnStop) btnStop.style.display = 'none';
  }
}

export function syncAsmrPlayingState(root = document) {
  const cur = getCurrentAsmrId();
  root.querySelectorAll('.asmr-card, .home-asmr-chip, .asmr-chip-compact').forEach(el => {
    el.classList.toggle('playing', el.dataset.id === cur);
  });
}

export function syncBinauralPlayingState(root = document) {
  const cur = getCurrentBinauralId();
  root.querySelectorAll('.binaural-card, .binaural-chip').forEach(el => {
    el.classList.toggle('playing', el.dataset.id === cur);
  });
}

export function createBinauralCard(item) {
  const card = document.createElement('div');
  card.className = 'asmr-card binaural-card';
  card.dataset.id = item.id;
  card.innerHTML = `
    <div class="asmr-emoji">${item.emoji}</div>
    <div class="asmr-name">${item.name}</div>
    <div class="asmr-desc">${item.desc}</div>
    <div class="asmr-badge">▶ 재생 중</div>
  `;
  card.addEventListener('click', () => {
    resumeAudio();
    if (getCurrentBinauralId() === item.id) {
      stopBinaural();
      updateBinauralNowBar(null);
    } else {
      playBinaural(item.id);
      updateBinauralNowBar(item);
    }
    syncBinauralPlayingState();
    document.dispatchEvent(new CustomEvent('ss-binaural-change'));
  });
  return card;
}

export function createBinauralChip(item) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'home-asmr-chip binaural-chip';
  chip.dataset.id = item.id;
  chip.innerHTML = `<span class="emoji">${item.emoji}</span><span>${item.name}</span>`;
  chip.title = item.desc;
  chip.addEventListener('click', () => {
    resumeAudio();
    if (getCurrentBinauralId() === item.id) stopBinaural();
    else playBinaural(item.id);
    syncBinauralPlayingState();
    document.dispatchEvent(new CustomEvent('ss-binaural-change'));
  });
  return chip;
}

let _binauralNowEls = null;

export function registerBinauralNowBar(els) {
  _binauralNowEls = els;
  const cur = getCurrentBinauralId();
  updateBinauralNowBar(cur ? getBinauralItem(cur) : null);
}

export function updateBinauralNowBar(item) {
  if (!_binauralNowEls) return;
  const { bar, label, btnStop } = _binauralNowEls;
  if (!bar) return;
  if (item) {
    bar.classList.remove('idle');
    if (label) label.textContent = `${item.emoji} ${item.name} · ${item.beat}Hz`;
    if (btnStop) btnStop.style.display = '';
  } else {
    bar.classList.add('idle');
    if (label) label.textContent = '바이노럴 비트 꺼짐';
    if (btnStop) btnStop.style.display = 'none';
  }
}

export function bindBinauralVolume(slider, labelEl) {
  if (!slider) return;
  slider.min = '1';
  slider.max = '100';
  slider.step = '1';
  slider.value = String(getBinauralVolume());
  if (labelEl) labelEl.textContent = String(getBinauralVolume());
  slider.addEventListener('input', () => {
    resumeAudio();
    const v = parseInt(slider.value, 10);
    setBinauralVolume(v);
    if (labelEl) labelEl.textContent = String(v);
  });
}

export function bindBinauralStop(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    resumeAudio();
    stopBinaural();
    updateBinauralNowBar(null);
    syncBinauralPlayingState();
    document.dispatchEvent(new CustomEvent('ss-binaural-change'));
  });
}

export function renderBinauralGrid(gridEl) {
  if (!gridEl) return;
  gridEl.innerHTML = '';
  getBinauralList().forEach(item => gridEl.appendChild(createBinauralCard(item)));
  syncBinauralPlayingState(gridEl);
}

export function initBinauralSection() {
  renderBinauralGrid(document.getElementById('binaural-grid'));
  registerBinauralNowBar({
    bar: document.getElementById('binaural-now-bar'),
    label: document.getElementById('binaural-now-label'),
    btnStop: document.getElementById('btn-stop-binaural'),
  });
  bindBinauralStop(document.getElementById('btn-stop-binaural'));
  bindBinauralVolume(
    document.getElementById('slider-binaural-vol'),
    document.getElementById('binaural-vol-val'),
  );
  document.addEventListener('ss-binaural-change', () => {
    syncBinauralPlayingState();
    const cur = getCurrentBinauralId();
    updateBinauralNowBar(cur ? getBinauralItem(cur) : null);
  });
}

export function renderAsmrGrid(gridEl, category = 'all') {
  if (!gridEl) return;
  gridEl.innerHTML = '';
  filterAsmrList(category).forEach(item => gridEl.appendChild(createAsmrCard(item)));
  syncAsmrPlayingState(gridEl);
}

export function bindAsmrCategoryTabs(tabsEl, gridEl) {
  if (!tabsEl || !gridEl) return;
  let active = 'all';
  tabsEl.innerHTML = '';
  ASMR_CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'asmr-cat-tab' + (cat.id === active ? ' active' : '');
    tab.dataset.category = cat.id;
    tab.textContent = cat.label;
    tab.addEventListener('click', () => {
      active = cat.id;
      tabsEl.querySelectorAll('.asmr-cat-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.category === active);
      });
      renderAsmrGrid(gridEl, active);
    });
    tabsEl.appendChild(tab);
  });
  renderAsmrGrid(gridEl, active);
}

export function bindAsmrStop(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    resumeAudio();
    stopAsmr();
    updateNowPlayingBar(null);
    syncAsmrPlayingState();
    document.dispatchEvent(new CustomEvent('ss-asmr-change'));
  });
}

let _timerLabelEl = null;
let _timerTickId = null;

function refreshTimerLabel() {
  if (!_timerLabelEl) return;
  const left = getAsmrTimerMinutesLeft();
  const set = getAsmrSleepTimerMinutes();
  if (!set) {
    _timerLabelEl.textContent = '타이머 꺼짐';
    return;
  }
  _timerLabelEl.textContent = left > 0 ? `${left}분 후 자동 정지` : '곧 정지…';
}

export function bindAsmrTimer(container) {
  if (!container) return;
  const labelEl = container.querySelector('[data-asmr-timer-label]');
  const rowEl = container.querySelector('[data-asmr-timer-row]');
  _timerLabelEl = labelEl;
  if (!rowEl) return;

  rowEl.innerHTML = '';
  ASMR_TIMER_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'asmr-timer-btn';
    btn.dataset.min = String(opt.min);
    btn.textContent = opt.label;
    if (opt.min === getAsmrSleepTimerMinutes()) btn.classList.add('active');
    btn.addEventListener('click', () => {
      resumeAudio();
      if (opt.min === 0) clearAsmrSleepTimer();
      else setAsmrSleepTimer(opt.min);
      rowEl.querySelectorAll('.asmr-timer-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.min, 10) === opt.min);
      });
      refreshTimerLabel();
    });
    rowEl.appendChild(btn);
  });

  clearInterval(_timerTickId);
  refreshTimerLabel();
  _timerTickId = setInterval(refreshTimerLabel, 30000);
}

export function bindAsmrSleepAutoplay(toggleEl) {
  if (!toggleEl) return;
  toggleEl.checked = isAsmrSleepAutoplay();
  toggleEl.addEventListener('change', () => setAsmrSleepAutoplay(toggleEl.checked));
}

export function initAsmrPage() {
  const grid = document.getElementById('asmr-grid');
  const tabs = document.getElementById('asmr-category-tabs');
  registerNowPlayingBar({
    bar: document.getElementById('now-playing-bar'),
    icon: document.getElementById('playing-icon'),
    name: document.getElementById('playing-name'),
    bars: document.querySelectorAll('.playing-bar-wave'),
    btnStop: document.getElementById('btn-stop-asmr'),
  });
  bindAsmrCategoryTabs(tabs, grid);
  bindAsmrStop(document.getElementById('btn-stop-asmr'));
  bindAsmrTimer(document.getElementById('asmr-timer-section'));
  bindAsmrSleepAutoplay(document.getElementById('switch-asmr-autoplay'));
  initBinauralSection();
  document.addEventListener('ss-asmr-change', () => {
    syncAsmrPlayingState();
    const cur = getCurrentAsmrId();
    updateNowPlayingBar(cur ? getAsmrItem(cur) : null);
  });
}

export function initHomeAsmrSection() {
  const presetsEl = document.getElementById('home-asmr-presets');
  const chipsEl = document.getElementById('home-asmr-chips');
  const nowEl = document.getElementById('home-asmr-now');
  const nowLabel = document.getElementById('home-asmr-now-label');
  if (!presetsEl && !chipsEl) return;

  const list = getAsmrList();
  const presets = list.filter(i => i.category === 'preset').slice(0, 3);
  const singles = list.filter(i => i.category !== 'preset');

  if (presetsEl) {
    presets.forEach(item => presetsEl.appendChild(createAsmrChip(item)));
  }
  if (chipsEl) {
    singles.forEach(item => chipsEl.appendChild(createAsmrChip(item)));
  }

  function updateHomeAsmrUI() {
    const cur = getCurrentAsmrId();
    const playing = list.find(i => i.id === cur);
    syncAsmrPlayingState();
    const btnStop = document.getElementById('btn-home-asmr-stop');
    if (!nowEl || !nowLabel) return;
    if (playing) {
      nowEl.classList.remove('idle');
      nowLabel.textContent = `${playing.emoji} ${playing.name} 재생 중`;
      if (btnStop) btnStop.style.display = '';
    } else {
      nowEl.classList.add('idle');
      nowLabel.textContent = '재생할 소리를 골라 보세요';
      if (btnStop) btnStop.style.display = 'none';
    }
  }

  function updateHomeBinauralUI() {
    syncBinauralPlayingState();
    const cur = getCurrentBinauralId();
    const item = cur ? getBinauralItem(cur) : null;
    const label = document.getElementById('home-binaural-now-label');
    const bar = document.getElementById('home-binaural-now');
    const btnStop = document.getElementById('btn-home-binaural-stop');
    if (!label || !bar) return;
    if (item) {
      bar.classList.remove('idle');
      label.textContent = `${item.emoji} ${item.name} (${item.beat}Hz)`;
      if (btnStop) btnStop.style.display = '';
    } else {
      bar.classList.add('idle');
      label.textContent = '바이노럴 비트 끄기';
      if (btnStop) btnStop.style.display = 'none';
    }
  }

  const binauralEl = document.getElementById('home-binaural-chips');
  if (binauralEl) {
    getBinauralList().forEach(item => binauralEl.appendChild(createBinauralChip(item)));
  }
  bindBinauralVolume(
    document.getElementById('slider-home-binaural-vol'),
    document.getElementById('home-binaural-vol-val'),
  );
  bindBinauralStop(document.getElementById('btn-home-binaural-stop'));

  bindAsmrTimer(document.getElementById('home-asmr-timer'));
  bindAsmrSleepAutoplay(document.getElementById('switch-home-asmr-autoplay'));
  bindAsmrStop(document.getElementById('btn-home-asmr-stop'));

  document.addEventListener('ss-asmr-change', updateHomeAsmrUI);
  document.addEventListener('ss-binaural-change', updateHomeBinauralUI);
  updateHomeAsmrUI();
  updateHomeBinauralUI();
}

export function initSleepAsmrMini() {
  const presetsEl = document.getElementById('sleep-asmr-presets');
  const nowLabel = document.getElementById('sleep-asmr-now');
  if (!presetsEl) return;

  const presets = getAsmrList().filter(i => i.category === 'preset');
  presets.forEach(item => presetsEl.appendChild(createAsmrChip(item, { compact: false })));

  function updateMini() {
    const cur = getCurrentAsmrId();
    const item = cur ? getAsmrItem(cur) : null;
    syncAsmrPlayingState(presetsEl.parentElement);
    const btnStop = document.getElementById('btn-sleep-asmr-stop');
    if (nowLabel) {
      nowLabel.textContent = item
        ? `${item.emoji} ${item.name} 재생 중`
        : '소리를 골라 잠들 준비를 해요';
      nowLabel.parentElement?.classList.toggle('playing', !!item);
    }
    if (btnStop) btnStop.style.display = item ? '' : 'none';
  }

  bindAsmrStop(document.getElementById('btn-sleep-asmr-stop'));
  document.addEventListener('ss-asmr-change', updateMini);
  updateMini();
}
