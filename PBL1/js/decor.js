/**
 * decor.js — 꾸미기 아이템 에셋 경로·레이아웃
 */

import { SHOP_CATALOG } from './constants.js';
import { getItems, saveItems } from './storage.js';

/** 서브페이지 여부에 따른 에셋 경로 접두사 */
export function getDecorAssetPrefix() {
  const href = window.location.href.toLowerCase();
  return href.includes('/pages/') || href.includes('\\pages\\') ? '../' : '';
}

/** 아이템 PNG 경로 */
export function getItemImagePath(itemId, prefix = null) {
  const p = prefix ?? getDecorAssetPrefix();
  const catalogItem = typeof itemId === 'string' ? findCatalogItem(itemId) : itemId;
  const resolvedId = catalogItem?.imageId || catalogItem?.id || itemId;
  return `${p}assets/item/${resolvedId}.png`;
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
  hat:     { top: '25%', left: '50%', width: '36%', transform: 'translate(-50%, -50%)', zIndex: 7 },
  ribbon:  { top: '54%', left: '34%', width: '18%', transform: 'translate(-50%, -50%) rotate(-10deg)', zIndex: 8 },
  glasses: { top: '49%', left: '50%', width: '22%', transform: 'translate(-50%, -50%)', zIndex: 9 },
  scarf:   { top: '68%', left: '50%', width: '30%', transform: 'translate(-50%, -50%)', zIndex: 8 },
};

function getWearablePlacement(itemId) {
  const pos = getItems().placements?.[itemId];
  if (!pos) return null;
  const top = Number(pos.top);
  const left = Number(pos.left);
  if (!Number.isFinite(top) || !Number.isFinite(left)) return null;
  return {
    top: `${Math.max(0, Math.min(100, top))}%`,
    left: `${Math.max(0, Math.min(100, left))}%`,
  };
}

export function saveWearablePlacement(itemId, left, top) {
  const items = getItems();
  items.placements = {
    ...(items.placements || {}),
    [itemId]: {
      left: Math.max(0, Math.min(100, Math.round(left * 10) / 10)),
      top: Math.max(0, Math.min(100, Math.round(top * 10) / 10)),
    },
  };
  saveItems(items);
}

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
    const custom = getWearablePlacement(item.id);
    const lay = { ...(WEARABLE_LAYOUT[item.category] ?? {}), ...(custom || {}) };
    const style = Object.entries(lay)
      .map(([k, v]) => {
        const cssKey = k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        return `${cssKey}:${typeof v === 'number' ? v : v}`;
      })
      .join(';');
    return `<img class="decor-wearable decor-${item.category}" data-item-id="${item.id}" src="${getItemImagePath(item.id, p)}" alt="${item.name}" style="position:absolute;pointer-events:none;object-fit:contain;${style}" loading="lazy" decoding="async">`;
  }).join('');
}

export function enableWearableDrag(container, { onSave = null } = {}) {
  // room-viewport 전체에서 드래그 대상을 찾을 수 있게 scope를 조절합니다.
  const scope = container?.querySelector('.room-viewport') || container;
  if (!scope) return;

  scope.querySelectorAll('.decor-wearable[data-item-id], .decor-room-prop[data-item-id]').forEach(img => {
    img.style.pointerEvents = 'auto';
    img.style.cursor = 'grab';
    img.style.touchAction = 'none';

    img.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      img.style.cursor = 'grabbing';
      try { img.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }

      const move = (ev) => {
        const rect = scope.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const left = ((ev.clientX - rect.left) / rect.width) * 100;
        const top = ((ev.clientY - rect.top) / rect.height) * 100;
        const clampedLeft = Math.max(0, Math.min(100, left));
        const clampedTop = Math.max(0, Math.min(100, top));
        img.style.left = `${clampedLeft}%`;
        img.style.top = `${clampedTop}%`;
        
        // 가구 드래그 시 transform 및 bottom 덮어쓰기 보정
        img.style.bottom = 'auto';
        img.style.transform = 'translate(-50%, -50%)';
        
        img.dataset.left = String(clampedLeft);
        img.dataset.top = String(clampedTop);
      };

      const up = () => {
        img.style.cursor = 'grab';
        try { img.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
        img.removeEventListener('pointermove', move);
        img.removeEventListener('pointerup', up);
        img.removeEventListener('pointercancel', up);
        const left = Number(img.dataset.left);
        const top = Number(img.dataset.top);
        if (Number.isFinite(left) && Number.isFinite(top)) {
          saveWearablePlacement(img.dataset.itemId, left, top);
          if (onSave) onSave(img.dataset.itemId);
        }
      };

      img.addEventListener('pointermove', move);
      img.addEventListener('pointerup', up);
      img.addEventListener('pointercancel', up);
    });
  });
}

/** 방 소품 img HTML */
export function buildRoomPropImg(item, prefix = null) {
  const p = prefix ?? getDecorAssetPrefix();
  const custom = getItems().placements?.[item.id];
  let style = '';
  
  if (custom) {
    // 저장된 위치가 있는 경우 커스텀 좌표 적용
    style = `top:${custom.top}%;left:${custom.left}%;transform:translate(-50%, -50%);z-index:${ROOM_LAYOUT[item.category]?.zIndex ?? 2};`;
  } else {
    // 기본 레이아웃 사용
    const lay = ROOM_LAYOUT[item.category] ?? { bottom: '10%', left: '50%', width: '40%', transform: 'translateX(-50%)', zIndex: 2 };
    style = Object.entries(lay)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${v}`)
      .join(';');
  }
  
  const anim = item.category === 'light' ? 'animation:twinkleSlow 3s ease infinite;' : '';
  const extraClass = item.category === 'cushion' ? 'decor-cushion' : '';
  return `<img class="decor-room-prop decor-${item.category} ${extraClass}" data-item-id="${item.id}" src="${getItemImagePath(item.id, p)}" alt="${item.name}" style="position:absolute;object-fit:contain;pointer-events:auto;cursor:grab;touch-action:none;${style}${anim}" loading="lazy" decoding="async">`;
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
