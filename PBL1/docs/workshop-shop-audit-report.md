# Workshop / Shop Audit Report

Date: 2026-07-16

Status: audit only; no code changes made.

## 1) Localization audit

### Summary

The workshop/shop UI is driven by [pages/workshop.html](../pages/workshop.html), [js/shop.js](../js/shop.js), [js/constants.js](../js/constants.js), and [js/decor.js](../js/decor.js). The catalog and item names are defined in code, while item images are resolved by filename convention using the item ID.

The main issue is that several workshop/shop strings are still not present in the Korean translation bundle in [js/i18n.js](../js/i18n.js). When a key is missing, the app falls back to the default locale (English), which makes the UI appear partially unlocalized.

### A. Workshop page text still missing Korean keys

| File | Current text | Missing i18n key |
| --- | --- | --- |
| [pages/workshop.html](../pages/workshop.html) | "🏡 나의 아늑한 방 프리뷰" | `workshop.previewTitle` |
| [pages/workshop.html](../pages/workshop.html) | "🛒 상점 카테고리" | `workshop.categoryTitle` |
| [pages/workshop.html](../pages/workshop.html) | "아이템 구매" | `workshop.modal.purchaseTitle` |
| [pages/workshop.html](../pages/workshop.html) | purchase confirmation body | `workshop.modal.purchaseDesc` |
| [pages/workshop.html](../pages/workshop.html) | "구매 완료" | `shop.button.purchaseConfirm` |
| [pages/workshop.html](../pages/workshop.html) | "취소" | `shop.button.cancel` |

### B. Shop runtime text still missing Korean keys

| File | Current text | Missing i18n key |
| --- | --- | --- |
| [js/shop.js](../js/shop.js) | position saved toast | `shop.toast.positionSaved` |
| [js/shop.js](../js/shop.js) | not enough wool toast | `shop.toast.notEnoughWool` |
| [js/shop.js](../js/shop.js) | item placed on sheep toast | `shop.toast.itemPlacedOnSheep` |
| [js/shop.js](../js/shop.js) | drag-to-equip failure toast | `shop.toast.dragEquipFail` |
| [js/shop.js](../js/shop.js) | drag prompt toast | `shop.toast.dragEquipPrompt` |
| [js/shop.js](../js/shop.js) | empty category state | `shop.emptyState.noItems` |
| [js/shop.js](../js/shop.js) | free price label | `shop.price.free` |
| [js/shop.js](../js/shop.js) | wearable type label | `shop.type.wearable` |
| [js/shop.js](../js/shop.js) | decor type label | `shop.type.decor` |
| [js/shop.js](../js/shop.js) | equipped badge | `shop.badge.equipped` |
| [js/shop.js](../js/shop.js) | owned badge | `shop.badge.owned` |
| [js/shop.js](../js/shop.js) | aria label suffix | `shop.aria.wool` |
| [js/shop.js](../js/shop.js) | purchase/ownership/error messages | `shop.error.itemNotFound`, `shop.error.itemOwned`, `shop.error.insufficientWool`, `shop.error.mustPurchaseFirst` |
| [js/shop.js](../js/shop.js) | purchase/equip success messages | `shop.success.purchased`, `shop.success.equipped`, `shop.success.unequipped` |

### C. Friend page status text also shows a related localization gap

| File | Current text | Missing i18n key |
| --- | --- | --- |
| [pages/friends.html](../pages/friends.html) | add-friend input placeholder | `friends.inputPlaceholder` |
| [pages/friends.html](../pages/friends.html) | search button | `friends.searchButton` |
| [js/friends.js](../js/friends.js) | status/time labels | `friends.status.justNow`, `friends.status.minutesAgo`, `friends.status.hoursAgo`, `friends.status.daysAgo` |
| [js/friends.js](../js/friends.js) | sleeping state | `friends.status.sleeping` |
| [js/friends.js](../js/friends.js) | last-seen text | `friends.status.lastSeen` |
| [js/friends.js](../js/friends.js) | room title variants | `friends.room.title`, `friends.room.titleSleeping` |
| [js/friends.js](../js/friends.js) | room stats line | `friends.room.stats` |
| [js/friends.js](../js/friends.js) | locked-room message | `friends.room.locked` |
| [js/friends.js](../js/friends.js) | streak badge | `friends.streakBadge` |

## 2) Catalog / asset integrity audit

### A. Asset resolution model

The shop item UI resolves image files from the catalog item ID using [js/decor.js](../js/decor.js):

- image path format: `assets/item/{itemId}.png`
- item data source: [js/constants.js](../js/constants.js)

That means content integrity depends on two things:

1. the catalog item ID exists in the item asset folder;
2. the asset visually matches the item name/category meaning.

### B. Catalog-to-asset check

A file-level check against the current catalog and the files inside [assets/item](../assets/item) shows that the catalog IDs and the image files are mostly aligned, but the system still relies on manual visual review for correctness.

Observed facts:

- The major base items have matching PNG files, including ribbons, hats, glasses, scarves, cushions, carpets, lights, windows, wallpapers, furniture, and backgrounds.
- The UUID-based items also have matching PNG files under [assets/item](../assets/item).
- The system has no explicit metadata mapping for “expected visual type” versus “actual visual type”; visual correctness is inferred from the item name and category.

### C. Likely content mismatches worth reviewing

These items are the highest-risk cases because their names and category meaning may not visually line up with the actual image asset:

| Item ID | Catalog name | Category | Review note |
| --- | --- | --- | --- |
| `hat_star` | 별 모자 | hat | confirm the asset truly reads as a star-themed hat rather than a generic cap |
| `hat_flower` | 꽃 머리띠 | hat | confirm the asset is a flower headband rather than a hat silhouette |
| `pajamaHat` | 파자마 모자 | hat | confirm the asset matches a sleepwear-style hat and not a different head accessory |
| `headphones_lavender` | 라벤더 헤드폰 | hat | confirm the asset visually reads as headphones rather than a hat |
| `ribbon` | 민트 리본 | ribbon | confirm the asset is a ribbon and not a generic bow/decoration |
| `ribbon_red` / `ribbon_pink` / `ribbon_purple` | color variants | ribbon | confirm the color-coded assets are visually distinguishable |
| `scarf_red_knit` | 빨간 니트 목도리 | scarf | confirm the asset visually represents a knit scarf rather than a flat neck accessory |
| `ballOfYarn` | 뜨개질 실타래 | furniture | confirm the asset is a yarn ball and not an unrelated object |
| `star_yellow` | 노란 별 장식 | furniture | confirm the asset is a decorative star and not a hat or light icon |
| `bg_night_default` / `bg_purple_dream` / `bg_cozy_room` | background items | background | confirm the visual style aligns with the intended room scene |

### D. Recommended next step

1. Add the missing Korean localization keys for workshop/shop and friends UI strings.
2. Review the highest-risk item assets visually and rename or replace any that do not match the catalog name/category expectation.
3. Add explicit item metadata later if the content pipeline is expanded, so asset integrity can be checked programmatically.
