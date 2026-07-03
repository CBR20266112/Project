/**
 * shop.js — 상점 아이템 관리, 구매, 장착
 */

import { SHOP_CATALOG, SHOP_CATEGORIES } from './constants.js';
import { getSheep, saveSheep, getItems, saveItems } from './storage.js';
import { showToast } from './app.js';

// ─── 조회 ───

/** 카테고리 필터링 */
export function getItemsByCategory(category = 'all') {
  if (category === 'all') return SHOP_CATALOG;
  return SHOP_CATALOG.filter(i => i.category === category);
}

/** 아이템 ID로 찾기 */
export function findItem(id) {
  return SHOP_CATALOG.find(i => i.id === id) ?? null;
}

// ─── 구매 ───

/**
 * 아이템 구매
 * @param {string} itemId
 * @returns {{ success: boolean, msg: string, woolLeft?: number }}
 */
export function purchaseItem(itemId) {
  const item  = findItem(itemId);
  if (!item) return { success: false, msg: '존재하지 않는 아이템이에요.' };

  const items = getItems();
  if (items.owned.includes(itemId)) {
    return { success: false, msg: '이미 보유한 아이템이에요.' };
  }

  const sheep = getSheep();
  if (sheep.wool < item.price) {
    return { success: false, msg: `양털이 부족해요! (${item.price - sheep.wool}개 더 필요)` };
  }

  // 차감 & 저장
  sheep.wool      -= item.price;
  items.owned.push(itemId);

  saveSheep(sheep);
  saveItems(items);

  return { success: true, msg: `${item.name}을(를) 구매했어요! 🎉`, woolLeft: sheep.wool };
}

// ─── 장착 ───

/**
 * 아이템 장착/해제 토글
 * @param {string} itemId
 * @returns {{ success: boolean, msg: string, equipped: object }}
 */
export function toggleEquip(itemId) {
  const item  = findItem(itemId);
  if (!item) return { success: false, msg: '존재하지 않는 아이템이에요.' };

  const items = getItems();

  // 미보유 아이템은 장착 불가 (무료 아이템 예외)
  if (item.price > 0 && !items.owned.includes(itemId)) {
    return { success: false, msg: '먼저 구매해야 장착할 수 있어요.' };
  }

  const slot      = item.slot;
  const current   = items.equipped[slot];
  const isEquipped = current === itemId;

  items.equipped[slot] = isEquipped ? null : itemId;
  saveItems(items);

  const msg = isEquipped ? `${item.name} 해제됐어요.` : `${item.name} 장착했어요! ✨`;
  return { success: true, msg, equipped: items.equipped };
}

// ─── UI 렌더링 ───

/**
 * 상점 아이템 카드 HTML 생성
 * @param {object} item SHOP_CATALOG 항목
 * @param {string[]} owned 보유 아이템 ID 배열
 * @param {object} equipped 장착 아이템 map
 * @returns {string} HTML 문자열
 */
export function buildShopItemHTML(item, owned, equipped) {
  const isOwned    = owned.includes(item.id);
  const isEquipped = Object.values(equipped).includes(item.id);

  let badgeHTML = '';
  if (isEquipped)       badgeHTML = `<span class="shop-item-badge" style="background:var(--color-success);color:#000">착용중</span>`;
  else if (isOwned)     badgeHTML = `<span class="shop-item-badge" style="background:rgba(134,239,172,0.3);color:var(--color-success)">보유</span>`;

  const priceHTML = item.price === 0
    ? `<span class="shop-item-price" style="color:var(--color-success)">무료</span>`
    : `<span class="shop-item-price">🧶 ${item.price}</span>`;

  return `
<div class="shop-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}"
     data-item-id="${item.id}"
     role="button"
     tabindex="0"
     aria-label="${item.name} ${item.price}양털">
  ${badgeHTML}
  <div class="shop-item-icon">${item.icon}</div>
  <div class="shop-item-name">${item.name}</div>
  ${priceHTML}
</div>`;
}

/**
 * 카테고리 탭 HTML 생성
 * @param {string} activeCategory
 * @returns {string}
 */
export function buildCategoryTabsHTML(activeCategory = 'all') {
  return SHOP_CATEGORIES.map(cat => `
<button class="tab-item ${cat.id === activeCategory ? 'active' : ''}"
        data-category="${cat.id}">
  ${cat.icon} ${cat.label}
</button>`).join('');
}
