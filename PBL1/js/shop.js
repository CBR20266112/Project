/**
 * shop.js — 상점 아이템 관리, 구매, 장착
 */

import { SHOP_CATALOG, SHOP_CATEGORIES } from './constants.js';
import { getSheep, saveSheep, getItems, saveItems } from './storage.js';
import { showToast } from './app.js';
import { t } from './i18n.js';
import { getItemImagePath } from './decor.js';

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

function resolveItemName(item) {
  if (!item) return '';
  return t(`shop.item.${item.id}`) || item.name || '';
}

function resolveCategoryLabel(cat) {
  if (!cat) return '';
  return t(`shop.category.${cat.id}`) || cat.label || '';
}

// ─── 구매 ───

/**
 * 아이템 구매
 * @param {string} itemId
 * @returns {{ success: boolean, msg: string, woolLeft?: number }}
 */
export function purchaseItem(itemId) {
  const item  = findItem(itemId);
  if (!item) return { success: false, msg: t('shop.error.itemNotFound') };

  const items = getItems();
  if (items.owned.includes(itemId)) {
    return { success: false, msg: t('shop.error.itemOwned') };
  }

  const sheep = getSheep();
  if (sheep.wool < item.price) {
    return { success: false, msg: t('shop.error.insufficientWool', { missing: item.price - sheep.wool }) };
  }

  // 차감 & 저장
  sheep.wool      -= item.price;
  items.owned.push(itemId);

  saveSheep(sheep);
  saveItems(items);

  return { success: true, msg: t('shop.success.purchased', { itemName: resolveItemName(item) }), woolLeft: sheep.wool };
}

// ─── 장착 ───

/**
 * 아이템 장착/해제 토글
 * @param {string} itemId
 * @returns {{ success: boolean, msg: string, equipped: object }}
 */
export function toggleEquip(itemId) {
  const item  = findItem(itemId);
  if (!item) return { success: false, msg: t('shop.error.itemNotFound') };

  const items = getItems();

  // 미보유 아이템은 장착 불가 (무료 아이템 예외)
  if (item.price > 0 && !items.owned.includes(itemId)) {
    return { success: false, msg: t('shop.error.mustPurchaseFirst') };
  }

  const slot      = item.slot;
  const current   = items.equipped[slot];
  const isEquipped = current === itemId;

  items.equipped[slot] = isEquipped ? null : itemId;
  saveItems(items);

  const msg = isEquipped
    ? t('shop.success.unequipped', { itemName: resolveItemName(item) })
    : t('shop.success.equipped', { itemName: resolveItemName(item) });
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

  const itemName = resolveItemName(item);
  let badgeHTML = '';
  if (isEquipped)       badgeHTML = `<span class="shop-item-badge" style="background:var(--color-success);color:#000">${t('shop.badge.equipped')}</span>`;
  else if (isOwned)     badgeHTML = `<span class="shop-item-badge" style="background:rgba(134,239,172,0.3);color:var(--color-success)">${t('shop.badge.owned')}</span>`;

  const priceHTML = item.price === 0
    ? `<span class="shop-item-price" style="color:var(--color-success)">${t('shop.price.free')}</span>`
    : `<span class="shop-item-price">🧶 ${item.price}</span>`;

  const iconHTML = `<img class="shop-item-thumb" src="${getItemImagePath(item.id)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="shop-item-icon" style="display:none">${item.icon}</span>`;

  const isWearable = ['hat', 'ribbon', 'glasses', 'scarf'].includes(item.slot);
  const typeLabel = isWearable
    ? `<span style="font-size:0.6rem; color:var(--color-purple-soft); display:block; margin-bottom:2px; font-weight:800;">${t('shop.type.wearable')}</span>`
    : `<span style="font-size:0.6rem; color:var(--color-secondary); display:block; margin-bottom:2px; font-weight:800;">${t('shop.type.decor')}</span>`;

  return `
<div class="shop-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}"
     data-item-id="${item.id}"
     role="button"
     tabindex="0"
     aria-label="${itemName} ${item.price}${t('shop.aria.wool')}">
  ${badgeHTML}
  <div class="shop-item-icon-wrap">${iconHTML}</div>
  <div class="shop-item-name" style="margin-top: 4px;">
    ${typeLabel}
    ${itemName}
  </div>
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
  ${cat.icon} ${resolveCategoryLabel(cat)}
</button>`).join('');
}
