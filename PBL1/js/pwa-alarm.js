/**
 * pwa-alarm.js — PWA 등록 및 백그라운드 모닝콜 동기화
 */

import { getItem, setItem } from './storage.js';
import {
  getWakeAlarmTarget,
  getMorningCallConfig,
  localTodayKey,
  MORNINGCALL_FIRED_DATE_KEY,
  MORNINGCALL_COMPLETED_DATE_KEY,
} from './morningcall.js';
import { getAppIconAbsoluteUrl } from './app-icon.js';

function getSwBase() {
  return window.location.pathname.includes('/pages/') ? '../' : './';
}

export function getAppBaseUrl() {
  const path = window.location.pathname;
  const basePath = path.includes('/pages/')
    ? path.replace(/\/pages\/[^/]*$/, '/')
    : path.replace(/\/[^/]*$/, '/');
  return `${window.location.origin}${basePath}`;
}

function getIconUrl() {
  return getAppIconAbsoluteUrl();
}

async function getRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  const base = getSwBase();
  try {
    return await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
  } catch (e) {
    console.warn('[pwa-alarm] SW 등록 실패', e);
    return null;
  }
}

/** 알람 스케줄을 Service Worker에 전달 */
export async function syncAlarmToServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg?.active) return;

  const target = getWakeAlarmTarget();
  const { notification, simple } = getMorningCallConfig();

  reg.active.postMessage({
    type: 'SYNC_ALARM',
    payload: {
      wakeTime: target?.wakeTime ?? null,
      alarmDate: target?.alarmDate ?? null,
      firedDate: getItem(MORNINGCALL_FIRED_DATE_KEY) ?? null,
      completedDate: getItem(MORNINGCALL_COMPLETED_DATE_KEY) ?? null,
      notificationEnabled: notification,
      simple,
      appUrl: `${getAppBaseUrl()}index.html`,
      iconUrl: getIconUrl(),
    },
  });
}

export async function clearBackgroundAlarm() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  reg?.active?.postMessage({ type: 'CLEAR_ALARM' });
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/**
 * PWA·백그라운드 알람 초기화
 * @param {{ onMorningCall: () => void }} handlers
 */
export async function initPwaAlarm({ onMorningCall } = {}) {
  if (!('serviceWorker' in navigator)) return;

  await getRegistration();

  navigator.serviceWorker.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg?.type) return;

    if (msg.type === 'MORNINGCALL_ALARM') {
      if (msg.firedDate) {
        setItem(MORNINGCALL_FIRED_DATE_KEY, msg.firedDate);
      }
      onMorningCall?.();
    }

    if (msg.type === 'MORNINGCALL_OPEN') {
      onMorningCall?.();
    }
  });

  window.addEventListener('ss-alarm-schedule-changed', () => {
    syncAlarmToServiceWorker();
  });

  const { notification } = getMorningCallConfig();
  if (notification && Notification.permission === 'default') {
    await requestNotificationPermission();
  }

  await syncAlarmToServiceWorker();

  if (new URLSearchParams(window.location.search).get('morningcall') === '1') {
    setTimeout(() => onMorningCall?.(), 400);
  }
}

export function markMorningCallFiredToday() {
  const today = localTodayKey();
  setItem(MORNINGCALL_FIRED_DATE_KEY, today);
  syncAlarmToServiceWorker();
}
