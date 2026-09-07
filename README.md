# Rooklike — The Hollow Crown

A three-act chess roguelike. Lead an ivory company through twelve encounters, build around eleven relics, and break the Hollow Crown. Seeded encounter pools, enemy formations, relic drafts, and traveling shops give each road a different shape.

**Play:** https://rooklike.vercel.app

**Private source repository:** https://github.com/wustep/rooklike

## Play locally

Requires Node.js 20.19+ (or Node.js 22.12+) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. The run automatically saves in this browser. No backend, account, or environment variables are required.

```sh
npm run build
npm run preview
```

The production preview opens at **http://localhost:4173**.

## How to play

- You play ivory. Drag a piece or click it and then a highlighted square. All highlighted moves keep your king safe. Escape, an invalid drop, or a drop off the board cancels a drag.
- Capture the enemy marked with a small crown **or checkmate the enemy king** to clear each encounter, including the boss. Captain capture is an explicit scenario victory condition; checkmate is ordinary chess checkmate.
- Check forces a response. Being checkmated ends your run. Stalemate, repetition, insufficient material, and the 50-move rule end the run as a draw.
- Surviving pieces carry forward; captured allies stay lost. Between battles, choose one of four free rewards, spend crowns on recruits, and choose the next road. Send pieces home at camp to free slots and recover two crowns per material point. Your company can hold 12 pieces, including at most eight pawns.
- Pawns move toward rank 8 and choose queen, rook, bishop, or knight on promotion. Castling and en passant work under standard chess rules. Each encounter begins with a fresh deployment and corresponding castling rights.
- Monster effects are explicitly described in the field guide. The Mire Rider steals crowns when it captures; the Lantern Keeper restores a Takeback when defeated. Their movement and captures remain standard chess.
- Eleven relics support Takebacks, victory income, suggested moves, knight captures, surviving bishops on both colors, pawn promotion, and castling. They never change how a piece moves.
- `H`: enemy threat vision. `U`: spend a Takeback to rewind your last turn (your move and the reply). Press again to rewind further through this fight. Arrow keys: board navigation. Enter/Space: select or move. `?`: field guide. Escape: close or deselect.
- **Easy** starts with a gentle opening and ramps toward four-ply search; **Hard** looks one ply further. Each encounter has its own depth, position budget, and capture-extension settings in `src/engine.ts`. Iterative deepening, alpha-beta pruning, transposition caching, move ordering, and quiescence search preserve the last completed depth within the budget. Actual completed depth depends on the position. Captains are explicit search objectives, including when they move. Enemy thinking runs in a Web Worker.

Takeback keeps a stack of this fight’s turns. Each charge rewinds one full turn; remaining charges let you chain further back until the opening of the encounter. History clears on reload or when the next encounter starts; remaining charges and campaign progress are saved. The final board can be opened for study after a win, defeat, or draw.

## Rules invariants

FEN syntax validation is not enough for custom chess encounters. Every generated setup is checked for exactly one king per side, no attacked king on either side, and at least one legal opening move. Unsafe deployments deterministically relocate enemy pieces until both kings are safe; the captain marker follows its piece.

All game moves pass through `legalMove`, which rejects unreachable positions and king captures before committing a move. chess.js enforces pins, check responses, castling, en passant, promotion, and checkmate. A king may be checked during play; it is never captured. Capturing the marked **non-king** captain remains an intentional scenario victory condition.

## The road gets sharper

Each camp previews the next captain and lets you choose:

- **Sheltered road:** the normal encounter and one additional Takeback.
- **Dangerous road:** an extra knight in the early encounters or rook later, on b6; victory pays 20 additional crowns.

After the fourth and eighth encounters, choose act provisions: a veteran rook, 25 crowns, or two Takebacks.

Every fight offers **Swift passage**: win within its visible turn target for 12 extra crowns. Missing the target only loses the bonus. A flawless victory earns another 10. The camp receipt separates every payout from relic crowns earned during battle.

The Glass Oracle reduces the victory bounty by 5 for each ally it captures, up to 15. The Storm Marshal collects 3 crowns whenever its own move gives check. These abilities, like those of the Mire Rider and Lantern Keeper, never alter chess movement.

Select an enemy to trace its attack pattern. Attacked legal destinations use amber markers. The board’s position read calls out loose pieces, attacker/defender counts, and forks. The king remains the heart of the run: captain capture or enemy checkmate wins; your checkmate loses. A remaining Takeback can recover from checkmate or a draw while its turn history is still available.

Existing saves retain their position, army, and rewards; old rampart and boss stages migrate to their new positions. Unsafe imported openings are rebuilt without losing the army, crowns, or relics. Legitimate checks reached during play stay intact.

The road seed determines encounter variants, defender mixes, relic offers, and shop stock/prices. Reloading preserves that seed. **New journey** rolls a new road; **Replay this road** repeats the current seed. There are twelve encounter slots across three acts, with twenty-one named configurations in the pools. The first teaching encounter stays consistent.

## Validation

```sh
npm test
npx playwright install chromium
npm run test:browser
```

The rules/campaign suite validates thousands of depleted, promoted, mixed, and seeded deployments. It also exercises pins, king safety, castling and unit identities, both en passant directions, promotion persistence, checkmate, stalemate, moving captains, monster effects, recruitment limits, income, legal AI, and a complete twelve-encounter campaign. Browser tests exercise real input, AI replies, save repair, reward and route persistence, roster changes, promotion, post-checkmate Takebacks, act provisions, flat-board rendering, mobile layout, and the full three-act campaign through the UI.

If using project-local browser downloads:

```sh
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npm run test:browser
```

## Implementation

Vite + TypeScript + React. Original SVG chessmen, flat orthographic board, seven themed palettes, responsive layout, keyboard controls, reduced-motion support, optional synthesized sound, and localStorage saves. Move legality comes from [chess.js](https://github.com/jhlywa/chess.js); the campaign, opponent, UI, and artwork were implemented here from the brief without copying another game project.

- `src/rules.ts`: strict position validation, safe setup repair, and guarded chess.js move application.
- `src/engine.ts`: encounter search profiles, tactical search, and positional evaluation.
- `src/game.ts`: seeded encounter pools, campaign transitions, recruitment, relics, and economy.
- `src/ai.worker.ts`: off-main-thread opponent.
- `src/App.tsx`: board, field guide, rewards, campaign flow, and interaction.
- `src/Piece.tsx`: original vector chessmen.
- `src/style.css`: presentation and responsive layouts.
- `tests/`, `e2e/`: rules and real-browser coverage.

Google Fonts enhance typography when online; system fonts are available as fallback. Gameplay has no external network dependency after assets load. Content selection is deterministic within each seed; recruitment, route, and relic choices change the army and economy along that road.

## Deploy

Vercel recognizes the Vite build automatically. `vercel.json` explicitly sets the build and output directory. Deploy with `vercel` for a preview or `vercel --prod` for the production alias. GitHub is a **private** repository, connected to Vercel for automatic deployment.

## Publishing

The source is maintained in this working tree. Build and validate before committing to `main`, pushing `origin/main`, and deploying with `vercel --prod`. The local `.vercel/` project link is ignored by Git.

For a smoke test against the live site:

```sh
PLAYWRIGHT_BASE_URL=https://rooklike.vercel.app PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npm run test:browser -- --grep desktop
```
