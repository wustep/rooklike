import { describe, expect, it } from 'vitest';
import { SEARCH_PROFILES } from '../src/engine';
import { ENCOUNTERS, makeBattle, newRun, getChess, playMove, recruit, nextBattle, chooseMove, takeRelic, shopStock, type Run } from '../src/game';

/** Act I piece counts after the post-gate soften (was 8, 11, 11, 13). */
const ACT1_ENEMY = [8, 9, 10, 12];

describe('Act I pacing after the opening gate', () => {
  it('keeps Easy search at one ply until the act finale', () => {
    expect(SEARCH_PROFILES.slice(0, 4).map(p => p.depth)).toEqual([1, 1, 1, 2]);
    for (let i = 1; i < SEARCH_PROFILES.length; i++) {
      expect(SEARCH_PROFILES[i].nodes).toBeGreaterThanOrEqual(SEARCH_PROFILES[i - 1].nodes);
      expect(SEARCH_PROFILES[i].depth).toBeGreaterThanOrEqual(SEARCH_PROFILES[i - 1].depth);
    }
  });

  it('ramps enemy density 8 → 9 → 10 → 12 instead of jumping to 11 on fight 2', () => {
    for (let stage = 0; stage < 4; stage++) {
      expect(ENCOUNTERS[stage].pieces.length, `stage ${stage}`).toBe(ACT1_ENEMY[stage]);
      const setup = makeBattle(newRun().army, stage, 'shelter', 42);
      const chess = getChess({ ...newRun('wanderer', 42), initialFen: setup.fen, positions: setup.positions, elite: setup.elite, stage, seed: 42, moves: [] });
      expect(chess.board().flat().filter(p => p?.color === 'b')).toHaveLength(ACT1_ENEMY[stage]);
      expect(chess.isCheck()).toBe(false);
    }
  });

  it('scripted Easy Act I: a competent player clears all four fights', () => {
    let run: Run = newRun('wanderer', 42);
    const report: { stage: number; plies: number; phase: string; losses: number }[] = [];
    for (let stage = 0; stage < 4; stage++) {
      let plies = 0;
      while (run.phase === 'battle' && plies < 80) {
        const chess = getChess(run);
        const move = chooseMove(chess, chess.turn() === 'w' ? 'tactician' : 'wanderer', run.elite, chess.turn() === 'w' ? 4 : run.stage);
        expect(move, `no move at stage ${stage} ply ${plies}`).toBeTruthy();
        run = playMove(run, move!.san);
        plies++;
      }
      report.push({ stage: stage + 1, plies, phase: run.phase, losses: run.battleLosses });
      expect(run.phase, `Act I fight ${stage + 1} ended ${run.phase}`).toBe('reward');
      if (stage < 3) {
        run = run.army.length < 12 ? recruit(run, stage % 2 === 0 ? 'n' : 'b') : takeRelic(run, 'hourglass');
        run = { ...run, rewardClaimed: true };
        for (const item of [...shopStock(run)].reverse()) {
          if (item.type === 'p' || run.army.length >= 12) continue;
          const next = recruit(run, item.type, item.cost);
          if (next !== run) run = next;
        }
        run = nextBattle(run);
      }
    }
    expect(report.every(r => r.phase === 'reward')).toBe(true);
  }, 180000);
});
