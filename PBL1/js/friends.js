/**
 * friends.js - friend list and room preview helpers
 */

import { DUMMY_FRIENDS } from './constants.js';
import { t } from './i18n.js';

export function getFriends() {
  return DUMMY_FRIENDS;
}

export function getFriendById(id) {
  return DUMMY_FRIENDS.find(f => f.id === id) ?? null;
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return t('friends.status.justNow');
  if (min < 60) return t('friends.status.minutesAgo', { minutes: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('friends.status.hoursAgo', { hours: h });
  return t('friends.status.daysAgo', { days: Math.floor(h / 24) });
}

export function buildFriendCardHTML(friend) {
  const statusHTML = friend.isSleeping
    ? `<div class="friend-sleeping">${t('friends.status.sleeping')}</div>`
    : `<div class="friend-status">${t('friends.status.lastSeen', { timeLabel: timeAgo(friend.lastSeen) })}</div>`;

  const streakBadge = friend.streak > 0
    ? `<span style="font-size:0.7rem;color:var(--color-star);font-weight:700">${t('friends.streakBadge', { streak: friend.streak })}</span>`
    : '';

  return `
<div class="friend-card" data-friend-id="${friend.id}" role="button" tabindex="0">
  <div class="friend-avatar">🐑</div>
  <div class="friend-info">
    <div class="friend-name">${friend.name}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
      <span class="level-badge" style="font-size:0.65rem;padding:2px 8px">Lv.${friend.level}</span>
      ${streakBadge}
    </div>
    ${statusHTML}
  </div>
  <div style="font-size:1.2rem;opacity:0.5">›</div>
</div>`;
}

export function buildFriendRoomHTML(friend) {
  const title = friend.isSleeping
    ? t('friends.room.titleSleeping', { friendName: friend.name })
    : t('friends.room.title', { friendName: friend.name });

  const stats = t('friends.room.stats', { level: friend.level, streak: friend.streak });

  if (friend.id === 'friend_ridajol') {
    return `
<div class="friend-room-container glass" style="border-radius: var(--radius-xl); padding: 0; overflow: hidden; position: relative;">
  <div style="padding: 16px 20px 8px; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 10; position: relative;">
    <div style="font-size: 1rem; font-weight: 800; color: #fff;">${title}</div>
    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 2px;">
      ${stats}
    </div>
  </div>
  <div style="position: relative; width: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
    <img src="../assets/friends/ridajol_room.jpg" alt="${friend.name}'s bedroom" style="width: 100%; max-height: 480px; object-fit: contain; display: block;">
  </div>
</div>`;
  }

  // 수면왕 (friend_003) — 사용자 제공 이미지
  if (friend.id === 'friend_003') {
    return `
<div class="friend-room-container glass" style="border-radius: var(--radius-xl); padding: 0; overflow: hidden; position: relative;">
  <div style="padding: 16px 20px 8px; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 10; position: relative;">
    <div style="font-size: 1rem; font-weight: 800; color: #fff;">${title}</div>
    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 2px;">
      ${stats}
    </div>
  </div>
  <div style="position: relative; width: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
    <img src="../assets/friends/49f560ba-45d0-44f5-87d7-11db7eea4b23.png" alt="${friend.name}'s bedroom" style="width: 100%; max-height: 480px; object-fit: contain; display: block;">
  </div>
</div>`;
  }

  // 꿈나래 (friend_002) — 사용자 제공 이미지
  if (friend.id === 'friend_002') {
    return `
<div class="friend-room-container glass" style="border-radius: var(--radius-xl); padding: 0; overflow: hidden; position: relative;">
  <div style="padding: 16px 20px 8px; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 10; position: relative;">
    <div style="font-size: 1rem; font-weight: 800; color: #fff;">${title}</div>
    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 2px;">
      ${stats}
    </div>
  </div>
  <div style="position: relative; width: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
    <img src="../assets/friends/3a278dbe-16e9-41fe-96a3-5dd9e58bf8ec.png" alt="${friend.name}'s bedroom" style="width: 100%; max-height: 480px; object-fit: contain; display: block;">
  </div>
</div>`;
  }

  return `
<div class="glass" style="border-radius: var(--radius-xl); padding: 40px 20px; text-align: center; background: linear-gradient(180deg, #1a1040 0%, #2D1B4E 100%)">
  <div style="font-size: 3rem; margin-bottom: 16px;">🔒</div>
  <div style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 8px;">${title}</div>
  <div style="font-size: 0.85rem; color: rgba(255,255,255,0.5); line-height: 1.6;">${t('friends.room.locked')}</div>
  <div style="margin-top: 20px; font-size: 0.75rem; color: rgba(255,255,255,0.3);">${stats}</div>
</div>`;
}
