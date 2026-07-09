/**
 * storage.js — localStorage CRUD 래퍼
 * 직접 localStorage 접근 금지. 반드시 이 모듈을 통해 사용.
 */

import {
  STORAGE_KEYS,
  DEFAULT_SHEEP,
  DEFAULT_SETTINGS,
  DEFAULT_ITEMS,
} from './constants.js';

// ─── 기본 읽기/쓰기 ───

/**
 * @param {string} key STORAGE_KEYS 상수
 * @param {*} fallback 값이 없을 때 반환할 기본값
 */
export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[storage] getItem 실패: ${key}`, e);
    return fallback;
  }
}

/**
 * @param {string} key STORAGE_KEYS 상수
 * @param {*} value 저장할 값 (자동으로 JSON 직렬화)
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[storage] setItem 실패: ${key}`, e);
  }
}

/**
 * @param {string} key 삭제할 키
 */
export function removeItem(key) {
  localStorage.removeItem(key);
}

/** 앱 데이터 전체 초기화 */
export function clearAll() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  // 오프닝 시청 기록 (opening.js) — 전체 초기화 시 스토리 다시 재생
  localStorage.removeItem('ss_opening_viewed');
  localStorage.removeItem('ss_attendance');
  localStorage.removeItem('ss_sleeping_since');
  localStorage.removeItem('ss_morningcall_fired_date');
  localStorage.removeItem('ss_morningcall_completed_date');
  localStorage.removeItem('ss_morningcall_schedule');
  localStorage.removeItem('ss_pwa_install_dismiss');
}

// ─── 도메인별 헬퍼 ───

/** 양 상태 읽기 (없으면 기본값) */
export function getSheep() {
  return { ...DEFAULT_SHEEP, ...getItem(STORAGE_KEYS.SHEEP, {}) };
}

/** 양 상태 저장 */
export function saveSheep(sheep) {
  setItem(STORAGE_KEYS.SHEEP, sheep);
}

/** 수면 기록 배열 읽기 */
export function getSleepRecords() {
  return getItem(STORAGE_KEYS.SLEEP, []);
}

/** 수면 기록 저장 */
export function saveSleepRecords(records) {
  setItem(STORAGE_KEYS.SLEEP, records);
}

/** 오늘 날짜 'YYYY-MM-DD' */
export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return getLocalDateKey();
}

/** 오늘 수면 기록 찾기 */
export function getTodaySleep() {
  const today = todayStr();
  return getSleepRecords().find(r => r.date === today) ?? null;
}

/** 수면 기록 추가/업데이트 */
export function upsertSleepRecord(record) {
  const records = getSleepRecords();
  const idx = records.findIndex(r => r.date === record.date);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...record };
  } else {
    records.push(record);
  }
  // 최근 90일만 보관
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const filtered = records.filter(r => new Date(r.date) >= cutoff);
  saveSleepRecords(filtered);
  return record;
}

/** 아이템 상태 읽기 */
export function getItems() {
  const saved = getItem(STORAGE_KEYS.ITEMS, {});
  return {
    owned:    saved.owned    ?? [...DEFAULT_ITEMS.owned],
    equipped: { ...DEFAULT_ITEMS.equipped, ...saved.equipped },
    placements: { ...(saved.placements || {}) },
  };
}

/** 아이템 상태 저장 */
export function saveItems(items) {
  setItem(STORAGE_KEYS.ITEMS, items);
}

/** 앱 설정 읽기 */
export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...getItem(STORAGE_KEYS.SETTINGS, {}) };
}

/** 앱 설정 저장 */
export function saveSettings(settings) {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

/** 방 상태 읽기 */
export function getRoom() {
  return getItem(STORAGE_KEYS.ROOM, {
    background:  'bg_night_default',
    furniture:   [],
    decorations: [],
  });
}

/** 방 상태 저장 */
export function saveRoom(room) {
  setItem(STORAGE_KEYS.ROOM, room);
}

/** 초기화: 데이터 없을 때 기본값 세팅 */
export function initStorage() {
  if (!getItem(STORAGE_KEYS.SHEEP)) saveSheep({ ...DEFAULT_SHEEP });
  if (!getItem(STORAGE_KEYS.SLEEP)) saveSleepRecords([]);
  if (!getItem(STORAGE_KEYS.ITEMS)) saveItems({ ...DEFAULT_ITEMS, owned: [], equipped: { ...DEFAULT_ITEMS.equipped } });
  if (!getItem(STORAGE_KEYS.SETTINGS)) saveSettings({ ...DEFAULT_SETTINGS });
  if (!getItem(STORAGE_KEYS.WORRIES)) setItem(STORAGE_KEYS.WORRIES, []);
}

/** 양 데이터만 초기화 */
export function resetSheep() {
  saveSheep({ ...DEFAULT_SHEEP });
}

/** 고민 기록 배열 읽기 */
export function getWorries() {
  return getItem(STORAGE_KEYS.WORRIES, []);
}

/** 고민 기록 추가/업데이트 */
export function saveWorry(date, content, reply) {
  const worries = getWorries();
  const idx = worries.findIndex(w => w.date === date);
  const newWorry = { date, content, reply, createdAt: new Date().toISOString() };
  
  if (idx >= 0) {
    worries[idx] = newWorry;
  } else {
    worries.push(newWorry);
  }
  
  // 날짜 기준 오름차순 정렬
  worries.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  setItem(STORAGE_KEYS.WORRIES, worries);
  return newWorry;
}

