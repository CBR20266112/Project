# ASMR Audit Report

Date: 2026-07-16

Status: audit only; no code changes made.

## 1) Localization audit

### Summary

The app already routes ASMR and page text through the i18n layer, but several keys are missing from the Korean bundle. When those keys are absent, the app falls back to the default language (English), which is why the affected UI still appears in English after switching languages.

### A. Workshop / shop page

These strings are used by the workshop/shop UI in [pages/workshop.html](../pages/workshop.html) and [js/shop.js](../js/shop.js), but the corresponding localization keys are missing from the Korean bundle in [js/i18n.js](../js/i18n.js).

| File | String | Missing i18n key |
| --- | --- | --- |
| [pages/workshop.html](../pages/workshop.html) | "🏡 나의 아늑한 방 프리뷰" | `workshop.previewTitle` |
| [pages/workshop.html](../pages/workshop.html) | "🛒 상점 카테고리" | `workshop.categoryTitle` |
| [pages/workshop.html](../pages/workshop.html) | "아이템 구매" | `workshop.modal.purchaseTitle` |
| [pages/workshop.html](../pages/workshop.html) | purchase confirmation body | `workshop.modal.purchaseDesc` |
| [pages/workshop.html](../pages/workshop.html) | "구매 완료" | `shop.button.purchaseConfirm` |
| [pages/workshop.html](../pages/workshop.html) | "취소" | `shop.button.cancel` |
| [js/shop.js](../js/shop.js) | item placement success toast | `shop.toast.positionSaved` |
| [js/shop.js](../js/shop.js) | insufficient wool toast | `shop.toast.notEnoughWool` |
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
| [js/shop.js](../js/shop.js) | error messages for purchase/ownership | `shop.error.itemNotFound`, `shop.error.itemOwned`, `shop.error.insufficientWool`, `shop.error.mustPurchaseFirst` |
| [js/shop.js](../js/shop.js) | success messages | `shop.success.purchased`, `shop.success.equipped`, `shop.success.unequipped` |

### B. Friend page status text

The friend-list UI in [pages/friends.html](../pages/friends.html) and [js/friends.js](../js/friends.js) uses status strings that are missing from the Korean bundle.

| File | String | Missing i18n key |
| --- | --- | --- |
| [pages/friends.html](../pages/friends.html) | placeholder text in the add-friend input | `friends.inputPlaceholder` |
| [pages/friends.html](../pages/friends.html) | button label | `friends.searchButton` |
| [js/friends.js](../js/friends.js) | "Just now" / "minutes ago" / "hours ago" / "days ago" | `friends.status.justNow`, `friends.status.minutesAgo`, `friends.status.hoursAgo`, `friends.status.daysAgo` |
| [js/friends.js](../js/friends.js) | sleeping status | `friends.status.sleeping` |
| [js/friends.js](../js/friends.js) | last-seen text | `friends.status.lastSeen` |
| [js/friends.js](../js/friends.js) | room title | `friends.room.title` |
| [js/friends.js](../js/friends.js) | sleeping room title | `friends.room.titleSleeping` |
| [js/friends.js](../js/friends.js) | stats line | `friends.room.stats` |
| [js/friends.js](../js/friends.js) | locked-room message | `friends.room.locked` |
| [js/friends.js](../js/friends.js) | streak badge | `friends.streakBadge` |

### C. ASMR names and descriptions

The ASMR entries are localized through [js/sound.js](../js/sound.js), but many of the individual keys are missing from the Korean translation bundle in [js/i18n.js](../js/i18n.js). Because the lookup falls back to English, these entries appear in English when Korean is selected.

| File | String | Missing i18n key |
| --- | --- | --- |
| [js/sound.js](../js/sound.js) | Rain | `asmr.rain.name`, `asmr.rain.desc` |
| [js/sound.js](../js/sound.js) | Ocean Waves | `asmr.ocean.name`, `asmr.ocean.desc` |
| [js/sound.js](../js/sound.js) | Stream | `asmr.river.name`, `asmr.river.desc` |
| [js/sound.js](../js/sound.js) | Water Drops | `asmr.water.name`, `asmr.water.desc` |
| [js/sound.js](../js/sound.js) | Forest Dawn | `asmr.forest.name`, `asmr.forest.desc` |
| [js/sound.js](../js/sound.js) | Country Birds | `asmr.birds.name`, `asmr.birds.desc` |
| [js/sound.js](../js/sound.js) | Crickets | `asmr.bugs.name`, `asmr.bugs.desc` |
| [js/sound.js](../js/sound.js) | Wind | `asmr.wind.name`, `asmr.wind.desc` |
| [js/sound.js](../js/sound.js) | Snowy Night | `asmr.snow.name`, `asmr.snow.desc` |
| [js/sound.js](../js/sound.js) | Fireplace | `asmr.fire.name`, `asmr.fire.desc` |
| [js/sound.js](../js/sound.js) | Cabin | `asmr.cottage.name`, `asmr.cottage.desc` |
| [js/sound.js](../js/sound.js) | Sheep Sounds | `asmr.sheep.name`, `asmr.sheep.desc` |
| [js/sound.js](../js/sound.js) | Ranch Night | `asmr.ranch.name`, `asmr.ranch.desc` |
| [js/sound.js](../js/sound.js) | Fan | `asmr.fan.name`, `asmr.fan.desc` |
| [js/sound.js](../js/sound.js) | Pencil Writing | `asmr.pencil.name`, `asmr.pencil.desc` |
| [js/sound.js](../js/sound.js) | Brush Strokes | `asmr.brush.name`, `asmr.brush.desc` |
| [js/sound.js](../js/sound.js) | Chalk | `asmr.chalk.name`, `asmr.chalk.desc` |
| [js/sound.js](../js/sound.js) | Page Turning | `asmr.pages.name`, `asmr.pages.desc` |
| [js/sound.js](../js/sound.js) | White Noise | `asmr.white.name`, `asmr.white.desc` |
| [js/sound.js](../js/sound.js) | Brown Noise | `asmr.brown.name`, `asmr.brown.desc` |
| [js/sound.js](../js/sound.js) | Heartbeat | `asmr.heartbeat.name`, `asmr.heartbeat.desc` |
| [js/sound.js](../js/sound.js) | Soft Piano | `asmr.piano.name`, `asmr.piano.desc` |
| [js/sound.js](../js/sound.js) | Music Box | `asmr.musicbox.name`, `asmr.musicbox.desc` |
| [js/sound.js](../js/sound.js) | Kalimba | `asmr.kalimba.name`, `asmr.kalimba.desc` |
| [js/sound.js](../js/sound.js) | Koto Strings | `asmr.koto.name`, `asmr.koto.desc` |
| [js/sound.js](../js/sound.js) | Gayageum Strings | `asmr.gayageum.name`, `asmr.gayageum.desc` |
| [js/sound.js](../js/sound.js) | Zen Garden | `asmr.zen_garden.name`, `asmr.zen_garden.desc` |
| [js/sound.js](../js/sound.js) | Soft Tingle | `asmr.tingle_soft.name`, `asmr.tingle_soft.desc` |
| [js/sound.js](../js/sound.js) | Bell Tingle | `asmr.tingle_bell.name`, `asmr.tingle_bell.desc` |

## 2) ASMR content quality audit

### Source model

There are no external audio files or asset mappings in this implementation. The ASMR entries are synthesized in [js/sound.js](../js/sound.js) using Web Audio oscillators, noise generators, filters, and layered loops.

### A. Entries that share the same sound source

| Entry | Shared source / generator |
| --- | --- |
| `rain` and `preset_rainy` | both rely on the same rain-noise layer (`_asmrRain()` / `_asmrRainLayer()`) plus wind |
| `ocean` and `preset_ocean` | both use the same wave/noise layer (`_asmrOcean()` / `_asmrOceanLayer()`) |
| `river` and `water` | both use the river-layer generator (`_asmrRiver()` / `_asmrRiverLayer()`); `water` adds extra droplet tones |
| `fire`, `cottage`, `preset_cozy`, and `preset_cottage` | all use the same fire-layer generator (`_asmrFire()` / `_asmrFireLayer()`) with small variations in wind/cricket/bird layers |
| `brown` and `preset_deep` | both use brown noise (`_asmrBrown()` / `_asmrBrownLayer()`) |
| `zen_garden` and `preset_zen` | both use the same river + bells + wind pattern |
| `koto` and `preset_traditional` | both use the plucked-melody generator plus soft wind and bell textures |
| `pencil`, `brush`, and `preset_study` | all use scratch/noise-based writing textures with small variations |

### B. Entries whose audio does not match the description well

| Entry | Description | What the generated sound actually feels like |
| --- | --- | --- |
| `water` | “Tiny droplets and trickling water” | Mostly a stream-like river layer with a few extra drop-like tones; the audio is closer to a creek than to distinct droplets |
| `river` | “Gentle water flowing through a quiet creek” | Similar to `water`; the distinction is weak and the sound is not very creek-specific |
| `rain` | “Rain tapping on the window” | The output is a broad rain/noise bed rather than a window-specific, intimate rain texture |
| `preset_rainy` | “Rain and gentle wind mix” | Nearly the same as `rain` with only a softer wind layer |
| `preset_cozy` | “Campfire and gentle wind” | Very close to `fire`, with the wind layer being the main difference |
| `preset_cottage` | “Cabin, fire, wind, crickets” | This is functionally the same core experience as `cottage` plus a few added bird chirps |
| `preset_starry` | “Night pasture, crickets, and distant sheep” | The audio is mostly wind/cricket ambience with a small sheep layer; it is not very distinct from `ranch` |
| `preset_zen` | “Water, wind chimes, and soft bells” | Nearly identical to `zen_garden` |
| `preset_traditional` | “East Asian strings and soft ambience” | The sound is a generic plucked melody with soft wind and bells, not a strongly “traditional” instrument texture |
| `preset_study` | “Pencil, bookshelf, and calm indoor air” | The result is mostly scratch noise and page-turn textures; the “bookshelf/indoor air” aspect is not very specific |

### C. Recommended consolidation or replacement

1. Consolidate the highly overlapping pairs:
   - `rain` + `preset_rainy`
   - `ocean` + `preset_ocean`
   - `river` + `water`
   - `fire` + `preset_cozy`
   - `cottage` + `preset_cottage`
   - `brown` + `preset_deep`
   - `zen_garden` + `preset_zen`
   - `koto` + `preset_traditional`

2. Replace or redesign the weaker entries:
   - `water`: replace with a more clearly droplet-based or faucet-like texture, rather than a stream-like layer.
   - `preset_study`: add a stronger “book/room” signature, or replace it with a more distinct “notebook” or “library” texture.
   - `preset_starry`: if kept, increase the sheep and pasture character so the description feels less generic.

3. Prefer one clear identity per entry:
   - Keep one “rain” entry and one “cozy fire” entry.
   - Use presets for combinations, not near-duplicates of base sounds.
   - If a preset is just a slightly louder version of a base sound, it should be renamed or removed.

## Recommended next step

The highest-value fix is to add the missing Korean i18n keys first, then simplify the ASMR catalog by removing or replacing the most redundant presets so the names and descriptions better match the audio.
