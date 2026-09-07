import { describe, expect, it } from 'vitest';
import { SEARCH_PROFILES } from '../src/engine';
import { ENCOUNTERS, makeBattle, newRun, getChess, playMove, recruit, nextBattle, chooseMove, takeRelic, shopStock, type Run } from '../src/game';

/** Live/main Act I before this PR: density jumped 8→11 on fight 2; search jumped to 2-ply there and 3-ply at the finale. */
const ACT1_BEFORE = { pieces: [8, 11, 11, 13], depth: [1, 2, 2, 3] };
const ACT1_AFTER = { pieces: [8, 9, 10, 12], depth: [1, 1, 1, 2] };

function playAct1(player: 'wanderer' | 'tactician', playerStage: number, seed = 42) {
  let run: Run = newRun('wanderer', seed);
  const report: { stage: number; name: string; plies: number; phase: string; losses: number; army: number }[] = [];
  for (let stage = 0; stage < 4; stage++) {
    let plies = 0;
    while (run.phase === 'battle' && plies < 80) {
      const chess = getChess(run);
      const move = chooseMove(chess, chess.turn() === 'w' ? player : 'wanderer', run.elite, chess.turn() === 'w' ? playerStage : run.stage);
      if (!move) break;
      run = playMove(run, move.san);
      plies++;
    }
    report.push({ stage: stage + 1, name: ENCOUNTERS[stage].name, plies, phase: run.phase, losses: run.battleLosses, army: run.army.length });
    if (stage < 3 && run.phase === 'reward') {
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
  return report;
}

describe('Act I pacing after the opening gate', () => {
  it('keeps Easy search at one ply until the act finale', () => {
    expect(SEARCH_PROFILES.slice(0, 4).map(p => p.depth)).toEqual(ACT1_AFTER.depth);
    expect(ACT1_BEFORE.depth).toEqual([1, 2, 2, 3]);
    for (let i = 1; i < SEARCH_PROFILES.length; i++) {
      expect(SEARCH_PROFILES[i].nodes).toBeGreaterThanOrEqual(SEARCH_PROFILES[i - 1].nodes);
      expect(SEARCH_PROFILES[i].depth).toBeGreaterThanOrEqual(SEARCH_PROFILES[i - 1].depth);
    }
  });

  it('ramps enemy density 8 → 9 → 10 → 12 instead of jumping to 11 on fight 2', () => {
    expect(ENCOUNTERS[1].pieces.some(([, type]) => type === 'r')).toBe(false);
    expect(ENCOUNTERS[2].pieces.some(([, type]) => type === 'n')).toBe(false);
    for (let stage = 0; stage < 4; stage++) {
      expect(ENCOUNTERS[stage].pieces.length, `stage ${stage}`).toBe(ACT1_AFTER.pieces[stage]);
      const setup = makeBattle(newRun().army, stage, 'shelter', 42);
      const chess = getChess({ ...newRun('wanderer', 42), initialFen: setup.fen, positions: setup.positions, elite: setup.elite, stage, seed: 42, moves: [] });
      expect(chess.board().flat().filter(p => p?.color === 'b')).toHaveLength(ACT1_AFTER.pieces[stage]);
      expect(chess.isCheck()).toBe(false);
    }
  });

  it('scripted Easy Act I: a growing company clears all four fights without the old fight-2 slugfest', () => {
    const report = playAct1('tactician', 3);
    console.log('Act I playthrough', JSON.stringify(report));
    expect(report.map(r => r.phase)).toEqual(['reward', 'reward', 'reward', 'reward']);
    // Measured on live/main with the same player/seeds: fight 2 averaged 32 plies and 2.3 losses.
    expect(report[1].plies).toBeLessThan(16);
    expect(report[1].losses).toBeLessThanOrEqual(1);
    expect(report[2].plies).toBeLessThan(20);
    expect(report[2].losses).toBeLessThanOrEqual(1);
  }, 180000);
});
