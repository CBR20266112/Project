/**
 * morningcall.js — Sleepy Sheep 모닝콜 (수면·기상 입력 기준)
 */

import { getSettings, getItem, setItem } from './storage.js';

export const MORNING_ACTION = Object.freeze({
  PET:  'pet',
  FEED: 'feed',
});

export const MORNINGCALL_SCHEDULE_KEY = 'ss_morningcall_schedule';
export const MORNINGCALL_FIRED_DATE_KEY = 'ss_morningcall_fired_date';
export const MORNINGCALL_COMPLETED_DATE_KEY = 'ss_morningcall_completed_date';

export function pickMorningAction() {
  return Math.random() < 0.5 ? MORNING_ACTION.PET : MORNING_ACTION.FEED;
}

export function getMorningCallConfig() {
  const settings = getSettings();
  return {
    simple:       settings.morningCallSimple === true,
    notification: settings.notification !== false,
  };
}

/** 로컬 기준 YYYY-MM-DD */
export function localTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'HH:MM' → 분 */
export function parseTimeToMinutes(timeStr) {
  const [h, m] = (timeStr || '07:00').split(':').map(Number);
  if (!Number.isFinite(h)) return 7 * 60;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

/** 기상 시각이 취침 다음날인지 계산해 알람 날짜 반환 */
export function computeWakeAlarmDate(bedtime, wakeTime, baseDate = new Date()) {
  const bedMin = parseTimeToMinutes(bedtime);
  const wakeMin = parseTimeToMinutes(wakeTime);
  const d = new Date(baseDate);
  if (wakeMin <= bedMin) {
    d.setDate(d.getDate() + 1);
  }
  return localTodayKey(d);
}

/** 수면·기상 입력 저장 → 모닝콜 스케줄 */
export function saveMorningCallSchedule(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null;
  const alarmDate = computeWakeAlarmDate(bedtime, wakeTime);
  const data = { bedtime, wakeTime, alarmDate };
  setItem(MORNINGCALL_SCHEDULE_KEY, data);
  notifyAlarmScheduleChanged();
  return data;
}

function notifyAlarmScheduleChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ss-alarm-schedule-changed'));
  }
}

/** 입력 필드 기본값 (저장된 스케줄 → 설정 기본값) */
export function getSleepTimeDefaults() {
  const schedule = getItem(MORNINGCALL_SCHEDULE_KEY);
  if (schedule?.bedtime && schedule?.wakeTime) {
    return { bedtime: schedule.bedtime, wakeTime: schedule.wakeTime };
  }
  const s = getSettings();
  return {
    bedtime: s.bedAlarm || '23:00',
    wakeTime: s.wakeAlarm || '07:00',
  };
}

/** 모닝콜 안내 문구 */
export function formatAlarmHint(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return '';
  const alarmDate = computeWakeAlarmDate(bedtime, wakeTime);
  const today = localTodayKey();
  const dayLabel = alarmDate === today ? '오늘' : '내일';
  return `⏰ 모닝콜 ${dayLabel} ${wakeTime}에 울려요`;
}

/** 현재 적용 중인 기상 알람 (수면 중 세션 우선) */
export function getWakeAlarmTarget() {
  const session = getItem('ss_sleeping_since');
  if (session?.wakeTime) {
    const bedtime = session.bedtime || '23:00';
    const base = session.time ? new Date(session.time) : new Date();
    return {
      wakeTime: session.wakeTime,
      alarmDate: computeWakeAlarmDate(bedtime, session.wakeTime, base),
    };
  }

  const schedule = getItem(MORNINGCALL_SCHEDULE_KEY);
  if (schedule?.wakeTime && schedule?.alarmDate) {
    return { wakeTime: schedule.wakeTime, alarmDate: schedule.alarmDate };
  }

  return null;
}

/** 현재 시각이 기상 알람 시각인지 (±1분) */
export function isWakeAlarmNow(wakeAlarm) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const target = parseTimeToMinutes(wakeAlarm);
  return Math.abs(current - target) <= 1;
}

export function getNowLocalMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export function isWakeAlarmDue(target, date = new Date()) {
  if (!target?.wakeTime || !target?.alarmDate) return false;

  const today = localTodayKey(date);
  if (target.alarmDate !== today) return false;
  if (getItem(MORNINGCALL_COMPLETED_DATE_KEY) === today) return false;

  return getNowLocalMinutes(date) >= parseTimeToMinutes(target.wakeTime);
}

export function markMorningCallFired(todayKey = localTodayKey()) {
  setItem(MORNINGCALL_FIRED_DATE_KEY, todayKey);
  notifyAlarmScheduleChanged();
}

export function markMorningCallCompleted(todayKey = localTodayKey()) {
  setItem(MORNINGCALL_COMPLETED_DATE_KEY, todayKey);
  notifyAlarmScheduleChanged();
}

/**
 * 입력한 기상 시간에 모닝콜 콜백 실행
 * @param {(payload: { simple: boolean, scheduled: boolean }) => void} onTrigger
 */
export function initWakeAlarmScheduler(onTrigger) {
  const check = () => {
    const { notification, simple } = getMorningCallConfig();
    if (!notification) return;

    const target = getWakeAlarmTarget();
    if (!target) return;

    const today = localTodayKey();
    if (!isWakeAlarmDue(target)) return;

    markMorningCallFired(today);
    onTrigger({ simple, scheduled: true });
  };

  check();
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check();
  });
  return setInterval(check, 30000);
}
