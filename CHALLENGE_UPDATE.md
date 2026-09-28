# Challenge and horde survival update

This extends the existing game. It supersedes the balance and vehicle-passenger details in `GAMEPLAY_UPDATE.md`; the prior architecture and original pixel-art identity remain intact. The subsequent `VEHICLE_COLLISION_FIX.md` supersedes the participant-based push rule described below: grounded push readiness now matches the authoritative living horde count shown by the marker.

## 1. Files inspected

Inspected the gameplay configuration, traversal helpers, Horde, Civilian, Obstacle and its collision geometry, GameScene, ChunkSpawner, CollisionManager, DifficultyManager, FlightRouteManager, PowerupManager, ScoreManager, Feedback, PixelArt, existing gameplay/traversal tests, package scripts, and the incumbent PRODUCT/DESIGN documents.

## 2. Existing files modified in this extension

`src/config/Traversal.ts`, `src/art/PixelArt.ts`, `src/entities/Civilian.ts`, `src/entities/Horde.ts`, `src/entities/Obstacle.ts`, `src/entities/ObstacleGeometry.ts`, `src/systems/DifficultyManager.ts`, `src/systems/ChunkSpawner.ts`, `src/systems/CollisionManager.ts`, `src/scenes/GameScene.ts`, `tests/game.spec.ts`, `tests/traversal.spec.ts`, and `README.md`. Several of these files are shared with the preceding traversal extension.

## 3. Files created

`src/art/TerrainArt.ts`, `src/systems/ChallengeCatalog.ts`, `tests/challenges.spec.ts`, `scripts/capture-challenge.cjs`, this report, and staged QA evidence under `.impeccable/review/challenge/`.

## 4. Civilian changes

Routine authored civilian opportunities are singles. A rare, low-weight elevated recovery cache contains three. Survivors are placed after mines, behind vehicles, on raised road, and on intermediate pillars. Small patrol bounds keep them on their intended platforms. The opening still supplies enough recruits to teach conversion and the first car interaction.

## 5. Civilian frequency and free growth

Civilian acceptance falls from 72% toward a 22% floor; spacing between accepted opportunities grows from 340 to 1,100 world pixels. This gate applies to opportunities, not each member of the rare three-person cache. Ordinary vehicles and buses no longer grant free zombies. A rare airplane smash grants two, down from four. Vehicle scores and coin rewards remain.

## 6. Obstacle density

The opening now moves through recruits, a short pit, a car, a single mine, a small step and a power-up. The first pit starts at world x447, the car is at x745, and the mine at x936. Post-opening challenge selection rises from 78% to 97%, with more complicated chunks weighted later. Safe road and speed-scaled recovery remain between decisions.

## 7. Distance progression

Speed remains 66 to 112 pixels/second, reaching its cap at 3,000m. Complexity increases independently: one mine and 16px steps initially; two mines and 24px steps from 250m; three mines and 32px steps from 500m; four-mine sequences from 900m; advanced combinations from 1,500m onward. Buses unlock at 250m, airplanes at 1,200m. Aircraft have a longer encounter cooldown and lower weight. Large gaps unlock later than the suggested bands when the existing jump physics require it.

Deterministic generation check: seed 349, 180 selections at each distance. Rates are per 1,000 generated world pixels, not per minute. Hazards include discrete obstacles and terrain transitions. These samples demonstrate the overall trend; each adjacent row is not guaranteed monotonic.

| Distance | Civilians / 1,000px | Hazards / 1,000px | Mean complexity | Airplanes | Buses | Mines |
|---:|---:|---:|---:|---:|---:|---:|
| 0 | 1.419 | 3.095 | 1.000 | 0 | 0 | 12 |
| 250 | 1.048 | 2.714 | 1.106 | 0 | 12 | 26 |
| 500 | 0.752 | 3.503 | 1.411 | 0 | 9 | 76 |
| 750 | 0.619 | 3.982 | 1.694 | 0 | 4 | 49 |
| 1,000 | 0.621 | 3.927 | 1.806 | 0 | 13 | 69 |
| 1,500 | 0.242 | 4.212 | 2.172 | 1 | 9 | 88 |
| 2,000 | 0.199 | 4.159 | 2.156 | 1 | 19 | 84 |
| 3,000 | 0.233 | 4.280 | 2.167 | 2 | 19 | 113 |
| 5,000 | 0.144 | 4.305 | 2.283 | 3 | 15 | 127 |

## 8. Car requirement

The existing requirement remains **3**. Tests exercise 2, 3 and 4 participating zombies. A well-timed jump remains an alternative.

## 9. Bus requirement

The requirement remains **8**. Tests exercise 7, 8 and 9 participating zombies. The existing segmented collision shape and walkable roof remain; a successful smash awards 250 bonus points and five coins, with no free recruits.

## 10. Airplane requirement

The requirement remains **16**. Tests exercise 15, 16 and 17 participating zombies. Its grounded body, wing/fuselage/tail route and segmented collision geometry remain. A successful smash awards 900 bonus points, 15 coins and two recruits.

## 11. Live requirement markers

Vehicles show the original zombie-head icon and a compact live `CURRENT/REQUIRED` count before contact. `PUSH` and `JUMP` communicate readiness in words; green and peach reinforce those states. An opaque pixel plate protects readability against buildings. World-space positioning follows vehicles while keeping markers below the HUD. The count describes the horde; actual success still requires nearby grounded participants.

## 12. Push success and physical failure

First contact begins a 280–520ms struggle, shortening with distance. Front members compress, use an extended-arm push pose, and the vehicle rocks with dust. The participation count uses a connected nearby grounded chain, with no more than 24px between bodies and a 140px approach region. Airborne or disconnected distant zombies cannot satisfy it. Existing Rage/Giant effects remain applicable.

After the struggle, enough participants smash the vehicle and resume travel. An insufficient push leaves the vehicle intact and removes only members physically at its front contact band. Remaining members may reach it and attempt again; game over follows actual population loss. Pause freezes the struggle. A jumping member can be damaged individually without converting the encounter into a whole-horde penalty.

## 13. Pit variety

Single gaps include 24, 40, 60, 80 and 90px widths. The existing 160px multipart span retains its 48px middle island. Minimum distances protect jump reach: medium 300m, large 1,100m, multipart 1,500m, very large 2,200m. Raised/lowered edges use their own drawn height and fall threshold.

## 14. Stepping pillars

Easy, medium and hard pit–pillar–pit templates use 64, 48 and 32px landing surfaces. A later double-pillar route uses two 40px surfaces at different heights. Pillars have real static bodies, crisp caps and hazard-striped sides. Independent zombies can land or fall on either side. At maximum speed the double-pillar sequence requires shorter holds to land on the intermediate surfaces before jumping again.

## 15. Landmines

Original 16×9 pixel devices have a 14×7 collision body and a blinking indicator. Contact produces debris, smoke, a brief flash, shake and impact audio. A one-shot 26px blast checks the nearest point of each actual zombie body rectangle. Only bodies in that radius are lost; a safe airborne member survives. Existing Rage immunity remains.

## 16. Mine groups

Single, double and triple groups progress with distance. Four-mine patterns first appear as two pairs with room to land and jump again. A tight four-mine group unlocks at 2,500m, where the jump has adequate horizontal clearance. Spacing is at least 20px; groups use both 20px and 24px patterns. Mine–pit, pit–mine and bus–mine combinations have separate recovery space.

## 17. Terrain

Actual road tops occur at y192, 200, 208, 216, 224 and 240. Steps, lower sections, uneven sequences, raised cars and raised pits use matching static colliders and custom pixel tiles. The player must jump up significant ledges. A body that actually hits a vertical wall can die; other airborne members continue. No terrain-following teleport or global horde penalty is used.

## 18. Authored chunks

The new catalog contains 33 templates:

`tiny_pit`, `small_pit`, `medium_pit`, `large_pit`, `very_large_pit`, `pit_pillar_pit_easy`, `pit_pillar_pit_medium`, `pit_pillar_pit_hard`, `double_pillar_gap`, `step_up_easy`, `step_up_medium`, `step_down`, `uneven_sequence`, `raised_car`, `raised_pit`, `pit_then_step`, `mine_single`, `mine_double`, `mine_triple`, `mine_quad`, `mine_quad_tight`, `mine_then_pit`, `pit_then_mines`, `car_requirement`, `car_jump`, `bus_requirement`, `bus_jump`, `bus_after_pit`, `bus_mine_combo`, `airplane_intro`, `airplane_requirement`, `advanced_mixed_chunk`, `recovery_cache`.

Existing compatible chunks remain in the selection pool.

## 19. Generation safety

Validation checks standard-height entry/exit, non-overlapping surfaces, landing width, legal elevations, gap reach at the slowest eligible speed, step limits, spawn support, full hazard footprints, mine spacing/count/body clearance, and reaction/recovery boundaries. Unrelated challenges need at least 100px separation within new templates; pillar-linked gaps are validated as deliberate sequences. New chunks start with at least 75px reaction space and end with at least 65px recovery space, plus distance-scaled padding.

Flight's exit reservation replaces raised/lowered road with continuous safe road and clears mines and pits across the full landing corridor, including the trailing horde. Spent pit artwork is hidden along with its collision hazard. All authored routes in the automated traversal set have a successful physical path; no known impossible authored pattern remains.

## 20. Individual collisions

Pit removal uses each member's actual horizontal overlap and body depth below the relevant edge. Mines use body-distance tests. Vehicle damage uses actual collision zones; pushing counts physical participants. Terrain side impact acts on the contacting body. Original corpse sprites retain the visible falling/tumbling failure feedback. No random survivor subtraction was added.

## 21. Bugs found during implementation

The first four-mine arrangement exceeded early-speed jump clearance. A mixed-spacing triple was also too wide. Rear-member jump replay could occur one frame after crossing the intended launch coordinate. Raised pit art could remain after Flight cleared the obstacle. Distance accumulation could be incorrect if based only on the final physics substep. Vehicle passenger constants also became inconsistent with the new reward logic.

## 22. Fixes

Split early four-mine encounters into pairs, moved the tight four-mine challenge later, and tightened triple spacing. Added body-aware clearance validation. Replay now recognizes the frame that crosses a queued spatial input. Pit cleanup hides its graphics, and Flight flattens the complete reserved terrain range. Distance measures actual leader movement across the entire physics update. Passenger rewards now read the shared geometry configuration (bus zero, airplane two).

Test controls were also corrected: mines and cars require an earlier launch at higher speed, and narrow successive pillars require release before a full-height jump. The raised-car regression was a slow-speed launch point reused at a higher speed; the corrected car fixtures passed three consecutive runs. These are explicit timing fixtures, not hidden assistance in the game.

## 23. Verification

The complete pre-collision-fix suite passed **83 tests**. TypeScript/Vite production build passed; the production browser smoke returned HTTP 200, a 480px canvas, no runtime errors and no development handles. The fresh visual reviewer returned **ship** for the staged desktop/mobile views. The documenter hit a usage limit after its inspection; its documentation handoff was completed locally using the skill's fallback instructions. Coverage includes:

- 30 authored route traversals using real Arcade bodies.
- All nine requested car/bus/airplane threshold cases, live markers, participant exclusion, delayed success/failure, and pause/resume.
- First and middle mine blasts across group sizes, partial large-horde losses, one-shot blasts, and safe jumping.
- Horde sizes 1, 5, 10 and 20 across four pit/pillar layouts and four timing categories each (64 scenarios).
- Twenty-member traversal of 12 mine/elevation routes at maximum speed.
- Physical terrain-side losses, partial pit losses, and Flight landing over raised/lowered terrain plus mines.
- Generation at 0/250/500/750/1,000/1,500/2,000/3,000/5,000m.
- Existing variable-jump, roof traversal, frame-rate, menu, input, pause, death/retry, save, mission and upgrade regressions.

Desktop/mobile visual fixtures are under `.impeccable/review/challenge/`. They show staged gameplay states and have a separate browser-error log; they do not represent an uninterrupted manual run.

## 24. Limitations

Automated browser coverage runs in installed Microsoft Edge. Portrait/mobile checks use browser viewports, not physical phones. Authored traversal and seeded generation checks establish tested feasible routes, not a proof for every random seed, power-up combination or player input. Difficulty enjoyment still benefits from human playtesting. Timed screenshots cannot prove animation quality alone; the mechanical suite separately checks interaction duration and state. The existing Vite warning about the Phaser bundle size remains a performance consideration, not a build failure.
