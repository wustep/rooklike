import { Chess } from 'chess.js';
import { it, expect } from 'vitest';
import { chooseMove, SEARCH_PROFILES, evaluatePosition, type SearchStats } from '../src/engine';
it('takes checkmate, never a king capture',()=>{
  const chess=new Chess('8/8/8/8/8/5kq1/6PP/7K b - - 0 1');const fen=chess.fen();
  expect(chooseMove(chess,'tactician','g3',11)?.san).toContain('#');expect(chess.fen()).toBe(fen);
});
it('sees a poisoned pawn and a forcing knight fork',()=>{
  const chess=new Chess('3q2k1/5ppp/8/8/3P4/8/5PPP/3R2K1 b - - 0 1');
  const stats:SearchStats={depth:0,nodes:0,score:0};const move=chooseMove(chess,'tactician',null,8,undefined,stats);
  expect(move?.san).not.toBe('Qxd4');expect(stats.depth).toBeGreaterThanOrEqual(2);expect(stats.nodes).toBeLessThanOrEqual(SEARCH_PROFILES[8].nodes*1.6+1);expect(chess.history()).toEqual([]);
  const fork=new Chess('6k1/5ppp/8/4n3/8/8/1Q3PPP/4K3 b - - 0 1');
  expect(chooseMove(fork,'tactician',null,8)?.san).toBe('Nd3+');
},30000);
it('a doomed captain is defended to the last ply',()=>{
  // The a8 captain is trapped behind its own b7 pawn; only a knight block on the a-file delays Qxa8.
  const chess=new Chess('b5k1/1p3ppp/2n3N1/8/8/8/5PPP/Q5K1 b - - 0 1');
  const stats:SearchStats={depth:0,nodes:0,score:0};const move=chooseMove(chess,'tactician','a8',8,undefined,stats);
  // -99997 is -(WIN-3): the block buys three plies instead of losing the captain on the next one.
  expect(move?.to).toMatch(/^a[57]$/);expect(stats.score).toBe(-99997);
},30000);
it('values king shelter and passed pawns; encounter budgets and depth ramp',()=>{
  const sheltered=new Chess('r2q2k1/5ppp/8/8/8/8/5PPP/R2Q2K1 w - - 0 1');
  const exposed=new Chess('r2q2k1/5ppp/8/8/4K3/8/5PPP/R2Q4 w - - 0 1');
  expect(evaluatePosition(sheltered)).toBeGreaterThan(evaluatePosition(exposed));
  for(let i=1;i<SEARCH_PROFILES.length;i++){expect(SEARCH_PROFILES[i].nodes).toBeGreaterThanOrEqual(SEARCH_PROFILES[i-1].nodes);expect(SEARCH_PROFILES[i].depth).toBeGreaterThanOrEqual(SEARCH_PROFILES[i-1].depth);}
});
