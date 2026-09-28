# Vehicle collision resolution fix

This supersedes the participant-count rule in `CHALLENGE_UPDATE.md`. UI layout, art, obstacle requirements and difficulty tuning are unchanged by this fix.

## 1. Root cause

Two deterministic regressions reproduced the reported failure before implementation:

- **Count disagreement:** a car displayed `4/3 PUSH`, but `CollisionManager.update()` decided success from a spatially connected participant subset. Four living members with only the front member nearby caused that member to die and left the car intact (4 → 3).
- **Missing interaction lock:** after grounded contact started a successful car push, a second member overlapping the car while rising bypassed the grounded-push branch and entered `loseMember()`. The car subsequently broke, but the horde had already lost that member (4 → 3).

An additional inspected issue was a persistent `jump` intent set while the leader was airborne near a vehicle, even if the leader landed before reaching it. Grounded approaches now clear that stale intent; a dedicated regression checks this transition.

Before-fix observations are preserved in `.impeccable/review/challenge/vehicle-reproduction.json`. The development trace in `vehicle-debug-trace.json` records one `start-success` and one `break-success`, both retaining 4 living members. The production `?debug` smoke records no obstacle logs, no development handles and no browser errors.

## 2. Exact files

Production changes: `src/systems/CollisionManager.ts`, `src/entities/Obstacle.ts`, `src/scenes/GameScene.ts`.

Tests: new `tests/vehicle-resolution.spec.ts`; updated the conflicting participant-count expectation in `tests/challenges.spec.ts`.

Documentation: this report, `CHALLENGE_UPDATE.md`, `README.md`. The working tree also contains the preceding gameplay extensions; those are not all changes from this bug fix.

## 3. Collision handlers involved

The Arcade `worldstep` event invokes `checkObstacles()`, which sweeps each living member against actual obstacle zones and calls `resolveObstacle()`. `update()` advances the push duration. `smash()` disables the obstacle and awards rewards. `loseMember()` calls `Horde.removeMember()`, which synchronously removes the member from the live registry before showing its corpse animation.

Ground collision callbacks handle actual terrain-wall damage; overlap callbacks handle civilians, coins and power-ups. Roof colliders are one-way landing surfaces. Pits, mines and off-world falls remain separate physical causes. `GameScene.update()` checks the authoritative horde after these operations and invokes `finishRun()` only at zero.

## 4. Duplicate callbacks

Multiple member contacts and repeat physics notifications are normal. The defect was that they could independently enter incompatible push and lethal paths, not evidence of multiple registered world listeners in the original run. A push is now published synchronously before the next member is resolved. Additional callbacks join the existing interaction; they cannot restart its timer or execute ordinary vehicle damage.

`smash()` also checks the return of `markSpent()` before effects, score, coins or recruits. Repeated break calls cannot duplicate rewards. `markSpent()` immediately disables the body, destroys roof bodies and clears the push before the visual wreck animation runs.

## 5. Stale horde counts

No cached-count delay or off-by-one threshold was found. The original mismatch was **different count definitions**: the marker used `Horde.count`, while resolution used nearby grounded participants. Both now use the same living-member registry. A pending failure can become success immediately when a recruit or existing power supplies enough strength.

## 6. Ordering

The old per-member grounded check preceded the push ownership check. A rising follower could therefore execute lethal damage after successful pushing had begun. Push ownership now has priority over ordinary member collision classification. Genuine failed jumps still use the individual collision path when there is no grounded push lock.

## 7. Changes made

Centralized readiness in `canPush()`, using `Horde.count` and the existing Rage/Giant modifiers. Added an explicit success/failure decision to the push record. Locked successful decisions cannot downgrade because followers spread, jump or move during the animation. The spatial participant query now selects bodies for physical failed-push feedback only; it cannot veto a displayed ready horde.

The same grounded resolution covers all requirement obstacles: car, moving car, truck, armored vehicle, bus, airplane and fence. Existing fence diving and power effects remain. Added optional structured tracing behind development `?debug`, including obstacle/member IDs, requirement, before/after count, decision, state and timestamp. Production does not enable the trace.

## 8. State behavior

The interaction state is derived from the existing lifecycle and one push record, rather than separately mutable flags:

`active → pushing-success → destroyed`

`active → pushing-failure → active` after physical failure, allowing remaining members to approach again.

A pending failure can promote to success when readiness improves. A successful decision stays accepted through the brief animation. `destroyed` means the lethal body and roof bodies are disabled immediately; the separate wreck image may keep animating. Flight can cancel a pending interaction without damage.

## 9. Authoritative horde

`Horde.count` is `members.length`. Members enter through `spawn()` and leave synchronously through `removeMember()`. Dying visual sprites are no longer in this collection. The same value drives HUD, requirement markers, readiness, score population and game-over checks. No new parallel alive counter was introduced.

`finishRun()` now independently refuses a nonzero living count as well as refusing repeat transitions outside `playing`. No zombies are restored, no lives are added and no game-over delay is used to mask invalid damage.

## 10. Car tests

Requirements remain 3. Matrix: 1/2 fail; 3/4/10 succeed. The exact `4/3 PUSH` regression is tested with spread-out members and with an overlapping rising follower after contact. Repeated real-physics encounters use varied sub-frame alignment, compact spacing and duplicate notifications.

## 11. Bus tests

Requirement remains 8. Matrix: 7 fails; 8/9/20 succeed. Ten simultaneous contacts establish one interaction, preserve all ten original members and grant the reward once. Exact `8/8` is repeated across speeds.

## 12. Airplane tests

Requirement remains 16. Matrix: 15 fails; 16/17/30 succeed. All original successful participants survive; the existing two-recruit reward remains. Exact `16/16` is repeated across speeds. Existing segmented roof traversal and failed-jump tests remain in the suite.

## 13. High speed

The repeated acceptance matrix runs 30 encounters each for car 4/3, bus 8/8 and airplane 16/16: ten at each of 0m, 750m and 3,000m difficulty. It varies 20/60/120 FPS stepping, launch alignment and formation spacing, and injects duplicate checks within frames. This is 90 physical acceptance encounters, separate from the threshold and injected edge-case tests.

The initial stress fixture incorrectly placed members beyond streamed road and retained the previous camera position; that caused unrelated pit falls. The physical repetition fixture now uses supported compact formations and resets the camera. The isolated distant-member count regression remains separately tested.

## 14. Retry and pause

Tests cover pause before contact, pause during a struggle, resume and completion. The retry test performs a successful push, later removes the horde, enters results, invokes the real Retry control, and performs another successful push. It checks for one current worldstep handler and no retained previous manager context. Scene shutdown already removes collision listeners and destroys the old manager.

## 15. Regression results

**115 tests passed in 3.0 minutes** in the final complete run: the original 83 gameplay/traversal tests plus 32 new collision tests (including 90 repeated physical acceptance encounters). TypeScript/Vite production build and `git diff --check` passed. The production browser smoke returned HTTP 200, the expected canvas, no browser errors, no development handles and zero obstacle debug logs even with `?debug` in its URL. Vite still reports the existing large Phaser bundle warning.

Mines, pits, terrain, Flight, generation, conversion, HUD, rewards, missions, save, pause, results and retry remain covered. All car/bus/airplane boundaries, duplicate contacts, individual failed jumps, pause/resume and retry checks passed. Automated Edge evidence does not replace physical-device or subjective gameplay testing.

## 16. Invariants and limitations

With normal strength, a grounded push with `currentHorde >= requiredHorde` locks **break success**. A grounded push below the requirement resolves as **push failure** unless readiness improves during the struggle. Existing Rage/Giant strength modifiers intentionally remain applicable. Only actual contacting members are removed on failure.

A genuine failed jump removes **only physically colliding members**. Successful push ownership blocks lethal damage from that same obstacle; it does not grant global immunity from independent mines, pits or other hazards.

Game Over requires **authoritative living count = 0**, with one transition per run. The screenshot case, `4/3 PUSH`, is covered by deterministic regressions and repeated physical encounters.

Verification is automated in Microsoft Edge, including simulated frame rates. It is not a proof of every possible procedural seed, hardware device or simultaneous unrelated hazard arrangement. No UI redesign or requirement rebalance was made.
