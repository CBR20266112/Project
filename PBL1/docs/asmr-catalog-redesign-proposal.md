# SleepySheep ASMR Catalog Redesign Proposal

Date: 2026-07-16

Status: proposal only; no implementation changes made.

## Design goal

Rebuild the ASMR catalog around a smaller set of distinctive, sleep-oriented ambience scenes rather than generic sound labels. The new catalog should feel like a gentle bedtime world, not a list of isolated sound effects.

## Core principles

1. Scene-based ambience over sound categories
   - Each entry should represent a place, mood, or moment.
   - Names should feel soft, cozy, and story-like.

2. Consolidate duplicated sources
   - Merge entries that share the same core generator and differ only by volume or a small layer.
   - Keep only one representative for each underlying sound family.

3. Prefer peaceful sleep cues
   - Favor wind, hush, distant nature, soft room tone, and low rhythmic texture.
   - Reduce the number of generic noise variants such as white noise, brown noise, or pure pulse textures.

4. Keep the catalog small and memorable
   - Aim for about 8 strong scenes rather than 30+ loosely related sounds.

## Recommended ASMR catalog

| ID | Name | Core ambience | Why it fits SleepySheep |
| --- | --- | --- | --- |
| dreamy_meadow | Dreamy Meadow | Soft wind, distant insects, faint meadow warmth | Gentle and spacious; ideal for drifting off without feeling overly “sound-effecty.” |
| moonlight_ranch | Moonlight Ranch | Pasture breeze, crickets, distant sheep, low night air | A calm rural scene with a sleepy, comforting rhythm. |
| zen_garden | Zen Garden | River flow, wind chimes, soft bells, quiet space | Clear, restful, and distinctly meditative. |
| tea_house | Tea House | Rain hush, wood creak, faint kettle warmth, paper/room softness | Cozy and intimate; a refined indoor night scene. |
| library_evening | Library Evening | Page turns, soft room tone, distant clock, gentle air | Quiet and reflective, good for late-night focus and sleep. |
| forest_camp | Forest Camp | Low fire crackle, forest wind, distant birds, soft crickets | Strong bedtime atmosphere with warmth and depth. |
| dreamlike_atmosphere | Dreamlike Atmosphere | Deep low hum, soft bell tones, airy drift | A minimal, sleep-first ambience that feels more like a dream than a sound source. |
| cozy_hearth | Cozy Hearth | Fireplace warmth, gentle wind, soft room crackle | A simpler and more emotionally comforting version of the fire-based category. |

## How this replaces the current catalog

### Merge and simplify

The following current items should be consolidated into the scenes above:

- Rain + preset_rainy -> Tea House
- Ocean + preset_ocean -> Dreamy Meadow or a new “Quiet Shore” scene if a coastal option is desired
- River + water -> Zen Garden
- Fire + cottage + preset_cozy + preset_cottage -> Cozy Hearth or Forest Camp
- Brown + preset_deep -> Dreamlike Atmosphere
- Zen garden + preset_zen -> Zen Garden
- Koto + preset_traditional -> Tea House or Zen Garden
- Pencil / brush / chalk / preset_study -> Library Evening

### Retire or reduce

These entries are less distinctive and should be removed or moved to a future “bonus” section rather than the main sleep catalog:

- White noise
- Generic brown noise variants
- Pure pulse/tingle textures
- Standalone “fan” or “heartbeat” as primary entries

## Suggested naming style

The catalog should use soft, atmospheric names that evoke a place and a feeling:

- Dreamy Meadow
- Moonlight Ranch
- Zen Garden
- Tea House
- Library Evening
- Forest Camp
- Dreamlike Atmosphere
- Cozy Hearth

This naming style is clearer than “Rain,” “River,” or “White Noise,” and better matches the intended SleepySheep personality.

## Recommended presentation

### Main catalog view

Show the 8 scenes as the default list.

### Optional later expansion

If more content is desired later, add a second tier of “ambient variations” such as:

- Midnight Rain
- Quiet Harbor
- Snowlit Window
- Summer Porch

These should remain secondary, not compete with the core sleep-oriented catalog.

## Final recommendation

The best next version of SleepySheep ASMR is a compact catalog of 8 atmosphere-driven scenes. This will be easier to understand, more visually cohesive, and far more aligned with sleep-friendly ambience than the current generic sound list.
