import { it, expect } from 'vitest';
import { newRun, getChess, chooseMove, playMove, recruit, nextBattle, ENCOUNTERS, shopStock, claimProvision, takeRelic, type Run } from '../src/game';
it('can complete an entire campaign with legal moves, rewards, and recruitment',async()=>{
  let run:Run=newRun('wanderer',42);const report=[];
  for(let stage=0;stage<ENCOUNTERS.length;stage++){
    let plies=0;
    while(run.phase==='battle'&&plies<180){const chess=getChess(run);const move=chooseMove(chess,chess.turn()==='w'?'tactician':'wanderer',run.elite,run.stage);expect(move).toBeTruthy();run=playMove(run,move!.san);plies++;}
    report.push({stage:stage+1,plies,phase:run.phase,army:run.army.length,losses:run.battleLosses,moves:run.moves.join(' ')});
    console.log(JSON.stringify(report.at(-1)));await new Promise(resolve=>setTimeout(resolve,0));
    expect(['reward','victory']).toContain(run.phase);
    if(stage<ENCOUNTERS.length-1){run=run.army.length<12?recruit(run,stage%2===0?'n':'b'):takeRelic(run,'hourglass');run={...run,rewardClaimed:true};if(stage%4===3)run=claimProvision(run,run.army.length<12?'rook':'gold');const stock=shopStock(run);const recruitOffer=[...stock].reverse().find(item=>item.cost<=run.coins&&item.type!=='p');if(recruitOffer)run=recruit(run,recruitOffer.type,recruitOffer.cost);run=nextBattle(run);}
  }
  expect(run.phase).toBe('victory');
},900000);
