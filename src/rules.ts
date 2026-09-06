import { Chess, type Move, type Square } from 'chess.js';

export function kings(chess: Chess) {
  const pieces = chess.board().flat().filter(p => p?.type === 'k');
  const white = pieces.filter(p => p!.color === 'w');
  const black = pieces.filter(p => p!.color === 'b');
  if (white.length !== 1 || black.length !== 1) throw new Error('A chess position must contain exactly one king per side.');
  return { w: white[0]!.square, b: black[0]!.square };
}

/** FEN parsing alone does not detect an attacked king belonging to the side NOT to move. */
export function assertPosition(chess: Chess, opening = false): void {
  const king = kings(chess);
  const other = chess.turn() === 'w' ? 'b' : 'w';
  if (chess.isAttacked(king[other], chess.turn())) throw new Error('Invalid position: the side not to move is in check.');
  if (opening && chess.isCheck()) throw new Error('Invalid encounter: the starting king is in check.');
}

export function legalMoves(chess: Chess, square?: Square): Move[] {
  // chess.js assumes a reachable position. Guard imported/custom FENs before asking for moves.
  try { assertPosition(chess); } catch { return []; }
  return chess.moves({ verbose: true, ...(square ? { square } : {}) }).filter(move => move.captured !== 'k');
}

export function legalMove(chess: Chess, input: string | { from: Square; to: Square; promotion?: string }): Move {
  assertPosition(chess);
  // Work on a copy until the requested move and both kings have been verified.
  const probe = new Chess(chess.fen());
  const move = probe.move(input);
  if (move.captured === 'k') throw new Error('Kings cannot be captured. Win by checkmate.');
  assertPosition(probe);
  return chess.move(move);
}

/** Repair deployment only, never a position reached during normal play. No ally is lost or added. */
export function repairSetup(fen: string, elite: Square | null) {
  const chess = new Chess(fen);
  if (chess.turn() !== 'w') throw new Error('Encounter deployment must give ivory the first move.');
  const original = chess.fen();
  const candidates = [8, 7, 6, 5, 4].flatMap(rank => [...'ghfecdba'].map(file => `${file}${rank}` as Square));
  for (let attempt = 0; attempt < 32; attempt++) {
    const king = kings(chess);
    const blackChecked = chess.isAttacked(king.b, 'w');
    const attackers = chess.attackers(king.w, 'b');
    if (!blackChecked && !attackers.length) {
      assertPosition(chess, true);
      if (!legalMoves(chess).length) throw new Error('Encounter has no legal opening move.');
      return { fen: chess.fen(), elite, repaired: chess.fen() !== original };
    }
    const from = blackChecked ? king.b : attackers[0];
    const piece = chess.remove(from)!;
    let placed = false;
    for (const to of candidates) {
      if (to === from || chess.get(to) || (piece.type === 'p' && to[1] === '8')) continue;
      chess.put(piece, to);
      const nextKing = kings(chess);
      const attacksWhite = chess.attackers(nextKing.w, 'b').includes(to);
      if (!attacksWhite && !chess.isAttacked(nextKing.b, 'w')) {
        if (elite === from) elite = to;
        placed = true;
        break;
      }
      chess.remove(to);
    }
    if (!placed) throw new Error('Unable to create a safe encounter deployment.');
  }
  throw new Error('Unable to repair encounter deployment.');
}
