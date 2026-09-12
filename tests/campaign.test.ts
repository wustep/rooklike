import { it, expect } from 'vitest';
import { newRun, getChess, chooseMove, playMove, recruit, nextBattle, ENCOUNTERS, shopStock, claimProvision, takeRelic, type Run } from '../src/game';
it('can complete an entire campaign with legal moves, rewards, and recruitment',async()=>{
  let run:Run=newRun('wanderer',42);const report=[];
  for(let stage=0;stage<ENCOUNTERS.length;stage++){
    let plies=0;
    while(run.phase==='battle'&&plies<180){const chess=getChess(run);const move=chooseMove(chess,chess.turn()==='w'?'tactician':'wanderer',run.elite,chess.turn()==='w'?Math.max(run.stage,6):run.stage,chess.turn()==='w'?{depth:2,nodes:800,quiescence:2}:{depth:1,nodes:200,quiescence:0});expect(move).toBeTruthy();run=playMove(run,move!.san);plies++;}
    report.push({stage:stage+1,plies,phase:run.phase,army:run.army.length,losses:run.battleLosses,moves:run.moves.join(' ')});
    if(process.env.CAMPAIGN_LOG)console.log(JSON.stringify(report.at(-1)));await new Promise(resolve=>setTimeout(resolve,0));
    expect(['reward','victory']).toContain(run.phase);
    if(stage<ENCOUNTERS.length-1){run=run.army.length<12?recruit(run,stage%2===0?'n':'b'):takeRelic(run,'hourglass');run={...run,rewardClaimed:true};if(stage%4===3)run=claimProvision(run,run.army.length<12?'rook':'gold');for(const item of [...shopStock(run)].reverse()){if(item.type==='p'||run.army.length>=12)continue;const next=recruit(run,item.type,item.cost);if(next!==run)run=next;}run=nextBattle(run);}
  }
  expect(run.phase).toBe('victory');
});
