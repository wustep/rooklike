# Rejected improvement ideas

<!-- Consulted AFTER fresh generation so it can't bias new ideas. Don't re-propose these. -->

- **Shared swift-passage predicate to fix a HUD/payout mismatch** — not a bug; `bonusState` and the `playMove` payout agree in every reachable state _(rejected 2026-09-12)_
- **Hanging-piece confirm strip before committing a move** — nagging in a game that already has Takeback, and "off on Hard" adds a mode; keep only hanging-vs-defended grading in the Threats overlay _(rejected 2026-09-12)_
- **En passant and worker-contract tests** — en passant is already covered by `tests/game.test.ts`; the worker half only matters with the null-reply idea _(rejected 2026-09-12)_
- **Move toasts inline under modals** — the toast already renders above the backdrop; reserving strip height in every modal is a layout tax for a non-bug _(rejected 2026-09-12)_
- **Deployment preview / reorder so armies can castle** — b1/g1/c1/f1 is the standard chess start; castling opens after development, which the stage-6 lesson teaches _(rejected 2026-09-12)_
- **Rotate the guaranteed relic slot and add a king-safety relic** — the repeatable hourglass slot is intentional and test-pinned; only the dead `pools[1..3]` data is worth deleting _(rejected 2026-09-12)_
- **Rewrite the tutorial lesson to attacker/defender counting** — captain capture ends the fight regardless of defenders, so "develop knights" matches the position _(rejected 2026-09-12)_
- **Depth-preferred replacement for the transposition table cap** — the 20000-entry cap is unreachable with a per-call table and a 10400-node maximum budget _(rejected 2026-09-12)_
- **Run history / lifetime record** — no audience yet; second storage key and quota handling for an unrequested feature _(rejected 2026-09-12)_
- **Dev URL params for stage/seed/FEN** — the DEV `__ROOKLIKE_TEST__` hook covers search strength and a localStorage seed is one line; `?fen=` would bypass `makeBattle` invariants _(rejected 2026-09-12)_
- **`loadRun` seed guard** — every version-3 save carries a seed and older saves migrate with their position intact _(rejected 2026-09-12)_
- **Header rail and board column measure** — premise stale; both share the 40px gutter in the current grid _(rejected 2026-09-12)_
- **Shared scripted-act vitest helper** — the 40s act e2e removed the motivation _(rejected 2026-09-12)_
- **Engine perf guard test** — `tests/engine.test.ts` already asserts depth and a node ceiling via SearchStats _(rejected 2026-09-12)_
- **Side-relative draw penalty in the engine** — as proposed it makes draws worth more to the enemy and amplifies the repetition complaint; decide contempt vs enemy-win direction first, and note `game.ts` ends the run on any draw _(rejected 2026-09-12)_
- **Render `Encounter.description` above the briefing** — a third line above the board while the battle column is already over budget on short desktops; delete the dead field instead _(rejected 2026-09-12)_
