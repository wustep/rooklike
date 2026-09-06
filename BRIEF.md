# Rooklike — chess-inspired roguelike

## Goal
A playable, fun, chess-pure enough to teach real chess roguelike. Playing should make you a slightly better chess player (tactics, king safety, piece values, development, checks/mates).

## Non-negotiables (Stephen)
- More chess-pure (real chess movement / rules as the foundation)
- Protect your king (check/checkmate matter; king safety is core)
- Recruit pieces + powerups / upgrades over a run
- Variety of board themes and monsters
  - Some enemies are standard chess pieces (with correct moves)
  - Some are unique with special effects — lways readable in UI (hover/tooltip/panel)
- 2.5D or 3D presentation is fine (tasteful, unique UI/UX)
- Keep iterating until playable and fun

## Design pillars
1. Teach through play — rewards for good chess ideas. Optional light coach tips after battles.
2. King is sacred — lose if king is mated. Threats to king should feel tense.
3. Army building — start limited; recruit pieces; powerups with clear chess metaphors.
4. Readable combat — legal moves highlighted; checks obvious; special abilities in plain language.
5. Roguelike loop — encounters, rewards, shop/recruit, boss, win/die.

## Scope for first playable
- One campaign act (several encounters + a boss)
- Standard chess movement for player pieces
- Mix of standard-piece enemies + a few special monsters
- At least 2–3 board themes
- Mouse + keyboard, local browser play
- AI opponents that play legal chess-ish moves (strength tunable)

## Tech
- Vite + TypeScript + React (Three.js/R3F OK if 3D — one coherent stack)
- Project root: /workspace/projects/rooklike
- pnkor or npm; dev server for local play
- Private GitHub + Vercel preview when first playable lands

## Anti-goals
- Pure puzzle mode with no run structure
- Unreadable chaos that stops teaching chess
- Half-broken move generator — prefer solid legal moves

## Done means
Stephen can play a short run: protect king, recruit/upgrade, fight varied enemies, have fun — then polish from feedback.
