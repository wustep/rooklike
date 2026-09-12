# Rooklike

A three-act chess roguelike. Vite + TypeScript + React 19, move legality from chess.js, no backend and no environment variables. Runs persist in localStorage.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173.
- `npm run build` — `tsc -b && vite build`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — the vitest suites in `tests/`. `tests/campaign.test.ts` plays a whole twelve-encounter run and dominates the runtime; exclude it with `npx vitest run --exclude tests/campaign.test.ts` when your change does not touch `src/game.ts`, `src/engine.ts`, `src/rules.ts`, or that test.
- `npm run test:browser` — the Playwright suites in `e2e/`. With no `PLAYWRIGHT_BASE_URL`, `playwright.config.ts` starts its own dev server on 127.0.0.1:5173. To run against a server you started yourself: `npx vite --port 5199 --host 127.0.0.1 &` then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5199 npm run test:browser`.
- `npm run check` — typecheck, unit tests, and browser tests in sequence.

Set `UPDATE_SHOTS=1` to let the e2e specs overwrite `artifacts/*.png`; without it the screenshot calls are skipped. Set `CAMPAIGN_LOG=1` to make `tests/campaign.test.ts` print a JSON line per stage.

## Rules invariants

These three are the load-bearing guarantees; changes near them need a test.

1. Every generated deployment has exactly one king per side, neither king attacked, and at least one legal opening move. Enforced by `repairSetup` in `src/rules.ts`, which deterministically relocates offending enemy pieces (up to 32 attempts) and moves the captain marker with its piece.
2. FEN validity is not enough: the side *not* to move must not be in check. Enforced by `assertPosition` in `src/rules.ts`, which also rejects an opening position that starts in check.
3. Kings are never captured. Every move goes through `legalMove` in `src/rules.ts`, which applies the move to a probe copy first and throws on a king capture; `legalMoves` filters king captures out of the move list and returns `[]` for an unreachable position. Capturing the marked non-king captain is the intentional scenario win.

## Test patterns

- Seeded runs: `newRun('wanderer', 42)` from `src/game.ts` gives a deterministic road. Browser tests seed state by writing that run to `localStorage` under `SAVE_KEY` in `page.addInitScript`, plus `localStorage.setItem('rooklike-welcomed','1')` to skip the welcome dialog. Tests can also hand-build a small position by overriding `initialFen`, `elite`, `positions`, and `army` on a fresh run.
- DEV test hook: in development only, `src/App.tsx` reads `window.__ROOKLIKE_TEST__` for `{override?: Partial<SearchProfile>, delay?: number}` — the override is forwarded to the AI worker and the delay replaces the 550 ms think pause.
- Reduced search: both long tests deliberately weaken the engine so they finish. `tests/campaign.test.ts` calls `chooseMove` with `{depth:1,nodes:200,quiescence:0}` for the enemy, and the "complete act through the UI" spec in `e2e/game.spec.ts` sets the same override through `__ROOKLIKE_TEST__`. Do not raise these.

## House style

Modules in `src/` are dense, one-line-heavy TypeScript. Match it: keep edits token-level, do not reflow or reformat lines you are not changing. `src/style.css` packs most of its rules into one 22 KB line — append new rules as new lines at the end of the file rather than editing that line. No comments that narrate what the code does; keep a comment only for a non-obvious why.
