import { Chess, type Square } from 'chess.js';
import { describe, it, expect, vi } from 'vitest';
import { assertPosition, legalMove, legalMoves, repairSetup } from '../src/rules';
import { ENCOUNTERS, START_ARMY, makeBattle, newRun, loadRun, getChess, playMove, type Unit } from '../src/game';

describe('Every encounter starts with two safe kings',()=>{
  it('validates both kings for depleted, promoted and mixed armies on both routes',()=>{
    const armies:Unit[][]=[START_ARMY,[{id:'king',type:'k'}]];
    for(const type of ['q','r','b','n','p'] as const)for(let size=1;size<=11;size++){
      if(type==='p'&&size>8)continue;
      armies.push([{id:'king',type:'k'},...Array.from({length:size},(_,i)=>({id:`${type}-${i}`,type}))]);
    }
    let seed=12345;
    for(let sample=0;sample<60;sample++){
      const army:Unit[]=[{id:'king',type:'k'}];
      for(let n=0;n<11;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const type=(['q','r','b','n','p'] as const)[seed%5];if(type!=='p'||army.filter(p=>p.type==='p').length<8)army.push({id:`unit-${n}`,type});}
      armies.push(army);
    }
    for(let stage=0;stage<ENCOUNTERS.length;stage++)for(const route of ['shelter','danger'] as const)for(const army of armies){
      const setup=makeBattle(army,stage,route,army.length*7919+stage),chess=new Chess(setup.fen);
      expect(()=>assertPosition(chess,true),`${stage} ${route} ${setup.fen}`).not.toThrow();
      expect(legalMoves(chess).length).toBeGreaterThan(0);
      expect(Object.values(setup.positions).sort()).toEqual(army.map(u=>u.id).sort());
      expect(chess.get(setup.elite!)?.color).toBe('b');expect(chess.get(setup.elite!)?.type).not.toBe('k');
    }
  },30000);
  it('repairs a checking captain and preserves every piece',()=>{
    const fen='6k1/8/8/8/4r3/8/8/4K3 w - - 0 1';
    expect(()=>assertPosition(new Chess(fen),true)).toThrow();
    const fixed=repairSetup(fen,'e4');expect(fixed.repaired).toBe(true);expect(fixed.elite).not.toBe('e4');
    expect(()=>assertPosition(new Chess(fixed.fen),true)).not.toThrow();
    expect(new Chess(fixed.fen).board().flat().filter(Boolean)).toHaveLength(3);
  });
  it('repairs an enemy king already attacked by ivory, including adjacent kings',()=>{
    for(const fen of ['6k1/8/8/8/8/8/6R1/4K3 w - - 0 1','8/8/8/8/8/8/4k3/4K3 w - - 0 1']){
      expect(()=>assertPosition(new Chess(fen),true)).toThrow();
      const fixed=repairSetup(fen,null);expect(()=>assertPosition(new Chess(fixed.fen),true)).not.toThrow();
    }
  });
  it('preserves a legitimate check reached during a saved game',()=>{
    const run={...newRun('wanderer',42),initialFen:'7k/8/8/3r4/8/8/8/R3K3 w - - 0 1',moves:['Ra2','Re5+']};
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(run)});
    const restored=loadRun();expect(restored.moves).toEqual(run.moves);expect(getChess(restored).isCheck()).toBe(true);vi.unstubAllGlobals();
  });
  it('repairs unsafe saved openings while keeping the company and economy',()=>{
    const run={...newRun(),initialFen:'6k1/8/8/8/4r3/8/8/4K3 w - - 0 1',coins:83,charges:4};
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(run)});
    const restored=loadRun();expect(restored.army).toEqual(run.army);expect(restored.coins).toBe(83);expect(restored.charges).toBe(4);expect(restored.log[0]).toContain('unsafe');
    expect(()=>assertPosition(new Chess(restored.initialFen),true)).not.toThrow();vi.unstubAllGlobals();
  });
});

describe('Kings are never capture targets',()=>{
  it('rejects king captures from invalid custom FENs for either side and for SAN or coordinates',()=>{
    for(const [fen,from,to,san] of [
      ['6k1/8/8/8/8/8/6R1/4K3 w - - 0 1','g2','g8','Rxg8'],
      ['4k3/6r1/8/8/8/8/8/6K1 b - - 0 1','g7','g1','Rxg1'],
    ] as const){
      const chess=new Chess(fen);expect(legalMoves(chess)).toEqual([]);
      expect(()=>legalMove(chess,{from,to})).toThrow();expect(()=>legalMove(chess,san)).toThrow();expect(chess.fen()).toBe(fen);
      const run={...newRun(),initialFen:fen,elite:to as Square};expect(()=>playMove(run,san)).toThrow();
    }
  });
  it('enforces pins, king escapes and checkmate without ever removing a king',()=>{
    const pin=new Chess('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');
    expect(()=>legalMove(pin,{from:'e2',to:'d2'})).toThrow();
    const escape=new Chess('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');expect(()=>legalMove(escape,'O-O')).toThrow();expect(()=>legalMove(escape,{from:'e1',to:'f1'})).toThrow();
    const mate=new Chess('8/8/8/8/8/5kq1/6PP/7K b - - 0 1');legalMove(mate,'Qxg2#');expect(mate.isCheckmate()).toBe(true);expect(legalMoves(mate)).toEqual([]);expect(mate.board().flat().filter(p=>p?.type==='k')).toHaveLength(2);
  });
});
