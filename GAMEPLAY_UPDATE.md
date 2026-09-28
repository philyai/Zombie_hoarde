# Traversal and Flight update

This extension preserves the existing city, menus, save format, upgrades, scoring loop and pixel-art language. **Bus requires 8 zombies; airplane requires 16** under normal conditions. Being below either requirement never triggers a whole-horde removal: only individual bodies that hit a hazardous zone or fall are removed. Existing Rage and Giant power modifiers remain available.

## 1. Files inspected

`src/main.ts`, `src/style.css`, `src/config/GameConfig.ts`, `src/entities/{Horde,Obstacle,Civilian,Powerup}.ts`, `src/systems/{ChunkSpawner,CollisionManager,PowerupManager,ScoreManager,SaveManager,Feedback,AudioManager}.ts`, `src/scenes/GameScene.ts`, `src/art/PixelArt.ts`, `tests/game.spec.ts`, `playwright.config.ts`, `package.json`, `README.md`, `PRODUCT.md`, `DESIGN.md` and the supplied gameplay brief.

## 2. Files modified

- `src/art/PixelArt.ts`: new vehicle textures, requirement head icon and drone.
- `src/config/GameConfig.ts`: tighter Flight pickup radius.
- `src/entities/Horde.ts`: spatial input replay, controllable flight and actual-member deaths.
- `src/entities/Obstacle.ts`: compound zones, supporting roofs, pit artwork and aircraft anticipation.
- `src/scenes/GameScene.ts`: distance speed, milestones and Flight HUD states.
- `src/systems/ChunkSpawner.ts`: gated templates, gap validation, roof ownership and safe road reservation.
- `src/systems/CollisionManager.ts`: individual swept contacts and differentiated destruction rewards.
- `src/systems/PowerupManager.ts`: Flight phases and grounded completion.
- `src/systems/Feedback.ts`: animate the actual fallen member.
- `src/systems/AudioManager.ts`: heavier aircraft destruction cue.
- `src/systems/ScoreManager.ts`: awarded currency separate from pickup counting.
- `tests/game.spec.ts`, `README.md`: updated regression expectations and usage notes.

## 3. Files created

`src/art/LargeObstacleArt.ts`, `src/config/Traversal.ts`, `src/entities/ObstacleGeometry.ts`, `src/systems/DifficultyManager.ts`, `src/systems/FlightRouteManager.ts`, `tests/traversal.spec.ts`, `scripts/capture-extension.cjs`, this report, and QA captures in `.impeccable/review/extension/`.

## 4. Bus

A weathered 104 × 44 bus has windows, doors, broken glass, lamps and two wheels. Five collision zones describe its body and wheels; three upper surfaces support zombies. A successful smash produces a tumbling wreck, glass/debris, sound, shake, 250 bonus points, 5 coins and two rescued passengers. The requirement uses a pixel zombie head plus **8**.

## 5. Airplane

A grounded 256 × 92 wreck has a low broken nose/wing, cockpit, windows, fuselage, engine, landing gear, tail fin and tail wing. Seven zones and five supporting surfaces allow staged jumps instead of a single enormous rectangle. Its authored 720-pixel chunk provides a long approach, a `WRECK AHEAD / JUMP ON WING` sign and guiding coins. A short initial buckling animation precedes the falling wreck, smoke/debris, heavier cue and stronger shake. Rewards: 900 points, 15 coins and four passengers. The requirement displays **16**.

## 6. Actual scale

| Object | Texture dimensions | Width relative to car |
|---|---:|---:|
| Car | 40 × 23 px | 1× |
| Bus | 104 × 44 px | 2.6× |
| Airplane | 256 × 92 px | 6.4× |

The airplane is 2.46 times the bus width and over twice its height. Textures use integer pixel drawing and nearest-neighbor filtering in the existing 480 × 270 world. No external or generated raster assets were added.

## 7. Horde requirements

Normal grounded contact smashes the bus at 8 and airplane at 16. A nearby jump attempt is remembered for that encounter, so a sufficiently large horde cannot automatically smash away a failed jump. Rage retains its smash override and Giant retains doubled effective strength. Threshold tests isolate normal conditions.

## 8. Individual collisions

Every live member retains its own 11 × 23 body. Contact handling iterates actual bodies, removes only the touching member, disables that body's gameplay participation once, and tumbles the same visible sprite. Failed obstacles stay dangerous for subsequent members. Seven clear members and five colliding members in a 12-zombie bus attempt leave exactly seven. Survivors retain their identities; there is no percentage removal, tail removal or enlarged leader collider.

## 9. Pit sizes

| Size | Total width | Unlock | Treatment |
|---|---:|---:|---|
| Small | 40 px | Opening | Broken sewer and pipes |
| Medium | 60 px | 300 m | Flooded opening |
| Large | 80 px | 1,100 m | Exposed subway rails |
| Extra large | 160 px | 1,500 m | Broken bridge; two 56 px gaps and a 48 px island |

Gap validation integrates the shared jump parameters at the minimum introduction speed and requires clearance margin. Actual physics tests verify held jumps and the island's second jump, plus early, late and missed attempts. Falling is evaluated independently for each body below the ground edge.

## 10. Flight redesign

Flight lasts 10 seconds, with quick takeoff, controllable cruise and guided landing. Hold Space/Up/touch to rise; release to descend. Acceleration, velocity limits and soft upper/lower altitude bounds prevent instant movement. All members fly. Normal ground hazards are bypassed while Flight is active; they are not erased merely by being flown over. The existing HUD shows remaining time and Flight controls.

## 11. Airborne coins

The route manager cycles line, wave, high-low, ring and zigzag formations. Each contains 13 ordinary collectible coins and streams ahead within the remaining Flight range. Collection uses actual member overlaps and a small 14-pixel leader radius; Magnet remains a separate power. Later routes may place a sparse drone away from the coin path, starting at 1,000 m. Ring coins are a choice of path, not an all-coins completion requirement.

## 12. Safe Flight exit

At 20% remaining, the icon flashes, the HUD changes to `FLIGHT LAND`, and descending coins guide the approach. A reservation begins behind the rearmost member and extends well beyond the leader's predicted descent. Already-streamed hazards in that interval are disabled, pit ground is restored, and future intersecting chunks become clear road. Flight cannot deactivate until every survivor is grounded inside the reservation, even when the timer reaches zero. Light downward pressure stabilizes grounded contact for large hordes. Input cannot steer the group back into the air during guided descent.

## 13. Distance speed

`DifficultyManager.at(meters)` computes `66 + 46 × sqrt(min(1, meters / 3000))` pixels/second. It starts at 66, rises continuously, and caps at 112 at 3,000 m. Distance, not elapsed time, owns progression. Milestone messages appear each 500 m.

## 14. Obstacle density

Hazard selection probability rises from 38% toward 88%; eligible bus weight grows with distance. Tiers are easy below 250 m, medium below 600 m, hard below 2,000 m, then chaos. Aircraft unlock at 1,200 m, keep a low relative weight and require at least seven chunks between aircraft encounters. Late combinations retain recovery space, with extra inter-chunk road padding scaled to speed.

## 15. Procedural chunks

The five-part authored opening remains. Bus-route and airplane-pass were rebuilt around their larger dimensions. New medium, large and extra-large pit templates join a late medium-pit/bus combination. Flight formations and landing corridors are generated by their own route/reservation systems. Selection checks unlock distances, tier, spacing and aircraft cooldown.

## 16. Collision and physics

Arcade runs fixed physics substeps under one bounded gameplay delta. Swept AABB tests catch thin hazards crossed between positions. Compound-zone checks distinguish supporting tops from dangerous sides and avoid a fractional-corner false hit when walking off a roof. One-way static roof bodies are removed with spent or cleaned-up vehicles. Followers replay press/release at world positions, preserving jump location as speed changes. Live formation columns remain compact at maximum speed.

## 17–18. Bugs discovered and fixed

- Percentage/tail damage and spending a hazard after its first victim were replaced by actual-body losses.
- The old small flying airplane was replaced by grounded, traversable compound geometry.
- Fixed-height Flight became interactive, and expiry now waits for safe group landing.
- The first 80-pixel pit unlock was too early for the clearance margin; moved to 1,100 m.
- Swept collision initially treated leaving a bus roof as a side impact; supporting-edge handling fixes it.
- Scene shutdown can destroy the physics world before the scene listener runs; teardown now tolerates that order.
- Zero vertical pressure made large-horde grounded flags alternate and could prevent Flight completion; sustained light landing pressure fixes it.
- Smash coin awards no longer advance the coin-pickup upgrade counter.
- Test fixtures now preserve exact pit edges and remove injected hazards explicitly when testing a single contact. The normal hazards remain persistent.
- Stopped-loop screenshot fixtures initially skipped Phaser's resize polling; the capture script now refreshes scale explicitly. The actual running responsive tests use normal resize behavior.
- The finish review caught airborne sprites overlapping the Flight timer; the higher-clearance ceiling, including Giant allowance, and matching coin heights resolve it.
- A dead-horde test sampled coins across two live frames; its before/after assertion is now atomic so intervening legitimate pickups cannot cause a false failure.

## 19. Verification

`npm.cmd test`: **32 tests passed**. `npm.cmd run build`: TypeScript and Vite production build passed. `git diff --check`: passed. Tests cover normal bus hordes 1/7/8/20, airplane hordes 1/15/16/30, exact partial losses, below-threshold physical roof traversal, four pit sizes and timing failures, Flight steering and landing over a real pit plus aircraft, and distance settings at 0/250/500/1,000/1,500/2,000/3,000/10,000 m. Existing full flow, touch, pause, focus loss, retries, save migration, purchases, coin upgrades and bounded streaming remain covered. Maximum-speed simulation uses 50 members at 20/30/60/120 FPS; the powers test uses 60 members. The final visual review requested additional Flight HUD clearance; that focused correction is verified separately below.

Desktop 1440 × 900 and mobile-landscape 844 × 390 screenshots are staged runtime fixtures, inspected for visual consistency. They are not evidence of an uninterrupted human-played late-game run. Capture script runtime errors: none. The visual detector returned no findings on the changed visual targets.

After the final Flight HUD correction: all **3 affected checks passed** (60-member powers/expiry, progression/pattern invariants, interactive Flight with pit/aircraft landing). The production build passed again. Production preview returned HTTP 200, rendered its 480 × 270 canvas, handled Play/pause keyboard input without runtime errors, and exposed neither development test handle. The reviewer scored the single Flight HUD fix **resolved**, with disposition **ship** at that fix's scope.

## 20. Known limitations

- Automated Chromium/Edge browser simulation and touch emulation do not certify physical-phone performance, audio quality on real speakers, or subjective long-session balance.
- Late-game distance tests and streaming checks use controlled fixtures/accelerated simulation, not a human-played 3 km run.
- Physics is intentionally arcade-style. Vehicle zones approximate the pixel silhouette; supporting surfaces are stepped, not sloped polygons.
- XL pits require a second deliberate jump from the middle island; holding alone does not auto-jump.
- The aircraft approach uses an in-world warning and silhouette; it does not introduce a new airport biome.
- Vite retains the existing large Phaser bundle warning. No new dependencies were added.
