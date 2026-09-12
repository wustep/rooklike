import { describe, expect, it } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { newRun, getChess, playMove, makeBattle, nextBattle, recruit, takeRelic, chooseMove, coachLine, drawReason, effectEntries, materialSwing, rememberTurn, takeback, formatSeed, parseSeed, hangingSquares, START_ARMY, ENCOUNTERS, type Run } from '../src/game';

function position(fen:string, elite:Square='a8'):Run {
  const run=newRun();const chess=new Chess(fen);const pieces=chess.board().flat().filter(p=>p?.color==='w');
  return {...run,initialFen:fen,elite,army:pieces.map(p=>({id:p!.square,type:p!.type})),positions:Object.fromEntries(pieces.map(p=>[p!.square,p!.square]))};
}
describe('Chess legality and campaign integration',()=>{
  it('deploys every encounter legally, including a full company',()=>{
    let run=newRun();for(let i=0;i<ENCOUNTERS.length;i++){const {fen,positions}=makeBattle(run.army,i);const chess=new Chess(fen);expect(chess.isCheck()).toBe(false);expect(chess.moves().length).toBeGreaterThan(0);expect(Object.keys(positions)).toHaveLength(run.army.length);run=recruit(run,'q');}
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
    let run=position('7k/8/8/8/8/r7/8/R3K3 w - - 0 1','a3');run=playMove(run,'Rxa3');expect(run.phase).toBe('reward');expect(run.earned).toBe(47);expect(run.coins).toBe(62);expect(playMove(run,'Kh7')).toBe(run);
  });
  it('tracks a moving captain and applies the rider theft only on its capture',()=>{
    let run=position('7k/8/8/4n3/8/3P4/8/R3K3 b - - 0 1','e5');run.stage=1;run=playMove(run,'Nxd3+');expect(run.elite).toBe('d3');expect(run.coins).toBe(10);expect(run.losses).toBe(1);
  });
  it('reports only new effect lines, capped at two, and ignores a shrinking log',()=>{
    const before=['Journey begins. Protect your king.'];
    expect(effectEntries(before,[...before,'You · Rxa3','Forked Spurs · +4.'])).toEqual(['Forked Spurs · +4.']);
    expect(effectEntries(before,[...before,'Enemy · Nxd3+','Mire Rider steals 5.','Last Rites · +9.','Crownseed · +20, +1 Takeback.'])).toEqual(['Mire Rider steals 5.','Last Rites · +9.']);
    expect(effectEntries(before,[...before,'Entered The Glass Causeway.'])).toEqual([]);
    expect(effectEntries([...before,'You · e4'],before)).toEqual([]);
    const full=Array.from({length:60},(_,i)=>`You · m${i}`);expect(effectEntries(full,[...full,'You · Rxa3','Forked Spurs · +4.'].slice(-60))).toEqual(['Forked Spurs · +4.']);expect(effectEntries(full,full)).toEqual([]);
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
  it('names which kind of draw ended the run',()=>{
    let run=position('7k/8/5K2/8/6Q1/8/8/8 w - - 0 1','h8');run=playMove(run,'Qg6');
    expect(drawReason(getChess(run)).reason).toMatch(/^Stalemate/);
    const repeat=new Chess('7k/8/8/8/8/8/8/R6K w - - 0 1');
    for(let i=0;i<2;i++)for(const san of ['Ra2','Kg8','Ra1','Kh8'])repeat.move(san);
    expect(repeat.isThreefoldRepetition()).toBe(true);expect(drawReason(repeat).reason).toMatch(/^Repetition/);
    expect(drawReason(new Chess('7k/8/8/8/8/8/8/R6K w - - 100 80')).reason).toMatch(/^Fifty moves/);
    expect(drawReason(new Chess('7k/8/8/8/8/8/8/7K w - - 0 1')).reason).toMatch(/^Insufficient material/);
    expect(drawReason(new Chess()).lesson).toContain('Play for the win');
  });
  it('persists recruited units, losses, relics, and income across stages',()=>{
    let run=position('7k/8/8/8/8/r7/8/R3K3 w - - 0 1','a3');run=takeRelic(run,'purse');run=playMove(run,'Rxa3');expect(run.earned).toBe(57);run=recruit(run,'n',25);const count=run.army.length;run=nextBattle({...run,rewardClaimed:true});expect(run.army).toHaveLength(count);expect(run.relics).toContain('purse');expect(run.moves).toEqual([]);expect(run.elite).toBe(ENCOUNTERS[1].target);
  });
  it('does not permit overspending or overfilling the company',()=>{
    let run=newRun();expect(recruit(run,'q',65)).toBe(run);for(let i=0;i<10;i++)run=recruit(run,'n');expect(run.army).toHaveLength(12);
  });
  it('deploys pawn-heavy and promotion-heavy companies without putting pawns on rank 1',()=>{
    let run=newRun();run.army=run.army.filter(u=>u.type==='k');
    for(let i=0;i<10;i++)run=recruit(run,'p');
    expect(run.army.filter(u=>u.type==='p')).toHaveLength(8);
    for(let i=0;i<3;i++)run=recruit(run,'n');
    expect(run.army).toHaveLength(12);
    const chess=new Chess(makeBattle(run.army,4).fen);
    expect(chess.board().flat().filter(p=>p?.color==='w'&&p.type==='p').every(p=>p?.square[1]==='2')).toBe(true);
    run.army=run.army.map(u=>u.type==='p'?{...u,type:'q' as const}:u);
    expect(()=>makeBattle(run.army,4)).not.toThrow();
  });
  it('AI returns legal moves at both strengths without mutating the position',()=>{
    const chess=getChess(newRun());const fen=chess.fen();for(const difficulty of ['wanderer','tactician'] as const){const move=chooseMove(chess,difficulty,'d5');expect(chess.moves()).toContain(move?.san);expect(chess.fen()).toBe(fen);expect(chess.history()).toEqual([]);}
  });
  it('takeback rewinds several turns in one fight and keeps a legal board',()=>{
    const ply=(current:Run,prefer?:string)=>{const moves=getChess(current).moves();const san=prefer&&moves.includes(prefer)?prefer:moves[0];return playMove(current,san);};
    let run=newRun();let history:Run[]=[];
    const opening=getChess(run).fen();
    history=rememberTurn(history,run);run=ply(run,'e4');run=ply(run);
    const afterFirst=run;
    history=rememberTurn(history,run);run=ply(run,'Nc3');run=ply(run);
    expect(run.moves.length).toBe(4);expect(run.charges).toBe(2);
    const once=takeback(run,history)!;expect(once.run.moves).toEqual(afterFirst.moves);expect(getChess(once.run).fen()).toBe(getChess(afterFirst).fen());expect(once.run.charges).toBe(1);expect(once.run.battleUndos).toBe(1);expect(once.run.phase).toBe('battle');
    const twice=takeback(once.run,once.history)!;expect(twice.run.moves).toEqual([]);expect(getChess(twice.run).fen()).toBe(opening);expect(twice.run.charges).toBe(0);expect(twice.run.battleUndos).toBe(2);expect(takeback(twice.run,twice.history)).toBeNull();
  });
  it('takeback restores captured pieces and refuses an empty or uncharged history',()=>{
    let run=position('7k/8/8/8/8/r7/8/R3K3 w - - 0 1','h8');
    expect(takeback(run,[])).toBeNull();
    const history=rememberTurn([],run);run=playMove(run,'Rxa3');expect(run.captures).toBe(1);
    const undone=takeback({...run,charges:0},history);expect(undone).toBeNull();
    const restored=takeback(run,history)!;expect(restored.run.captures).toBe(0);expect(restored.run.positions.a1).toBe('a1');expect(getChess(restored.run).get('a3')?.color).toBe('b');expect(getChess(restored.run).isCheck()).toBe(false);
  });
  it('coaches on the ivory plies only, in strict precedence, and falls back to the lesson',()=>{
    expect(coachLine(['e4','e5','Qh5','Nc6','Bc4','Nf6','Qxf7#'],'LESSON')).toMatch(/mate/);
    expect(coachLine(['a8=Q+','Kh7','O-O','Kh8','Rf1+'],'LESSON')).toMatch(/last rank/);
    expect(coachLine(['Nf3','d5','O-O-O','e5','Bb5+'],'LESSON')).toMatch(/castled/);
    expect(coachLine(['Bb5+','c6','Qh5+','g6','Rd8+','Kg7','Ne4'],'LESSON')).toMatch(/tempo/);
    expect(coachLine(['e4','d5','Nf3','Qd6+'],'LESSON')).toBe('LESSON');
  });
  it('reads material from both sides, including en passant',()=>{
    const chess=new Chess('4k3/8/8/3pP3/4n3/8/3P4/4K3 w - d6 0 1');
    chess.move('exd6');chess.move('Nxd2');
    expect(materialSwing(chess)).toMatchObject({taken:['p'],lost:['p'],delta:0,reading:'even material'});
    chess.move('Kxd2');
    expect(materialSwing(chess)).toMatchObject({taken:['p','n'],lost:['p'],delta:3,reading:'+3, a piece up'});
  });
  it('road codes round trip and reject anything that is not a seed',()=>{
    for(const seed of [0,1,42,1295,Date.now()]) expect(parseSeed(formatSeed(seed))).toBe(seed);
    expect(formatSeed(1295)).toBe('zz');
    expect(parseSeed(' ZZ ')).toBe(1295);
    for(const bad of ['','  ','-5','1.5','zz!','hello world','∞','99999999999999999999']) expect(parseSeed(bad)).toBeNull();
    expect(newRun('wanderer',parseSeed('zz')!).seed).toBe(1295);
  });
});
describe('Hanging squares',()=>{
  it('marks an attacked ivory piece with no defender',()=>{
    expect([...hangingSquares(new Chess('4k3/8/2n5/8/3Q4/8/8/4K3 w - - 0 1'))]).toEqual(['d4']);
  });
  it('clears once any defender covers the square, king included',()=>{
    expect(hangingSquares(new Chess('4k3/8/2n5/8/3Q4/2P5/8/4K3 w - - 0 1')).has('d4')).toBe(false);
    expect(hangingSquares(new Chess('4k3/8/2n5/8/3Q4/4K3/8/8 w - - 0 1')).has('d4')).toBe(false);
  });
  it('never marks enemy pieces, empty squares, or the ivory king',()=>{
    expect(hangingSquares(new Chess('4k3/8/8/8/8/8/8/R1n1K3 w - - 0 1')).size).toBe(0);
    expect(hangingSquares(new Chess('4k3/8/8/8/8/8/8/r3K3 w - - 0 1')).size).toBe(0);
  });
  it('holds the predicate across every encounter deployment',()=>{
    let run=newRun();
    for(let i=0;i<ENCOUNTERS.length;i++){
      const chess=new Chess(makeBattle(run.army,i).fen);
      for(const sq of hangingSquares(chess)){
        const piece=chess.get(sq);
        expect(piece?.color).toBe('w');expect(piece?.type).not.toBe('k');
        expect(chess.attackers(sq,'b').length).toBeGreaterThan(0);expect(chess.attackers(sq,'w')).toHaveLength(0);
      }
      run=recruit(run,'n');
    }
  });
});
