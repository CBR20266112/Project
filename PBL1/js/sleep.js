/**
 * sleep.js — 수면 기록, 통계, 그래프
 */

import { calcSleepReward } from './constants.js';
import {
  getSleepRecords,
  upsertSleepRecord,
  getTodaySleep,
  getSettings,
} from './storage.js';
import { addXP } from './sheep.js';

// ─── 수면 기록 처리 ───

/**
 * 수면 기록 저장 + XP 계산
 * @param {object} params
 * @param {string} params.bedtime  'HH:MM'
 * @param {string} params.wakeTime 'HH:MM'
 * @param {number} params.mood     1~5
 * @param {string} params.note     메모
 * @returns {{ record: object, xpGained: number, woolGained: number }}
 */
export function recordSleep({ bedtime, wakeTime, mood = 3, note = '' }) {
  const duration   = calcDurationMinutes(bedtime, wakeTime);
  const settings   = getSettings();
  const { xp, woolGrowth } = calcSleepReward(duration, settings.sleepGoal);
  const date       = new Date().toISOString().slice(0, 10);

  const record = {
    date,
    bedtime,
    wakeTime,
    duration,
    mood,
    note,
    xpGained:    xp,
    woolGained:  woolGrowth,
    recordedAt:  new Date().toISOString(),
  };

  upsertSleepRecord(record);

  // XP 반영
  if (xp > 0) addXP(xp);

  return { record, xpGained: xp, woolGained: woolGrowth };
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
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0분';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
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
    const key = d.toISOString().slice(0, 10);
    labels.push(mode === 'weekly'
      ? ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
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
