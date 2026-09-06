import { Chess, type Square } from 'chess.js';
import { describe, it, expect, vi } from 'vitest';
import { newRun, makeBattle, getChess, playMove, nextBattle, takeRelic, recruit, chooseMove, loadRun, sendHome, rewardRelics, ENCOUNTERS, START_ARMY, type Run } from '../src/game';
function position(fen:string,elite:Square='a8'):Run {
  const chess=new Chess(fen),pieces=chess.board().flat().filter(p=>p?.color==='w');
  return {...newRun(),initialFen:fen,elite,army:pieces.map(p=>({id:p!.square,type:p!.type})),positions:Object.fromEntries(pieces.map(p=>[p!.square,p!.square]))};
}
describe('Road choices and the campaign economy',()=>{
  it('deploys both routes across all seven encounters with safe kings and unique unit positions',()=>{
    let armyRun=newRun();for(let i=0;i<5;i++)armyRun=recruit(armyRun,'q');
    for(let stage=0;stage<ENCOUNTERS.length;stage++)for(const route of ['shelter','danger'] as const){
      const {fen,positions}=makeBattle(armyRun.army,stage,route),chess=new Chess(fen);
      expect(chess.isCheck()).toBe(false);expect(chess.isAttacked('g8','w'),`stage ${stage} ${route} ${fen}`).toBe(false);
      expect(Object.values(positions)).toHaveLength(12);expect(new Set(Object.values(positions)).size).toBe(12);
      if(stage>0)expect(chess.moves({verbose:true}).some(m=>m.to===ENCOUNTERS[stage].target),`captain exposed in ${stage} ${route}`).toBe(false);
      expect(chess.board().flat().filter(p=>p?.color==='b')).toHaveLength(ENCOUNTERS[stage].pieces.length+(route==='danger'?1:0));
    }
  });
  it('only advances after a victory and a reward, honoring the selected route',()=>{
    const fresh=newRun();expect(nextBattle(fresh)).toBe(fresh);
    const camp={...fresh,phase:'reward' as const};expect(nextBattle(camp)).toBe(camp);
    const safe=nextBattle({...camp,rewardClaimed:true});expect(safe.charges).toBe(3);
    const dangerous=nextBattle({...camp,rewardClaimed:true,nextRoute:'danger'});
    expect(dangerous.route).toBe('danger');expect(dangerous.charges).toBe(2);expect(getChess(dangerous).get('b6')?.type).toBe('n');
  });
  it('pays risk, speed and flawless bonuses once; a missed speed target does not end the battle',()=>{
    let run=position('7k/8/8/8/8/r7/8/R3K3 w - - 0 1','a3');run.route='danger';run=playMove(run,'Rxa3');
    expect(run.earned).toBe(67);expect(run.payout.map(p=>p.label)).toContain('Dangerous road');expect(playMove(run,'Kh7')).toBe(run);
    let expired=position('r6k/8/8/8/8/8/8/R6K w - - 0 1');
    for(const move of 'Rb1 Kg8 Rc1 Kh7 Rd1 Kg6 Re1 Kf5 Rf1 Kg5 Rg1+ Kh5 Rf1 Kh6 Re1 Kh7 Rd1 Kh8 Rc1 Kg8 Rb1 Kf8 Ra1 Kg8'.split(' '))expired=playMove(expired,move);
    expect(expired.phase).toBe('battle');expired=playMove(expired,'Rxa8+');expect(expired.phase).toBe('reward');expect(expired.payout.some(p=>p.label==='Swift passage')).toBe(false);
    const slow=position('7k/8/8/8/8/r7/8/R3K3 w - - 0 1','a3');
    // FEN fullmove numbers do not earn/expire bonuses; only actual played turns count.
    slow.initialFen='7k/8/8/8/8/r7/8/R3K3 w - - 0 99';
    expect(playMove(slow,'Rxa3').earned).toBe(47);
  });
  it('offers unowned build relics and always keeps a repeatable Takeback option',()=>{
    let run=newRun();expect(rewardRelics(run)).toEqual(['hourglass','spurs','purse']);
    run=takeRelic(run,'spurs');expect(rewardRelics(run)).not.toContain('spurs');expect(rewardRelics(run)).toContain('hourglass');
  });
  it('sends allies home only at camp and never dismisses the king',()=>{
    let run=newRun();expect(sendHome(run,'rook')).toBe(run);run={...run,phase:'reward'};
    expect(sendHome(run,'king')).toBe(run);const next=sendHome(run,'rook');expect(next.coins).toBe(25);expect(next.army).toHaveLength(6);
  });
  it('prevents a free opening capture of an undefended back-rank rook in every encounter',()=>{
    for(let stage=0;stage<ENCOUNTERS.length;stage++){
      const chess=new Chess(makeBattle([...START_ARMY,{id:'second-rook',type:'r'}],stage).fen);
      expect(chess.moves({verbose:true}).filter(m=>m.from==='a1'&&m.to==='a8')).toEqual([]);
    }
  });
  it('prevents duplicate kings and negative-price recruitment',()=>{
    const run=newRun();expect(recruit(run,'k')).toBe(run);expect(recruit(run,'q',-20)).toBe(run);
  });
});
describe('Relics and readable captains',()=>{
  it('knight captures pay Spurs immediately',()=>{
    let run=takeRelic(position('7k/8/8/8/3p4/8/2N5/R3K3 w - - 0 1','h8'),'spurs');
    run=playMove(run,'Nxd4');expect(run.coins).toBe(19);expect(run.battleBonus).toBe(4);
  });
  it('Hearthstone rewards castling while tracking both units',()=>{
    let run=takeRelic(position('k7/8/8/8/8/8/8/4K2R w K - 0 1'),'bastion');
    run=playMove(run,'O-O');expect(run.coins).toBe(23);expect(run.charges).toBe(3);expect(run.positions.f1).toBe('h1');expect(run.castlePaid).toBe(true);
  });
  it('Crownseed rewards all promotions and preserves the promoted recruit',()=>{
    for(const promotion of ['q','r','b','n']){
      let run=takeRelic(position('7k/P7/8/8/8/8/8/R3K3 w - - 0 1','h8'),'seed');
      run=playMove(run,{from:'a7',to:'a8',promotion});expect(run.charges).toBe(3);expect(run.coins).toBe(35);expect(run.army.find(p=>p.id==='a7')?.type).toBe(promotion);
    }
  });
  it('Choir needs surviving bishops on opposite colors, not merely two bishops',()=>{
    for(const [bishops,paid] of [['2BBK3',true],['2B1K1B1',false]] as const){
      let run=takeRelic(position(`7k/8/8/8/8/r7/R7/${bishops} w - - 0 1`,'a3'),'choir');run=playMove(run,'Rxa3');
      expect(run.payout.some(p=>p.label==='Two-color Choir')).toBe(paid);
    }
  });
  it('Oracle capture tax and Marshal check toll follow their moving captain',()=>{
    let run=position('7k/8/8/4b3/8/2P5/8/R3K3 b - - 0 1','e5');run.stage=3;run=playMove(run,'Bxc3+');expect(run.bountyPenalty).toBe(5);expect(run.elite).toBe('c3');
    run=position('7k/8/8/3r4/8/8/8/R3K3 b - - 0 1','d5');run.stage=5;run=playMove(run,'Rd1+');expect(run.coins).toBe(12);expect(run.elite).toBe('d1');
  });
});
describe('Opponent and compatibility',()=>{
  it('the late opponent sees mate, protects its captain, and restores the input position',()=>{
    const mate=new Chess('8/8/8/8/8/5kq1/6PP/7K b - - 0 1');const fen=mate.fen();
    expect(chooseMove(mate,'tactician','g3',6)?.san).toContain('#');expect(mate.fen()).toBe(fen);
    const threatened=new Chess('7k/8/8/8/8/r7/8/R3K3 b - - 0 1');
    const move=chooseMove(threatened,'tactician','a3',6)!;expect(threatened.history()).toEqual([]);threatened.move(move);expect(threatened.isAttacked(move.from==='a3'?move.to:'a3','w')).toBe(false);
  });
  it('migrates old saves without losing the current battle or boss completion',()=>{
    const old={...newRun(),stage:4,version:undefined,phase:'victory'};
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(old)});
    const migrated=loadRun();expect(migrated.stage).toBe(11);expect(migrated.phase).toBe('victory');expect(migrated.initialFen).toBe(old.initialFen);expect(migrated.army).toEqual(START_ARMY);
    vi.unstubAllGlobals();
  });
});
