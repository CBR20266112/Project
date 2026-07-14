/**
 * sleep.js — 수면 기록, 통계, 그래프
 */

import { calcSleepReward } from './constants.js';
import {
  getSleepRecords,
  upsertSleepRecord,
  getTodaySleep,
  getSettings,
  getLocalDateKey,
} from './storage.js';
import { addXP, boostHunger } from './sheep.js';
import { getSheep, saveSheep } from './storage.js';
import { t } from './i18n.js';

// ─── 수면 규칙성 ───

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

/**
 * 최근 수면 패턴 규칙성 (0~1)
 * @returns {{ score: number, label: string, days: number }}
 */
export function getSleepRegularity(days = 14) {
  const recs = getRecentRecords(days).filter(r => r.bedtime && r.wakeTime);
  if (recs.length < 2) {
    return { score: 0, label: '기록 부족', days: recs.length };
  }

  const bedStd  = stdDev(recs.map(r => timeToMinutes(r.bedtime)));
  const wakeStd = stdDev(recs.map(r => timeToMinutes(r.wakeTime)));
  const spread  = bedStd + wakeStd;
  const score   = Math.max(0, Math.min(1, 1 - spread / 120));

  let label = '불규칙';
  if (score >= 0.8) label = '아주 규칙적';
  else if (score >= 0.55) label = '규칙적';
  else if (score >= 0.3) label = '보통';

  return { score, label, days: recs.length };
}

/** 하루 1회 — 규칙적이면 포만감 소폭 상승 */
export function applyDailyRegularityBonus() {
  const sheep = getSheep();
  const today = getLocalDateKey();
  if (sheep.lastRegularityBonus === today) return null;

  const reg = getSleepRegularity();
  if (reg.score < 0.25) return null;

  const bonus = Math.max(1, Math.round(reg.score * 8));
  sheep.lastRegularityBonus = today;
  saveSheep(sheep);
  boostHunger(bonus);
  return { bonus, label: reg.label };
}

// ─── 수면 기록 처리 ───

/**
 * 수면 기록 저장 + XP 계산
 * @param {object} params
 * @param {string} params.bedtime  'HH:MM'
 * @param {string} params.wakeTime 'HH:MM'
 * @param {number} params.mood     1~5
 * @param {string} params.note     메모
 * @returns {{ record: object, xpGained: number, regularityBonus: number, regularityLabel: string }}
 */
export function recordSleep({ bedtime, wakeTime, mood = 3, note = '' }) {
  const duration   = calcDurationMinutes(bedtime, wakeTime);
  const settings   = getSettings();
  const { xp } = calcSleepReward(duration, settings.sleepGoal);
  const date       = getLocalDateKey();

  const record = {
    date,
    bedtime,
    wakeTime,
    duration,
    mood,
    note,
    xpGained:    xp,
    recordedAt:  new Date().toISOString(),
  };

  upsertSleepRecord(record);

  if (xp > 0) addXP(xp);

  const reg = getSleepRegularity();
  let regularityBonus = 0;
  if (reg.score >= 0.2) {
    regularityBonus = Math.max(1, Math.round(reg.score * 12));
    boostHunger(regularityBonus);
  }

  return {
    record,
    xpGained: xp,
    regularityBonus,
    regularityLabel: reg.label,
  };
}

/**
 * 취침 시간 ~ 기상 시간 → 분 계산 (야간 자정 넘김 대응)
 * @param {string} bedtime  'HH:MM'
 * @param {string} wakeTime 'HH:MM'
 * @returns {number} 분
 */
export function calcDurationMinutes(bedtime, wakeTime) {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMin  = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 1440; // 자정 넘김
  return wakeMin - bedMin;
}

/** 분 → 'Xh Ym' 문자열 */
function getDurationLabels(lang) {
  switch (lang) {
    case 'ko':
      return { zero: '0분', hour: '시간', minute: '분', hours: '시간', minutes: '분' };
    case 'zh':
      return { zero: '0分', hour: '小时', minute: '分', hours: '小时', minutes: '分' };
    case 'ja':
      return { zero: '0分', hour: '時間', minute: '分', hours: '時間', minutes: '分' };
    default:
      return { zero: '0 min', hour: 'h', minute: 'm', hours: 'h', minutes: 'm' };
  }
}

export function formatDuration(minutes) {
  const lang = getSettings().language || 'en';
  const labels = getDurationLabels(lang);
  if (!minutes || minutes <= 0) return labels.zero;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${labels.minute}`;
  if (m === 0) return `${h}${labels.hour}`;
  return `${h}${labels.hour} ${m}${labels.minute}`;
}

// ─── 통계 ───

/**
 * 최근 N일 수면 기록 반환
 * @param {number} days
 */
export function getRecentRecords(days = 7) {
  const records = getSleepRecords();
  const cutoff  = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return records
    .filter(r => new Date(r.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 주간 평균 수면 (분) */
export function getWeeklyAvg() {
  const recs = getRecentRecords(7).filter(r => r.duration > 0);
  if (recs.length === 0) return 0;
  return Math.round(recs.reduce((s, r) => s + r.duration, 0) / recs.length);
}

/** 월간 성공 일수 (목표 달성) */
export function getMonthlySuccess() {
  const settings = getSettings();
  const recs     = getRecentRecords(30);
  const success  = recs.filter(r => r.duration >= settings.sleepGoal).length;
  return { success, total: recs.length };
}

/** 연속 성공일 계산 */
export function getStreak() {
  const settings = getSettings();
  const records  = getSleepRecords()
    .filter(r => r.duration >= settings.sleepGoal)
    .sort((a, b) => b.date.localeCompare(a.date)); // 최신 순

  if (records.length === 0) return 0;

  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (const rec of records) {
    const recDate = new Date(rec.date);
    recDate.setHours(0, 0, 0, 0);
    const diff = Math.round((current - recDate) / (1000 * 60 * 60 * 24));
    if (diff > 1) break;
    streak++;
    current = recDate;
  }

  return streak;
}

// ─── Canvas 그래프 ───

/**
 * 주간 수면 막대 그래프 Canvas 그리기
 * @param {HTMLCanvasElement} canvas
 * @param {'weekly'|'monthly'} mode
 */
export function drawSleepChart(canvas, mode = 'weekly') {
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const w    = canvas.width  = canvas.offsetWidth  * (window.devicePixelRatio || 1);
  const h    = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;

  const settings  = getSettings();
  const goalMin   = settings.sleepGoal;
  const records   = mode === 'weekly' ? getRecentRecords(7) : getRecentRecords(30);
  const days      = mode === 'weekly' ? 7 : 30;

  // 날짜 → 기록 맵
  const map = {};
  records.forEach(r => { map[r.date] = r; });

  // 최근 N일 배열
  const labels = [];
  const values = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    const weekdayLabels = [
      t('weekday.sun'),
      t('weekday.mon'),
      t('weekday.tue'),
      t('weekday.wed'),
      t('weekday.thu'),
      t('weekday.fri'),
      t('weekday.sat'),
    ];

    labels.push(mode === 'weekly'
      ? weekdayLabels[d.getDay()]
      : `${d.getDate()}`);
    values.push(map[key]?.duration ?? 0);
  }

  ctx.clearRect(0, 0, W, H);

  const maxVal  = Math.max(goalMin * 1.3, ...values, 1);
  const padL    = 4;
  const padR    = 4;
  const padT    = 8;
  const padB    = mode === 'weekly' ? 20 : 12;
  const chartW  = W - padL - padR;
  const chartH  = H - padT - padB;
  const barGap  = mode === 'weekly' ? 4 : 2;
  const barW    = chartW / days - barGap;

  // 목표선
  const goalY = padT + chartH * (1 - goalMin / maxVal);
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
  ctx.lineWidth   = 1.5;
  ctx.moveTo(padL, goalY);
  ctx.lineTo(W - padR, goalY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 막대 그리기
  values.forEach((val, i) => {
    const x   = padL + i * (barW + barGap);
    const pct = val / maxVal;
    const bH  = Math.max(chartH * pct, 2);
    const y   = padT + chartH - bH;

    const isSuccess = val >= goalMin;
    const grad = ctx.createLinearGradient(x, y, x, y + bH);
    if (isSuccess) {
      grad.addColorStop(0, '#A78BFA');
      grad.addColorStop(1, '#7C6EFA');
    } else if (val > 0) {
      grad.addColorStop(0, '#4F46E5');
      grad.addColorStop(1, '#2D1B69');
    } else {
      grad.addColorStop(0, 'rgba(255,255,255,0.06)');
      grad.addColorStop(1, 'rgba(255,255,255,0.06)');
    }

    const r = Math.min(barW / 2, 5);
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bH, [r, r, 2, 2]);
    ctx.fillStyle = grad;
    ctx.fill();

    // 요일 레이블 (주간만)
    if (mode === 'weekly') {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font      = `bold ${10 * (window.devicePixelRatio || 1)}px Nunito`;
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW / 2, H - 4);
    }
  });
}

export { getTodaySleep } from './storage.js';
