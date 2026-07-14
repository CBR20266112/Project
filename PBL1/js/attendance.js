/**
 * attendance.js — 출석체크, 7일 주기 보상, 스토리·일러스트 수집
 */

import {
  ATTENDANCE_STORIES,
  ATTENDANCE_CYCLE,
  ATTENDANCE_SINGLE_COUNT,
  ATTENDANCE_STRIP_COUNT,
} from './constants.js';
import { t } from './i18n.js';
import { getItem, setItem, getLocalDateKey } from './storage.js';
import { getSheep, saveSheep } from './storage.js';

export const ATTENDANCE_KEY = 'ss_attendance';

function todayStr() {
  return getLocalDateKey();
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 서브페이지 여부에 따른 에셋 경로 접두사 */
export function getAssetPrefix() {
  const href = window.location.href.toLowerCase();
  return href.includes('/pages/') || href.includes('\\pages\\') ? '../' : '';
}

/** 출석 데이터 읽기 */
export function getAttendance() {
  const raw = getItem(ATTENDANCE_KEY, {});
  return {
    total:            raw.total            ?? 0,
    streak:           raw.streak           ?? 0,
    lastDate:         raw.lastDate         ?? null,
    unlocked:         Array.isArray(raw.unlocked) ? [...raw.unlocked] : [],
    collectedSingles: Array.isArray(raw.collectedSingles) ? [...raw.collectedSingles] : [],
    collectedStrips:  Array.isArray(raw.collectedStrips) ? [...raw.collectedStrips] : [],
  };
}

/** 연속 일수 → 이번 주기 일차 (1~7) */
export function getCycleDay(streak) {
  if (!streak) return 0;
  const mod = streak % 7;
  return mod === 0 ? 7 : mod;
}

export function singleIdFromIndex(index) {
  return `single_${pad2(index)}`;
}

export function stripIdFromIndex(index) {
  return `strip_${pad2(index)}`;
}

export function getSingleIllustPath(id) {
  const num = id.replace('single_', '');
  return `${getAssetPrefix()}assets/attendance/singles/${num}.png`;
}

export function getStripIllustPath(id) {
  const num = id.replace('strip_', '');
  return `${getAssetPrefix()}assets/attendance/strips/${num}.png`;
}

export function getSingleIllustTitle(id) {
  const num = id.replace('single_', '');
  return t('attendance.singleIllustrationTitle', { number: num }) || `Illustration #${num}`;
}

export function getStripIllustTitle(id) {
  const num = id.replace('strip_', '');
  return t('attendance.stripComicTitle', { number: num }) || `4-panel comic #${num}`;
}

function pickRandomId(prefix, count, collected) {
  if (count <= 0) return null;
  const pool = [];
  for (let i = 1; i <= count; i++) {
    const id = prefix === 'single' ? singleIdFromIndex(i) : stripIdFromIndex(i);
    if (!collected.includes(id)) pool.push(id);
  }
  if (!pool.length) {
    for (let i = 1; i <= count; i++) {
      pool.push(prefix === 'single' ? singleIdFromIndex(i) : stripIdFromIndex(i));
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getStoryImages(story) {
  const prefix = getAssetPrefix();
  const imgs = [];
  for (let i = story.from; i <= story.to; i++) {
    imgs.push(`${prefix}assets/sheep/Opening/opening_${i}.png`);
  }
  return imgs;
}

export function getStoryCover(story) {
  return getStoryImages(story)[0];
}

export function isCheckedInToday() {
  return getAttendance().lastDate === todayStr();
}

export function getNextMilestone(streak) {
  return ATTENDANCE_STORIES.find(s => streak < s.days) ?? null;
}

export function getWeekCycleProgress(streak) {
  return getCycleDay(streak);
}

export function getNextCycleReward(streak) {
  const day = getCycleDay(streak);
  if (!day) {
    return { type: 'wool', label: t('attendance.rewardLabel.wool'), daysLeft: 1 };
  }
  if (day < ATTENDANCE_CYCLE.SINGLE_DAY) {
    return { type: 'single', label: t('attendance.rewardLabel.single'), daysLeft: ATTENDANCE_CYCLE.SINGLE_DAY - day };
  }
  if (day < ATTENDANCE_CYCLE.STRIP_DAY) {
    return { type: 'strip', label: t('attendance.rewardLabel.strip'), daysLeft: ATTENDANCE_CYCLE.STRIP_DAY - day };
  }
  return { type: 'wool', label: t('attendance.rewardLabel.wool'), daysLeft: 0 };
}

export function getTodayCycleRewardPreview(streakIfCheckedIn) {
  const day = getCycleDay(streakIfCheckedIn);
  if (ATTENDANCE_CYCLE.WOOL_DAYS.includes(day)) {
    return { type: 'wool', wool: ATTENDANCE_CYCLE.WOOL_SMALL };
  }
  if (day === ATTENDANCE_CYCLE.SINGLE_DAY) {
    return { type: 'single' };
  }
  if (day === ATTENDANCE_CYCLE.STRIP_DAY) {
    return { type: 'strip' };
  }
  return { type: 'none' };
}

function applyCycleReward(cycleDay, collectedSingles, collectedStrips) {
  let woolGained = 0;
  let newSingle = null;
  let newStrip = null;
  const singles = [...collectedSingles];
  const strips = [...collectedStrips];

  if (ATTENDANCE_CYCLE.WOOL_DAYS.includes(cycleDay)) {
    woolGained = ATTENDANCE_CYCLE.WOOL_SMALL;
  } else if (cycleDay === ATTENDANCE_CYCLE.SINGLE_DAY) {
    const id = pickRandomId('single', ATTENDANCE_SINGLE_COUNT, singles);
    if (id) {
      if (!singles.includes(id)) singles.push(id);
      newSingle = {
        id,
        title: getSingleIllustTitle(id),
        path: getSingleIllustPath(id),
      };
    }
  } else if (cycleDay === ATTENDANCE_CYCLE.STRIP_DAY) {
    const id = pickRandomId('strip', ATTENDANCE_STRIP_COUNT, strips);
    if (id) {
      if (!strips.includes(id)) strips.push(id);
      newStrip = {
        id,
        title: getStripIllustTitle(id),
        path: getStripIllustPath(id),
      };
    } else {
      woolGained = ATTENDANCE_CYCLE.WOOL_SMALL * 2;
    }
  }

  return { woolGained, newSingle, newStrip, singles, strips };
}

export function recordAttendance() {
  const today = todayStr();
  const att = getAttendance();

  if (att.lastDate === today) {
    return {
      alreadyChecked: true,
      attendance: att,
      newlyUnlocked: [],
      woolGained: 0,
      newSingle: null,
      newStrip: null,
      cycleDay: getCycleDay(att.streak),
    };
  }

  const newStreak = att.lastDate === yesterdayStr() ? att.streak + 1 : 1;
  const cycleDay = getCycleDay(newStreak);
  const unlocked = [...att.unlocked];
  const newlyUnlocked = [];

  ATTENDANCE_STORIES.forEach(story => {
    if (newStreak >= story.days && !unlocked.includes(story.id)) {
      unlocked.push(story.id);
      newlyUnlocked.push(story);
    }
  });

  const reward = applyCycleReward(cycleDay, att.collectedSingles, att.collectedStrips);

  const next = {
    total: att.total + 1,
    streak: newStreak,
    lastDate: today,
    unlocked,
    collectedSingles: reward.singles,
    collectedStrips: reward.strips,
  };
  setItem(ATTENDANCE_KEY, next);

  if (reward.woolGained > 0) {
    const sheep = getSheep();
    sheep.wool += reward.woolGained;
    saveSheep(sheep);
  }

  return {
    alreadyChecked: false,
    attendance: next,
    newlyUnlocked,
    woolGained: reward.woolGained,
    newSingle: reward.newSingle,
    newStrip: reward.newStrip,
    cycleDay,
  };
}

export function findStoryById(id) {
  return ATTENDANCE_STORIES.find(s => s.id === id) ?? null;
}

export function isStoryUnlocked(storyId) {
  return getAttendance().unlocked.includes(storyId);
}

export function getCollectedSingleItems() {
  return getAttendance().collectedSingles.map(id => ({
    id,
    title: getSingleIllustTitle(id),
    cover: getSingleIllustPath(id),
    path: getSingleIllustPath(id),
  }));
}

export function getCollectedStripItems() {
  return getAttendance().collectedStrips.map(id => ({
    id,
    title: getStripIllustTitle(id),
    cover: getStripIllustPath(id),
    path: getStripIllustPath(id),
  }));
}

/** 출석 보상 토스트 문구 */
export function getAttendanceRewardMessages(res) {
  const msgs = [];
  if (!res || res.alreadyChecked) return msgs;
  if (res.woolGained > 0) msgs.push(t('attendance.toast.rewardWool', { wool: res.woolGained }));
  if (res.newSingle) msgs.push(t('attendance.toast.rewardSingle', { title: res.newSingle.title }));
  if (res.newStrip) msgs.push(t('attendance.toast.rewardStrip', { title: res.newStrip.title }));
  if (!msgs.length) msgs.push(t('attendance.toast.rewardDefault'));
  return msgs;
}
