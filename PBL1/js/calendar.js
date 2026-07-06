/**
 * calendar.js — 메에메에 캘린더 (수면 + 고민 통합)
 */

import { getSleepRecords } from './storage.js';
import { getWorries } from './storage.js';
import { formatDuration } from './sleep.js';

const MOOD_EMOJIS = ['😢', '🥱', '😐', '😊', '🥰'];
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** YYYY-MM-DD */
export function toDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** 해당 월의 캘린더 셀 배열 (앞뒤 빈 칸 포함) */
export function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push({ inMonth: false, date: null, day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      inMonth: true,
      day: d,
      date: toDateKey(year, month, d),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ inMonth: false, date: null, day: null });
  }
  return cells;
}

/** 날짜별 수면·고민 맵 */
export function getMonthDataMap(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const sleepMap = {};
  const worryMap = {};

  getSleepRecords().forEach(r => {
    if (r.date?.startsWith(prefix)) sleepMap[r.date] = r;
  });
  getWorries().forEach(w => {
    if (w.date?.startsWith(prefix)) worryMap[w.date] = w;
  });

  return { sleepMap, worryMap };
}

/** 고민 표시용 텍스트 (멀티턴 대응) */
export function getWorryDisplay(worry) {
  if (!worry) return null;
  if (worry.turns?.length) {
    const userMsgs = worry.turns.filter(t => t.role === 'user').map(t => t.content);
    const modelMsgs = worry.turns.filter(t => t.role === 'model').map(t => t.content);
    return {
      content: userMsgs.join('\n') || worry.content || '',
      reply: modelMsgs[modelMsgs.length - 1] || worry.reply || '',
    };
  }
  return { content: worry.content || '', reply: worry.reply || '' };
}

/** 기분 이모지 */
export function moodEmoji(mood) {
  return MOOD_EMOJIS[Math.min(Math.max((mood || 3) - 1, 0), 4)] || '😐';
}

/** 날짜 상세 엔트리 */
export function getDayEntry(dateStr) {
  const sleep = getSleepRecords().find(r => r.date === dateStr) ?? null;
  const worry = getWorries().find(w => w.date === dateStr) ?? null;
  return {
    date: dateStr,
    sleep,
    worry: getWorryDisplay(worry),
    hasSleep: !!sleep,
    hasWorry: !!worry,
    hasAny: !!(sleep || worry),
  };
}

/** 월 제목 */
export function formatMonthTitle(year, month) {
  return `${year}년 ${month + 1}월`;
}

export { WEEKDAY_LABELS, MOOD_EMOJIS, formatDuration };
