/**
 * attendance.js — 출석체크, 연속 보상, 스토리 해금
 */

import { ATTENDANCE_STORIES, DAILY_ATTENDANCE_WOOL } from './constants.js';
import { getItem, setItem } from './storage.js';
import { getSheep, saveSheep } from './storage.js';

export const ATTENDANCE_KEY = 'ss_attendance';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
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
    total:    raw.total    ?? 0,
    streak:   raw.streak   ?? 0,
    lastDate: raw.lastDate ?? null,
    unlocked: Array.isArray(raw.unlocked) ? [...raw.unlocked] : [],
  };
}

/** 스토리 에피소드 이미지 경로 목록 */
export function getStoryImages(story) {
  const prefix = getAssetPrefix();
  const imgs = [];
  for (let i = story.from; i <= story.to; i++) {
    imgs.push(`${prefix}assets/sheep/Opening/opening_${i}.png`);
  }
  return imgs;
}

/** 스토리 표지(첫 장) */
export function getStoryCover(story) {
  return getStoryImages(story)[0];
}

/** 오늘 출석 여부 */
export function isCheckedInToday() {
  return getAttendance().lastDate === todayStr();
}

/** 다음 스토리 마일스톤 */
export function getNextMilestone(streak) {
  return ATTENDANCE_STORIES.find(s => streak < s.days) ?? null;
}

/** 7일 주기 진행 (1~7) */
export function getWeekCycleProgress(streak) {
  if (!streak) return 0;
  const mod = streak % 7;
  return mod === 0 ? 7 : mod;
}

/**
 * 출석 기록 (모닝콜·출석 페이지 공통)
 * @returns {{ alreadyChecked: boolean, attendance: object, newlyUnlocked: object[], woolGained: number }}
 */
export function recordAttendance() {
  const today = todayStr();
  const att = getAttendance();

  if (att.lastDate === today) {
    return { alreadyChecked: true, attendance: att, newlyUnlocked: [], woolGained: 0 };
  }

  const newStreak = att.lastDate === yesterdayStr() ? att.streak + 1 : 1;
  const unlocked = [...att.unlocked];
  const newlyUnlocked = [];

  ATTENDANCE_STORIES.forEach(story => {
    if (newStreak >= story.days && !unlocked.includes(story.id)) {
      unlocked.push(story.id);
      newlyUnlocked.push(story);
    }
  });

  const next = {
    total: att.total + 1,
    streak: newStreak,
    lastDate: today,
    unlocked,
  };
  setItem(ATTENDANCE_KEY, next);

  const sheep = getSheep();
  sheep.wool += DAILY_ATTENDANCE_WOOL;
  saveSheep(sheep);

  return {
    alreadyChecked: false,
    attendance: next,
    newlyUnlocked,
    woolGained: DAILY_ATTENDANCE_WOOL,
  };
}

/** ID로 스토리 메타 찾기 */
export function findStoryById(id) {
  return ATTENDANCE_STORIES.find(s => s.id === id) ?? null;
}

/** 해금 여부 */
export function isStoryUnlocked(storyId) {
  return getAttendance().unlocked.includes(storyId);
}
