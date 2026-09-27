# Implementation and verification

## Architecture found

Phaser 3.90 with Arcade Physics and a Vite/TypeScript build. Four existing scenes (Boot, Menu, Game, GameOver) generate/load assets, own UI and run state. The original Horde, Civilian, Obstacle, Powerup, ChunkSpawner, CollisionManager, ScoreManager and SaveManager boundaries were retained. The detailed pre-change findings are in [AUDIT.md](AUDIT.md). No `zombie-horde-runner-gdd.md` exists in the supplied project; the attached request is the baseline.

## Bugs repaired

- Ground-gated variable-height jumping replaces unlimited upward acceleration. It has a 120ms buffer, 85ms coyote window, 220ms maximum hold and bounded falling speed.
- Input edges are queued, so taps occurring between animation frames register. Holding Space does not cause repeated landing jumps.
- Every horde member has a forgiving independent body. Press/release history is delayed according to each member's distance from the leader, allowing the whole group to clear a correctly timed pit.
- Removed the growing invisible leader hitbox and the fake follower population cap. Pit victims fall without teleporting a replacement into the air.
- Spent obstacles and consumed pickups are processed once; zero population cannot collect or revive. Population cannot become negative.
- Pause freezes physics, gameplay clocks, power-ups, feedback, timers and tweens. Focus loss pauses. Resume does not turn a UI click into a jump.
- Retry resets state and listeners; shutdown releases colliders, entities and timers.
- Removed automatic pits between every chunk. The opening uses authored sequencing and later templates have spacing/bounds validation.
- Corrected double canvas centering and preserved uniform scaling on resize.
- Coin upgrade bonuses count pickups independently of rewarded currency, including during coin boost.

## Gameplay and horde experience

The camera holds the leading member near 30% of the screen. The run starts with one zombie plus purchased starting upgrades. Six civilian variants panic/run, then convert with a bite frame, particles, sound, popup and counter feedback. Four zombie palettes use six-frame articulated running, with jump/fall/land poses and animated knockback or pit falls on loss. All population members are real rendered sprites; large hordes overlap into a dense crowd.

Cars, trucks, buses and armored vehicles require 3/5/8/12 members. Barricades require 2. Eligible vehicles smash into rotating debris, rescue a civilian and award score. Insufficient hordes lose members and may continue. Downward barricade smashing and the original flight/aerial-hazard concept remain. Spikes, electric barriers, moving cars and telegraphed falling cargo provide different hazards.

At zero population, physics and spawning stop, the last loss animation settles for approximately 850ms, and results appear. Results report score, distance, peak horde, infections, coins, best and record status. Retry starts a new scene without a page reload. Abandoning/restarting through pause banks the current run once.

## World and procedural generation

The original chunk system now has an authored introductory sequence, coin arcs and a validated weighted pool. Easy/medium/hard/chaos tiers add hazard variety while speed rises from 66 to a capped 112 pixels/second. Validation rejects crowded hazard boundaries, overlapping hazards, oversized pits, civilian/hazard overlap and out-of-bounds spawns. Cleanup was exercised across 200,000 virtual pixels.

CityWorld separates a biome descriptor from four scrolling scenery layers, a stepped cratered moon, windows, roof details, signs, lamps, fences, hydrants and street debris. Foreground ground tiles move at world speed; scenery has no collision bodies. City is the sole implemented biome.

## UI, art and audio

Original source-generated pixel sprites and a hand-authored 5x7 bitmap alphabet replace prototype shapes and system-font labels. Textures are cached at boot with nearest filtering. The 480x270 virtual viewport preserves aspect ratio with letterboxing.

The animated menu exposes Play, Missions, Upgrades and Settings. The compact HUD includes distance, score, coin/population icons, power icons/timers and pause. The pause panel occupies 43% of viewport width and includes resume/restart/settings/menu. Buttons have hover, press, keyboard focus and disabled states with larger touch hit areas.

AudioManager synthesizes original square-wave jump, landing, coin, conversion, hit, smash, power, mission, death and click cues plus a simple optional music pattern. Sound, music and shake settings persist. Effects use a capped reusable pool of hard-edged particles.

## Progression

Five independently timed powers: magnet attraction, rage protection/destruction, giant size and doubled smash strength, flight, and doubled coin value. HUD timers disappear on expiry. Three persistent missions track conversions, vehicles and coin pickups, granting rewards once. Five upgrade tracks affect starting population, magnet/rage duration, coin bonuses and supply frequency. SaveManager migrates the original three-field save in place, validates/caps data and maintains an in-memory fallback if browser storage is unavailable.

## Files modified

`.gitignore`, `package.json`, `package-lock.json`, `src/main.ts`, `src/style.css`, `src/config/GameConfig.ts`, every existing scene in `src/scenes`, every existing entity in `src/entities`, and the existing four modules in `src/systems`.

## Files created

- `src/art/PixelArt.ts`, `src/art/CityWorld.ts`, `src/ui/PixelUI.ts`.
- `src/systems/AudioManager.ts`, `Feedback.ts`, `PowerupManager.ts`, `src/vite-env.d.ts`.
- `tests/game.spec.ts`, `playwright.config.ts`, `scripts/capture.cjs`.
- `AUDIT.md`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `README.md`, this report and QA captures in `artifacts`.

## Test evidence

Final checks: **11 Playwright tests passed**, `npm.cmd run build` passed, and `git diff --check` passed. A separate production-preview smoke loaded the menu and started play without browser errors; development globals stayed absent even with `?debug`. Vite's bundle-size advisory remains as noted below.

The complete flow test passed in an actual headless Edge browser. It naturally plays the introductory recruitment, coin trail and pit jump, then tests survivable damage, vehicle smashing and a supply pickup. It verifies pause/resume, delayed death, banked coins/best, clean retry, menu navigation and a purchased upgrade applying to the next run. Controlled obstacle insertion makes damage/death deterministic; currency is seeded for the purchase branch rather than pretending to have earned it naturally.

Additional browser checks cover short/held jumps; no automatic repeat; pause during flight/jump; focus loss; repeated restarts/listener counts; all five power states and expiry; 60+ rendered members; no collection after death; old/corrupt saves; one-time mission rewards; coin-upgrade accounting; simultaneous civilians; overlapping fatal hazards; bounded streaming cleanup; touch jump/pause; centered resize at desktop/landscape/portrait; and 30/60/120 FPS simulation consistency.

Visual inspection covered desktop menu/gameplay/pause/missions/upgrades/settings and mobile landscape gameplay/pause/results. An independent reviewer found uneven letterboxing and overlapping early horde silhouettes; both were corrected and the reviewer scored both fixes resolved. The mechanical design detector returned no findings. This is browser automation plus human-style screenshot inspection, not physical-device playtesting or listening QA.

## Limitations and performance

- One city, four zombie palettes, six civilian palettes, three finite missions and five upgrades are implemented. No cosmetic collection or extra worlds yet.
- Audio is deliberately small procedural chiptune audio; it is not a full composed soundtrack. No listening test or physical touchscreen session was performed.
- Large hordes have all sprites present but substantial visual overlap. The 61-member headless sample rendered all 61 with 179 scene objects; this is a smoke measurement, not a sustained hardware benchmark.
- Physics uses 60Hz substeps and shares a maximum 50ms update delta with gameplay. Below 20 FPS the simulation slows instead of trying to catch up through unbounded steps.
- Particle effects are pooled/capped at 100. Chunk entities are created at chunk boundaries and destroyed offscreen; they are not all pooled. Normal active objects remained bounded in the long-stream test.
- The production engine/application bundle is approximately 351KB gzip; Vite emits its large-chunk advisory. Build success does not establish production deployment.
- Scene menus remain canvas controls: keyboard operation is supported, but full screen-reader navigation is not implemented. Portrait stays correctly letterboxed; landscape is the intended phone orientation.
- Browser storage denial preserves data only for the current session. There is no cloud save.
- Authored-template validation and tested flows improve fairness but do not prove every randomized sequence or every real-device performance condition.

Recommended next work: physical phone/desktop playtesting, longer difficulty-balance sessions, a composed soundtrack, more mission content and the next biome. No known blocker remains in the tested core flow; untested areas above are not claimed as verified.

Gameplay reference consulted: the developer's [official App Store listing](https://apps.apple.com/af/app/zombie-tsunami/id529652920), limited to one-touch horde growth and replay principles. All shipped pixel drawings, lettering, sounds and chunk sequences are original source-authored assets.
