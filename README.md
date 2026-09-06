# Rooklike — The Hollow Crown

A complete first act of an original chess teaching roguelike. Lead an ivory company through five encounters in Mosswood, Glass Marsh, and the Ember Library, then break the Hollow Crown.

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

- You play ivory. Click a piece and then a highlighted square. All highlighted moves keep your king safe.
- Capture the enemy marked with a small crown **or checkmate the enemy king** to clear each encounter, including the boss. Captain capture is an explicit scenario victory condition; checkmate is ordinary chess checkmate.
- Check forces a response. Being checkmated ends your run. Stalemate, repetition, insufficient material, and the 50-move rule end the run as a draw.
- Surviving pieces carry forward; captured allies stay lost. Between battles, choose one free reward and spend crowns on recruits. Your company can hold 12 pieces.
- Pawns move toward rank 8 and choose queen, rook, bishop, or knight on promotion. Castling and en passant work under standard chess rules. Each encounter begins with a fresh deployment and corresponding castling rights.
- Monster effects are explicitly described in the field guide. The Mire Rider steals crowns when it captures; the Lantern Keeper restores a Takeback when defeated. Their movement and captures remain standard chess.
- Relics grant Takebacks, additional victory income, or a suggested move. They never change how a piece moves.
- `H`: enemy threat vision. `U`: spend a Takeback to rewind your move and the enemy reply. Arrow keys: board navigation. Enter/Space: select or move. `?`: field guide. Escape: close or deselect.
- Wanderer is a forgiving material-aware opponent. Tactician looks ahead to your reply. Enemy thinking runs in a Web Worker.

Takeback history lasts until the page reloads or the next encounter starts; remaining charges and campaign progress are saved. The final board can be opened for study after a win, defeat, or draw.

## Validation

```sh
npm test
npx playwright install chromium
npm run test:browser
```

The rules/campaign suite exercises pins, king safety, castling and unit identities, both en passant directions, promotion persistence, checkmate, stalemate, moving captains, monster effects, recruitment limits, income, legal AI, and a complete five-encounter campaign. Browser tests exercise real input, AI replies, saves, reward persistence, recruitment, promotion, mobile layout, and the complete act through the UI.

If using project-local browser downloads:

```sh
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npm run test:browser
```

## Implementation

Vite + TypeScript + React. Original SVG chessmen, CSS perspective board, three themed palettes, responsive layout, keyboard controls, reduced-motion support, optional synthesized sound, and localStorage saves. Move legality comes from [chess.js](https://github.com/jhlywa/chess.js); the campaign, opponent, UI, and artwork were implemented here from the brief without copying another game project.

- `src/game.ts`: rules integration, encounters, campaign transitions, economy, and AI evaluation.
- `src/ai.worker.ts`: off-main-thread opponent.
- `src/App.tsx`: board, field guide, rewards, campaign flow, and interaction.
- `src/Piece.tsx`: original vector chessmen.
- `src/style.css`: presentation and responsive layouts.
- `tests/`, `e2e/`: rules and real-browser coverage.

Google Fonts enhance typography when online; system fonts are available as fallback. Gameplay has no external network dependency after assets load. This first act is deterministic rather than procedurally generated; recruitment and relic choices change your army across the run.

## Deploy

Vercel recognizes the Vite build automatically. `vercel.json` explicitly sets the build and output directory. Deploy with `vercel` for a preview or `vercel --prod` for the production alias. GitHub should remain a **private** repository.
