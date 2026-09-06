import { it, expect } from 'vitest';
import { newRun, getChess, chooseMove, playMove, recruit, nextBattle, type Run } from '../src/game';
it('can complete an entire campaign with legal moves, rewards, and recruitment',()=>{
  let run:Run=newRun();const report=[];
  for(let stage=0;stage<5;stage++){
    let plies=0;
    while(run.phase==='battle'&&plies<180){const chess=getChess(run);const move=chooseMove(chess,chess.turn()==='w'?'tactician':'wanderer',run.elite);expect(move).toBeTruthy();run=playMove(run,move!.san);plies++;}
    report.push({stage:stage+1,plies,phase:run.phase,army:run.army.length,losses:run.battleLosses});
    console.log(JSON.stringify(report.at(-1)));
    expect(['reward','victory']).toContain(run.phase);
    if(stage<4){run=recruit(run,'n');if(run.coins>=65)run=recruit(run,'q',65);else if(run.coins>=35)run=recruit(run,'r',35);run=nextBattle(run);}
  }
  expect(run.phase).toBe('victory');
},120000);
