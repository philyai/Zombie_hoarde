# Source audit

Baseline: Phaser 3.90, TypeScript and Vite. WebGL/Canvas auto renderer at 384x216 with nearest-neighbor scaling. Arcade Physics advances a single leader; followers are nonphysical images sampled from a distance-indexed history ring. Boot generates all textures synchronously. Menu, Game and GameOver scenes follow Boot. GameScene owns input, camera, pause flags and HUD. ChunkSpawner owns five physics groups and weighted templates. CollisionManager owns overlaps. ScoreManager stores distance, coins, conversions and peak population. SaveManager validates three numeric localStorage fields under the v1 key.

## Confirmed defects before editing

- Jump is midair upward acceleration, with no grounded gating, buffer or coyote time; release forces immediate downward velocity.
- Horde body expands behind the leader, so empty space collects/hits objects. Followers have no independent hazard collision.
- Population can exceed the visible follower cap. Damage destroys sprites immediately.
- Pit replacement teleports the leader upward; a per-pit boolean shields replacements.
- Every chunk boundary inserts a 16px pit, including introductory lanes.
- Vehicles have no population requirement. Only fences/cars support a downward-velocity smash.
- Game over starts immediately after disabling the final sprite.
- Pause freezes physics/tweens but not timers, animation or keyboard/pointer state. Focus loss has no explicit pause.
- Coin and civilian guards prevent duplicate pickups, but same-frame callbacks after fatal damage can still award score.
- Menu/backdrop are static; all characters are tiny generated placeholders with no animation frames.
- Save lacks upgrades, missions and settings. No tests, audio system, accessibility controls or debug overlay.

## Existing behavior to preserve

Automatic forward movement, bounded speed ramp, Space/Up/pointer controls, flight, aerial hazards, diving into breakable obstacles, critical mass reward, weighted chunks, offscreen cleanup, score/distance/coin saves, fast scene retry.

## Implementation boundary

Retain engine, scenes and entity/system boundaries. Change all source modules as needed; add isolated art, world, audio, feedback, progression and shared UI modules plus meaningful browser/system tests. No GDD or external art/audio assets exist in the checkout. The supplied request is the design baseline. No deployment is requested.
