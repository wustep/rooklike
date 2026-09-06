import { describe, expect, it } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { newRun, getChess, playMove, makeBattle, nextBattle, recruit, takeRelic, chooseMove, START_ARMY, ENCOUNTERS, type Run } from '../src/game';

function position(fen:string, elite:Square='a8'):Run {
  const run=newRun();const chess=new Chess(fen);const pieces=chess.board().flat().filter(p=>p?.color==='w');
  return {...run,initialFen:fen,elite,army:pieces.map(p=>({id:p!.square,type:p!.type})),positions:Object.fromEntries(pieces.map(p=>[p!.square,p!.square]))};
}
describe('Chess legality and campaign integration',()=>{
  it('deploys every encounter legally, including a full company',()=>{
    let run=newRun();for(let i=0;i<5;i++){const {fen,positions}=makeBattle(run.army,i);const chess=new Chess(fen);expect(chess.isCheck()).toBe(false);expect(chess.moves().length).toBeGreaterThan(0);expect(Object.keys(positions)).toHaveLength(run.army.length);run=recruit(run,'q');}
    expect(START_ARMY.length).toBe(7);
  });
  it('forbids exposing the king with a pinned rook',()=>{
    const run=position('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');
    expect(()=>playMove(run,{from:'e2',to:'d2'})).toThrow();expect(getChess(run).fen()).toBe(run.initialFen);
  });
  it('forbids king movement into attack and through attacked castling squares',()=>{
    const run=position('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(()=>playMove(run,{from:'e1',to:'f1'})).toThrow();expect(getChess(run).moves()).not.toContain('O-O');
  });
  it('updates both unit identities when castling',()=>{
    let run=position('k7/8/8/8/8/8/8/4K2R w K - 0 1');run=playMove(run,'O-O');expect(run.positions.g1).toBe('e1');expect(run.positions.f1).toBe('h1');expect(run.positions.h1).toBeUndefined();
  });
  it('tracks white en passant and black en passant casualties',()=>{
    let run=position('k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1');run=playMove(run,'exd6');expect(getChess(run).get('d5')).toBeUndefined();expect(run.positions.d6).toBe('e5');expect(run.captures).toBe(1);
    run=position('k7/8/8/8/3Pp3/8/8/4K3 b - d3 0 1');run=playMove(run,'exd3');expect(run.army.map(u=>u.id)).not.toContain('d4');expect(run.losses).toBe(1);
  });
  it('offers all four promotions and carries promoted type into the army',()=>{
    let run=position('7k/P7/8/8/8/8/8/4K3 w - - 0 1','h8');expect(getChess(run).moves({square:'a7',verbose:true}).filter(m=>m.to==='a8')).toHaveLength(4);run=playMove(run,{from:'a7',to:'a8',promotion:'n'});expect(run.army.find(u=>u.id==='a7')?.type).toBe('n');
  });
  it('ends the encounter by captain capture and pays a flawless bonus exactly once',()=>{
    let run=position('7k/8/8/8/8/r7/8/R3K3 w - - 0 1','a3');run=playMove(run,'Rxa3');expect(run.phase).toBe('reward');expect(run.earned).toBe(35);expect(run.coins).toBe(50);expect(playMove(run,'Kh7')).toBe(run);
  });
  it('tracks a moving captain and applies the rider theft only on its capture',()=>{
    let run=position('7k/8/8/4n3/8/3P4/8/R3K3 b - - 0 1','e5');run.stage=1;run=playMove(run,'Nxd3+');expect(run.elite).toBe('d3');expect(run.coins).toBe(10);expect(run.losses).toBe(1);
  });
  it('lantern capture restores a takeback',()=>{
    let run=position('7k/8/8/8/8/b7/8/R3K3 w - - 0 1','a3');run.stage=2;run=playMove(run,'Rxa3');expect(run.charges).toBe(3);
  });
  it('handles checkmate as defeat without capturing a king',()=>{
    let run=position('8/8/8/8/8/5kq1/6PP/7K b - - 0 1','g3');run=playMove(run,'Qxg2#');expect(run.phase).toBe('defeat');expect(run.army.some(p=>p.type==='k')).toBe(true);
  });
  it('handles stalemate as a draw, not a checkmate or victory',()=>{
    let run=position('7k/8/5K2/8/6Q1/8/8/8 w - - 0 1','h8');run=playMove(run,'Qg6');expect(run.phase).toBe('draw');
  });
  it('persists recruited units, losses, relics, and income across stages',()=>{
    let run=position('7k/8/8/8/8/r7/8/R3K3 w - - 0 1','a3');run=takeRelic(run,'purse');run=playMove(run,'Rxa3');expect(run.earned).toBe(45);run=recruit(run,'n',25);const count=run.army.length;run=nextBattle(run);expect(run.army).toHaveLength(count);expect(run.relics).toContain('purse');expect(run.moves).toEqual([]);expect(run.elite).toBe(ENCOUNTERS[1].target);
  });
  it('does not permit overspending or overfilling the company',()=>{
    let run=newRun();expect(recruit(run,'q',65)).toBe(run);for(let i=0;i<10;i++)run=recruit(run,'n');expect(run.army).toHaveLength(12);
  });
  it('AI returns legal moves at both strengths without mutating the position',()=>{
    const chess=getChess(newRun());const fen=chess.fen();for(const difficulty of ['wanderer','tactician'] as const){const move=chooseMove(chess,difficulty,'d5');expect(chess.moves()).toContain(move?.san);expect(chess.fen()).toBe(fen);expect(chess.history()).toEqual([]);}
  });
});
