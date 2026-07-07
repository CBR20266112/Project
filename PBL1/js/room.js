/**
 * room.js — 방 꾸미기 렌더링 모듈
 */

import { getItems, getSheep } from './storage.js';
import { SHOP_CATALOG } from './constants.js';
import { getSheepSVG } from './sheep-renderer.js';
import {
  getEquippedItems,
  getBackgroundStyle,
  getWallpaperOverlay,
  buildRoomPropImg,
  buildWearableOverlays,
} from './decor.js';

const BG_GRADIENT = {
  bg_night_default: 'linear-gradient(180deg, #1a1040 0%, #0F0C29 100%)',
  bg_purple_dream:  'linear-gradient(180deg, #2D1B6E 0%, #1e0b36 100%)',
  bg_cozy_room:     'linear-gradient(180deg, #32251a 0%, #1b130e 100%)',
};

const ROOM_PROP_CATEGORIES = ['window', 'light', 'furniture', 'carpet', 'cushion'];

/**
 * 방 꾸미기 프리뷰를 특정 컨테이너에 렌더링
 * @param {HTMLElement} container
 * @param {object|null} equipped
 * @param {number} step
 * @param {string} pose
 * @param {string|null} assetPrefix pages/ 서브경로용 '../' 등
 */
export function renderRoom(container, equipped = null, step = 1, pose = 'idle', assetPrefix = null) {
  if (!container) return;

  if (!equipped) {
    equipped = getItems().equipped;
  }

  const sheep = getSheep();
  const currentStep = step ?? sheep.step;
  const activeItems = getEquippedItems(equipped);

  const bgItem = activeItems.find(i => i.category === 'background')
    || SHOP_CATALOG.find(i => i.id === 'bg_night_default');
  const wpItem = activeItems.find(i => i.category === 'wallpaper');
  const roomProps = activeItems.filter(i => ROOM_PROP_CATEGORIES.includes(i.category));

  const bgId = bgItem?.id ?? 'bg_night_default';
  const bgFallback = BG_GRADIENT[bgId] ?? BG_GRADIENT.bg_night_default;
  const bgStyle = getBackgroundStyle(bgItem, assetPrefix);
  const wallpaperHTML = getWallpaperOverlay(wpItem, assetPrefix);

  const propsHTML = roomProps
    .sort((a, b) => ROOM_PROP_CATEGORIES.indexOf(a.category) - ROOM_PROP_CATEGORIES.indexOf(b.category))
    .map(item => buildRoomPropImg(item, assetPrefix))
    .join('');

  const wearablesHTML = buildWearableOverlays(equipped, assetPrefix);

  container.innerHTML = `
<div class="room-viewport" style="width:100%;aspect-ratio:1.2;position:relative;overflow:hidden;border-radius:var(--radius-lg);background:${bgFallback};${bgStyle}box-shadow:var(--shadow-lg);">
  ${wallpaperHTML}
  ${propsHTML}
  <div class="room-sheep-wrapper" style="position:absolute;bottom:18px;left:50%;transform:translateX(-50%);width:140px;height:140px;z-index:4;display:flex;justify-content:center;align-items:center;overflow:visible;">
    ${getSheepSVG(currentStep, pose)}
    ${wearablesHTML}
  </div>
</div>`;
}
