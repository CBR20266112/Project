/**
 * friends.js — 친구 목록 (더미 데이터 기반 프로토타입)
 */

import { DUMMY_FRIENDS } from './constants.js';
import { getSheep } from './storage.js';

// ─── 데이터 ───

/** 친구 목록 반환 */
export function getFriends() {
  return DUMMY_FRIENDS;
}

/** ID로 친구 찾기 */
export function getFriendById(id) {
  return DUMMY_FRIENDS.find(f => f.id === id) ?? null;
}

// ─── 시간 포매팅 ───
function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)   return '방금 전';
  if (min < 60)  return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ─── UI 빌더 ───

/**
 * 친구 카드 HTML
 * @param {object} friend DUMMY_FRIENDS 항목
 * @returns {string}
 */
export function buildFriendCardHTML(friend) {
  const statusHTML = friend.isSleeping
    ? `<div class="friend-sleeping">🌙 수면 중</div>`
    : `<div class="friend-status">마지막 활동 ${timeAgo(friend.lastSeen)}</div>`;

  const streakBadge = friend.streak > 0
    ? `<span style="font-size:0.7rem;color:var(--color-star);font-weight:700">🔥 ${friend.streak}일 연속</span>`
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

/**
 * 친구 방 미리보기 HTML
 * @param {object} friend
 * @returns {string}
 */
export function buildFriendRoomHTML(friend) {
  const roomBg = getRoomBgStyle(friend.room?.background);
  const title  = friend.isSleeping ? `🌙 ${friend.name} 님의 침실` : `🏡 ${friend.name} 님의 방`;

  const itemsHTML = buildRoomItems(friend.room);

  return `
<div class="friend-room-container glass" style="${roomBg}; border-radius: var(--radius-xl); padding: 0; overflow: hidden; position: relative; min-height: 260px;">
  <!-- 방 제목 -->
  <div style="padding: 16px 20px 8px; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);">
    <div style="font-size: 1rem; font-weight: 800; color: #fff;">${title}</div>
    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 2px;">
      Lv.${friend.level} · 🔥 ${friend.streak}일 연속
    </div>
  </div>

  <!-- 방 내부 -->
  <div style="position:relative; padding: 16px; min-height: 200px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 12px;">

    <!-- 방 꾸미기 아이템 -->
    ${itemsHTML}

    <!-- 자고 있는 양 -->
    <div style="display:flex; flex-direction:column; align-items:center; gap:8px; z-index:2;">
      ${buildSleepingSheepSVG(friend.step)}
      ${friend.isSleeping
        ? `<div class="speech-bubble" style="font-size:0.8rem; max-width:160px;">
            💤 달콤한 꿈 중...
           </div>`
        : `<div class="speech-bubble" style="font-size:0.8rem; max-width:160px;">
            메에~ 안녕!
           </div>`
      }
    </div>
  </div>
</div>`;
}

/** 방 배경 인라인 스타일 */
function getRoomBgStyle(bgId) {
  const map = {
    'bg_night_default': 'background: linear-gradient(180deg, #1a1040 0%, #2D1B4E 100%)',
    'bg_purple_dream':  'background: linear-gradient(180deg, #1E1B4B 0%, #3730A3 100%)',
    'bg_cozy_room':     'background: linear-gradient(180deg, #292147 0%, #1a1040 100%)',
  };
  return map[bgId] ?? map['bg_night_default'];
}

/** 방 아이템 이모지 렌더링 */
function buildRoomItems(room) {
  if (!room) return '';
  const iconMap = {
    carpet_purple: '🟣', carpet_pink: '🩷',
    cushion_moon:  '🌙', cushion_star: '⭐', cushion_cloud: '☁️',
    light_moon:    '🌕', light_star: '💫',
    ribbon_red:    '🎀', ribbon_pink: '🩷', ribbon_purple: '💜',
  };

  const items = [];
  if (room.carpet)  items.push({ icon: iconMap[room.carpet]  ?? '🟣', label: '카페트', pos: 'bottom:12px;left:50%;transform:translateX(-50%)' });
  if (room.cushion) items.push({ icon: iconMap[room.cushion] ?? '🌙', label: '방석',  pos: 'bottom:20px;right:20px' });
  if (room.light)   items.push({ icon: iconMap[room.light]   ?? '💫', label: '조명',  pos: 'top:16px;right:16px' });
  if (room.ribbon)  items.push({ icon: iconMap[room.ribbon]  ?? '🎀', label: '리본',  pos: 'top:16px;left:16px' });

  return items.map(it => `
<div style="position:absolute;${it.pos};font-size:1.8rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))" title="${it.label}">
  ${it.icon}
</div>`).join('');
}

/** 자고 있는 양 미니 SVG */
function buildSleepingSheepSVG(step = 1) {
  return `<svg viewBox="0 0 140 100" width="120" height="85" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))">
    <!-- 간단한 자는 양 -->
    <ellipse cx="70" cy="55" rx="${28 + step * 2}" ry="${20 + step}" fill="#FFF7EE"/>
    <ellipse cx="70" cy="55" rx="${22 + step * 1.5}" ry="${16 + step * 0.8}" fill="#FFE6C4"/>
    <!-- 얼굴 -->
    <ellipse cx="38" cy="58" rx="18" ry="16" fill="#FFD9A6"/>
    <!-- 볼 -->
    <ellipse cx="30" cy="62" rx="7" ry="4.5" fill="#FFB3C6" opacity="0.5"/>
    <ellipse cx="46" cy="62" rx="7" ry="4.5" fill="#FFB3C6" opacity="0.5"/>
    <!-- 자는 눈 -->
    <path d="M 30 55 Q 35 51 40 55" stroke="#2D1B0E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M 42 55 Q 47 51 52 55" stroke="#2D1B0E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- 코 -->
    <ellipse cx="41" cy="64" rx="4" ry="2.5" fill="#C4876A"/>
    <!-- ZZZ -->
    <text x="88" y="32" font-size="14" fill="#A78BFA" font-weight="900" opacity="0.9">Z</text>
    <text x="98" y="22" font-size="10" fill="#BBD6FF" font-weight="900" opacity="0.7">z</text>
    <text x="106" y="14" font-size="7" fill="#E5DDF2" font-weight="900" opacity="0.5">z</text>
  </svg>`;
}
