/**
 * Sleepy Sheep Service Worker — 백그라운드 모닝콜 알림
 */

const CACHE_NAME = 'ss-alarm-v1';
const CHECK_MS = 30000;

let alarmState = null;
let checkTimer = null;

function localTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(timeStr) {
  const [h, m] = (timeStr || '07:00').split(':').map(Number);
  if (!Number.isFinite(h)) return 7 * 60;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function isWakeAlarmDue(wakeTime) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= parseTimeToMinutes(wakeTime);
}

async function persistState() {
  const cache = await caches.open(CACHE_NAME);
  await cache.put('alarm-state', new Response(JSON.stringify(alarmState || {})));
}

async function loadState() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match('alarm-state');
    if (res) alarmState = await res.json();
  } catch (_) {
    alarmState = alarmState || null;
  }
}

function startCheckLoop() {
  if (checkTimer) clearInterval(checkTimer);
  checkTimer = setInterval(() => checkAlarm(), CHECK_MS);
  checkAlarm();
}

async function notifyClients(payload) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach(c => c.postMessage(payload));
}

async function checkAlarm() {
  await loadState();
  if (!alarmState?.notificationEnabled) return;
  if (!alarmState?.wakeTime || !alarmState?.alarmDate) return;

  const today = localTodayKey();
  if (alarmState.alarmDate !== today) return;
  if (alarmState.completedDate === today) return;
  if (alarmState.firedDate === today) return;
  if (!isWakeAlarmDue(alarmState.wakeTime)) return;

  alarmState.firedDate = today;
  await persistState();

  const title = '⏰ 드리미 모닝콜';
  const body = '일어날 시간이에요! 탭해서 드리미를 깨워 주세요.';

  await self.registration.showNotification(title, {
    body,
    icon: alarmState.iconUrl || 'assets/icon/app_icon_candidate_night.png',
    badge: alarmState.iconUrl || 'assets/icon/app_icon_candidate_night.png',
    tag: 'ss-morningcall',
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 90, 180, 90, 360],
    data: { type: 'morningcall', appUrl: alarmState.appUrl },
  });

  await notifyClients({
    type: 'MORNINGCALL_ALARM',
    firedDate: today,
  });
}

self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      await loadState();
      startCheckLoop();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg?.type) return;

  if (msg.type === 'SYNC_ALARM') {
    alarmState = { ...(msg.payload || {}) };
    persistState().then(() => startCheckLoop());
  }

  if (msg.type === 'CLEAR_ALARM') {
    alarmState = null;
    persistState();
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const appUrl = e.notification.data?.appUrl || './index.html?morningcall=1';
  const url = appUrl.includes('?') ? `${appUrl}&morningcall=1` : `${appUrl}?morningcall=1`;

  e.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'MORNINGCALL_OPEN' });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
