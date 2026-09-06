import { expect, it } from 'vitest';
import { newRun, encounterFor, ENCOUNTERS, shopStock, rewardRelics, claimProvision, nextBattle, takeRelic, playMove, type Run } from '../src/game';
it('builds a repeatable twelve-encounter road with varied maps, relics and shops',()=>{
  expect(ENCOUNTERS).toHaveLength(12);
  const signature=(seed:number)=>JSON.stringify(ENCOUNTERS.map((_,stage)=>({encounter:encounterFor(stage,seed),shop:shopStock({...newRun('wanderer',seed),stage}),gifts:rewardRelics({...newRun('wanderer',seed),stage})})));
  expect(signature(42)).toBe(signature(42));expect(signature(42)).not.toBe(signature(89));
  for(let stage=0;stage<12;stage++){const offers=shopStock({...newRun('wanderer',42),stage});expect(new Set(offers.map(p=>p.type)).size).toBe(offers.length);expect(offers.every(p=>p.cost>=8)).toBe(true);}
});
it('grants one act provision and requires it before the next act',()=>{
  const run={...newRun('wanderer',42),stage:3,phase:'reward' as const,rewardClaimed:true};
  expect(nextBattle(run)).toBe(run);const funded=claimProvision(run,'gold');expect(funded.coins).toBe(40);expect(claimProvision(funded,'gold')).toBe(funded);expect(nextBattle(funded).stage).toBe(4);
  expect(claimProvision({...run,stage:2},'gold').coins).toBe(15);
});
it('the Seal changes shop prices and the Oath pays only if no Takeback was spent',()=>{
  const run=newRun('wanderer',42);expect(shopStock(takeRelic(run,'supply')).find(p=>p.type==='r')?.cost).toBe(30);
  const position:Run={...run,initialFen:'7k/8/8/8/8/r7/8/R3K3 w - - 0 1',elite:'a3',army:[{id:'king',type:'k'},{id:'rook',type:'r'}],positions:{e1:'king',a1:'rook'},relics:['vow']};
  expect(playMove(position,'Rxa3').payout.some(p=>p.label==='Unbroken Oath')).toBe(true);
  expect(playMove({...position,battleUndos:1},'Rxa3').payout.some(p=>p.label==='Unbroken Oath')).toBe(false);
});

it('Last Rites pays only for the first loss, and Small Ambition rewards a pawn captain capture',()=>{
  let run:Run={...newRun('wanderer',42),initialFen:'7k/8/8/3r4/8/8/3P1P2/R3K3 b - - 0 1',elite:'d5',army:[{id:'king',type:'k'},{id:'rook',type:'r'},{id:'p1',type:'p'},{id:'p2',type:'p'}],positions:{e1:'king',a1:'rook',d2:'p1',f2:'p2'},relics:['salvage']};
  run=playMove(run,'Rxd2');expect(run.coins).toBe(18);run=playMove(run,'Kf1');run=playMove(run,'Rxf2+');expect(run.coins).toBe(18);expect(run.battleBonus).toBe(3);
  run={...newRun('wanderer',42),initialFen:'7k/8/8/3r4/4P3/8/8/R3K3 w - - 0 1',elite:'d5',army:[{id:'king',type:'k'},{id:'rook',type:'r'},{id:'p1',type:'p'}],positions:{e1:'king',a1:'rook',e4:'p1'},relics:['trophy']};
  expect(playMove(run,'exd5').payout).toContainEqual({label:'Small Ambition',amount:18});
});
