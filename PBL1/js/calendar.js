/**
 * calendar.js — 메에메에 캘린더 (수면 + 고민 통합)
 */

import { getSleepRecords, getWorries, getSnoreRecords, getSettings } from './storage.js';
import { formatDuration } from './sleep.js';
import { t } from './i18n.js';

const MOOD_EMOJIS = ['😢', '🥱', '😐', '😊', '🥰'];
function getWeekdayLabels(lang = getSettings().language || 'en') {
  return [
    t('weekday.sun', {}, lang),
    t('weekday.mon', {}, lang),
    t('weekday.tue', {}, lang),
    t('weekday.wed', {}, lang),
    t('weekday.thu', {}, lang),
    t('weekday.fri', {}, lang),
    t('weekday.sat', {}, lang),
  ];
}

/** 로컬 기준 YYYY-MM-DD */
export function toDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function todayKey() {
  const d = new Date();
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
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
  const snoreMap = {};

  getSleepRecords().forEach(r => {
    if (r.date?.startsWith(prefix)) sleepMap[r.date] = r;
  });
  getWorries().forEach(w => {
    if (w.date?.startsWith(prefix)) worryMap[w.date] = w;
  });
  getSnoreRecords().forEach(r => {
    if (r.date?.startsWith(prefix)) snoreMap[r.date] = r;
  });

  return { sleepMap, worryMap, snoreMap };
}

/** 월간 통계 */
export function getMonthStats(year, month, sleepGoal) {
  const goal = sleepGoal ?? getSettings().sleepGoal ?? 480;
  const { sleepMap, worryMap } = getMonthDataMap(year, month);
  const sleeps = Object.values(sleepMap);
  const worryDays = Object.keys(worryMap).length;
  const sleepDays = sleeps.length;
  const totalMin = sleeps.reduce((s, r) => s + (r.duration || 0), 0);
  const avgMinutes = sleepDays ? Math.round(totalMin / sleepDays) : 0;
  const goalDays = sleeps.filter(r => (r.duration || 0) >= goal).length;

  return {
    sleepDays,
    worryDays,
    avgMinutes,
    goalDays,
    sleepGoal: goal,
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  };
}

/** 수면 달성도 (셀 색상용) */
export function sleepLevel(duration, sleepGoal) {
  if (!duration || duration <= 0) return 'none';
  if (duration >= sleepGoal) return 'good';
  if (duration >= sleepGoal * 0.75) return 'ok';
  return 'low';
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

/** 고민 대화 스레드 (상세 UI용) */
export function getWorryThread(worry) {
  if (!worry) return [];
  if (worry.turns?.length) {
    return worry.turns
      .filter(t => t.role === 'user' || t.role === 'model')
      .map(t => ({ role: t.role, content: t.content || '' }));
  }
  const thread = [];
  if (worry.content) thread.push({ role: 'user', content: worry.content });
  if (worry.reply) thread.push({ role: 'model', content: worry.reply });
  return thread;
}

/** 기분 이모지 */
export function moodEmoji(mood) {
  return MOOD_EMOJIS[Math.min(Math.max((mood || 3) - 1, 0), 4)] || '😐';
}

/** 날짜 상세 엔트리 */
export function getDayEntry(dateStr) {
  const sleep = getSleepRecords().find(r => r.date === dateStr) ?? null;
  const worryRaw = getWorries().find(w => w.date === dateStr) ?? null;
  const snore = getSnoreRecords().find(r => r.date === dateStr) ?? null;
  const settings = getSettings();
  const goal = settings.sleepGoal ?? 480;

  return {
    date: dateStr,
    sleep,
    worry: getWorryDisplay(worryRaw),
    worryThread: getWorryThread(worryRaw),
    snore,
    sleepGoal: goal,
    sleepMetGoal: sleep ? (sleep.duration || 0) >= goal : false,
    hasSleep: !!sleep,
    hasWorry: !!worryRaw,
    hasSnore: !!snore,
    hasAny: !!(sleep || worryRaw || snore),
  };
}

/** 월 제목 */
export function formatMonthTitle(year, month) {
  return t('calendar.monthTitle', { year, month: month + 1 });
}

/** 날짜 라벨 */
export function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const lang = getSettings().language || 'en';
  const dow = getWeekdayLabels(lang)[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return t('calendar.dateLabel', { year: y, month: parseInt(m, 10), day: parseInt(d, 10), dow }, lang);
}

export { MOOD_EMOJIS, formatDuration };
