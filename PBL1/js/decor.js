/**
 * decor.js — 꾸미기 아이템 에셋 경로·레이아웃
 */

import { SHOP_CATALOG } from './constants.js';
import { getItems } from './storage.js';

/** 서브페이지 여부에 따른 에셋 경로 접두사 */
export function getDecorAssetPrefix() {
  const href = window.location.href.toLowerCase();
  return href.includes('/pages/') || href.includes('\\pages\\') ? '../' : '';
}

/** 아이템 PNG 경로 */
export function getItemImagePath(itemId, prefix = null) {
  const p = prefix ?? getDecorAssetPrefix();
  return `${p}assets/item/${itemId}.png`;
}

/** 카탈로그 항목 조회 */
export function findCatalogItem(itemId) {
  return SHOP_CATALOG.find(i => i.id === itemId) ?? null;
}

/** 장착 중인 아이템 객체 목록 */
export function getEquippedItems(equipped = null) {
  const eq = equipped ?? getItems().equipped;
  return Object.entries(eq)
    .filter(([, id]) => id)
    .map(([slot, id]) => {
      const item = findCatalogItem(id);
      return item ? { ...item, slot } : null;
    })
    .filter(Boolean);
}

/** 양에게 붙이는 착용 슬롯 */
export const WEARABLE_SLOTS = ['hat', 'ribbon', 'glasses', 'scarf'];

/** 착용 오버레이 위치 (room-sheep-wrapper / sheep-container 기준 %) */
export const WEARABLE_LAYOUT = {
  hat:     { top: '12%', left: '50%', width: '54%', transform: 'translate(-50%, -50%)', zIndex: 7 },
  ribbon:  { top: '28%', left: '29%', width: '30%', transform: 'translate(-50%, -50%) rotate(-10deg)', zIndex: 8 },
  glasses: { top: '45%', left: '50%', width: '38%', transform: 'translate(-50%, -50%)', zIndex: 9 },
  scarf:   { top: '64%', left: '50%', width: '48%', transform: 'translate(-50%, -50%)', zIndex: 8 },
};

/** 방 소품 배치 (room-viewport 기준) */
export const ROOM_LAYOUT = {
  window:    { top: '3%',  left: '4%',  width: '36%', zIndex: 2 },
  light:     { top: '1%',  right: '5%', width: '26%', zIndex: 2 },
  furniture: { bottom: '5%', right: '3%', width: '30%', zIndex: 3 },
  carpet:    { bottom: '1%', left: '50%', width: '72%', transform: 'translateX(-50%)', zIndex: 1 },
  cushion:   { bottom: '8%', left: '50%', width: '42%', transform: 'translateX(-50%)', zIndex: 2 },
};

/** 착용 아이템 HTML 오버레이 */
export function buildWearableOverlays(equipped = null, prefix = null) {
  const p = prefix ?? getDecorAssetPrefix();
  const items = getEquippedItems(equipped).filter(i => WEARABLE_SLOTS.includes(i.category));

  return items.map(item => {
    const lay = WEARABLE_LAYOUT[item.category] ?? {};
    const style = Object.entries(lay)
      .map(([k, v]) => {
        const cssKey = k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        return `${cssKey}:${typeof v === 'number' ? v : v}`;
      })
      .join(';');
    return `<img class="decor-wearable decor-${item.category}" src="${getItemImagePath(item.id, p)}" alt="${item.name}" style="position:absolute;pointer-events:none;object-fit:contain;${style}" loading="lazy" decoding="async">`;
  }).join('');
}

/** 방 소품 img HTML */
export function buildRoomPropImg(item, prefix = null) {
  const p = prefix ?? getDecorAssetPrefix();
  const lay = ROOM_LAYOUT[item.category] ?? { bottom: '10%', left: '50%', width: '40%', transform: 'translateX(-50%)', zIndex: 2 };
  const style = Object.entries(lay)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${v}`)
    .join(';');
  const anim = item.category === 'light' ? 'animation:twinkleSlow 3s ease infinite;' : '';
  const extraClass = item.category === 'cushion' ? 'decor-cushion' : '';
  return `<img class="decor-room-prop decor-${item.category} ${extraClass}" src="${getItemImagePath(item.id, p)}" alt="${item.name}" style="position:absolute;object-fit:contain;pointer-events:none;${style}${anim}" loading="lazy" decoding="async">`;
}

/** 배경 이미지 스타일 */
export function getBackgroundStyle(bgItem, prefix = null) {
  const p = prefix ?? getDecorAssetPrefix();
  const id = bgItem?.id ?? 'bg_night_default';
  const path = getItemImagePath(id, p);
  return `background-image:url('${path}');background-size:cover;background-position:center;`;
}

/** 벽지 오버레이 */
export function getWallpaperOverlay(wpItem, prefix = null) {
  if (!wpItem) return '';
  const p = prefix ?? getDecorAssetPrefix();
  const path = getItemImagePath(wpItem.id, p);
  return `<div class="decor-wallpaper" style="position:absolute;inset:0;background-image:url('${path}');background-size:cover;background-position:center;opacity:0.55;pointer-events:none;z-index:0;"></div>`;
}
