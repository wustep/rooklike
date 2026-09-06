import { Chess, type PieceSymbol, type Square, type Move } from 'chess.js';

export type Unit = { id: string; type: PieceSymbol };
export type Relic = 'hourglass' | 'purse' | 'compass';
export type Difficulty = 'wanderer' | 'tactician';
export type Phase = 'battle' | 'reward' | 'victory' | 'defeat' | 'draw';
export type Encounter = { name: string; place: string; theme: string; description: string; lesson: string; enemy: string; ability: string; target: Square; pieces: [Square, PieceSymbol][]; bounty: number };
export const NAMES: Record<PieceSymbol, string> = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };
export const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const RULES: Record<PieceSymbol, string> = { k: 'One square in any direction. Your king may never move into check.', q: 'Any number of squares along a rank, file, or diagonal. Cannot jump pieces.', r: 'Any number of squares horizontally or vertically. Cannot jump pieces.', b: 'Any number of squares diagonally. Stays on the same color. Cannot jump pieces.', n: 'Two squares in one direction, then one sideways. Knights can jump over pieces.', p: 'Forward one square (two from its starting rank). Captures one square diagonally. Reaching the last rank earns promotion.' };
export const ENCOUNTERS: Encounter[] = [
  { name: 'The Overgrown Gate', place: 'MOSSWOOD', theme: 'forest', description: 'The old road is quiet. A sentinel still keeps its watch.', lesson: 'Develop your minor pieces. A knight in the center can threaten several pieces at once.', enemy: 'Briar Sentinel', ability: 'Moves exactly like a rook. Capture the marked sentinel to open the gate. A clean victory (no pieces lost) earns 10 extra crowns.', target: 'd5', pieces: [['g8','k'],['d5','r'],['c6','p'],['e6','p']], bounty: 25 },
  { name: 'A Knight in the Mire', place: 'GLASS MARSH', theme: 'marsh', description: 'Between the reeds, something leaps where others cannot tread.', lesson: 'Look for forks: a knight can attack two valuable pieces with a single move.', enemy: 'Mire Rider', ability: 'Moves exactly like a knight. Each piece it captures costs you 5 crowns. Watch for forks: its L-shaped attacks jump over blockers.', target: 'e5', pieces: [['g8','k'],['e5','n'],['a8','r'],['d6','p'],['f6','p']], bounty: 30 },
  { name: 'The Candle Archive', place: 'EMBER LIBRARY', theme: 'ember', description: 'A thousand forgotten openings. One diagonal left unguarded.', lesson: 'Bishops love open diagonals. Look for a pin against the enemy king.', enemy: 'Lantern Keeper', ability: 'Moves exactly like a bishop. Capturing it restores one Takeback charge. Its diagonal attacks stop at the first piece.', target: 'e6', pieces: [['g8','k'],['e6','b'],['f8','r'],['b7','n'],['d5','p'],['g6','p']], bounty: 35 },
  { name: 'The Rootbound Rampart', place: 'MOSSWOOD', theme: 'forest', description: 'The crown’s last guard stands upon a wall of ancient roots.', lesson: 'Coordinate your pieces. Attack a defender twice, or draw it away from the captain.', enemy: 'Root Warden', ability: 'Moves exactly like a rook. Its capture ends the encounter. Keep every ally alive to claim 10 extra crowns.', target: 'd7', pieces: [['g8','k'],['d7','r'],['c5','b'],['f6','n'],['e6','p'],['g7','p'],['h7','p']], bounty: 40 },
  { name: 'The Hollow Crown', place: 'CROWN SANCTUM', theme: 'ember', description: 'A kingdom is more than a crown. Bring your people home.', lesson: 'The queen is powerful but vulnerable to coordinated attacks. Check forces a response; use that tempo.', enemy: 'The Hollow Queen', ability: 'Moves exactly like a queen. Capture the crowned queen OR checkmate the enemy king to break the curse and win the act.', target: 'd6', pieces: [['g8','k'],['d6','q'],['f8','r'],['b8','r'],['c6','n'],['e7','p'],['g7','p'],['h7','p']], bounty: 60 },
];
export const START_ARMY: Unit[] = [{id:'king',type:'k'},{id:'rook',type:'r'},{id:'knight',type:'n'},{id:'bishop',type:'b'},{id:'pawn1',type:'p'},{id:'pawn2',type:'p'},{id:'pawn3',type:'p'}];
export type Run = { stage: number; army: Unit[]; positions: Record<string, string>; initialFen: string; moves: string[]; elite: Square | null; coins: number; relics: Relic[]; charges: number; phase: Phase; captures: number; losses: number; battleLosses: number; difficulty: Difficulty; log: string[]; earned: number; seed: number; rewardClaimed: boolean; };
export const RELICS: Record<Relic,{name:string;description:string}> = { hourglass: {name:'Second Thought',description:'Gain 2 Takeback charges. Rewind a full turn to try a better idea.'}, purse: {name:'Royal Purse',description:'Earn 10 extra crowns after every remaining encounter.'}, compass: {name:'Tactician’s Lens',description:'Unlock a suggested legal move with a brief tactical explanation.'} };
export function makeBattle(army: Unit[], stage: number) {
  const pieces: Record<string,{type: PieceSymbol;color:'w'|'b'}> = {};
  for (const [sq,type] of ENCOUNTERS[stage].pieces) pieces[sq]={type,color:'b'};
  const slots: Record<PieceSymbol,string[]> = { k:['e1'], q:['d1','d2','c2'], r:['a1','h1','a2','h2'], b:['c1','f1','c2','f2'], n:['b1','g1','b2','g2'], p:['d2','e2','f2','c2','g2','b2','a2','h2'] };
  const positions: Record<string,string> = {};
  const fallback = ['a2','b2','c2','d2','e2','f2','g2','h2','a1','b1','c1','d1','f1','g1','h1'];
  for (const unit of [...army].sort((a,b)=>Number(b.type==='p')-Number(a.type==='p'))) {
    const sq = (unit.type==='p'?slots.p:[...slots[unit.type],...fallback]).find(s=>!pieces[s]);
    if (!sq) throw new Error('Army exceeds deployment capacity');
    positions[sq]=unit.id; pieces[sq]={type:unit.type,color:'w'};
  }
  const rows=[];
  for(let rank=8;rank>=1;rank--) { let row='',empty=0; for(const file of 'abcdefgh') {const p=pieces[file+rank]; if(!p) empty++; else {if(empty) row+=empty; empty=0;row+=p.color==='w'?p.type.toUpperCase():p.type;}} if(empty) row+=empty;rows.push(row); }
  let castles=''; if(pieces.e1?.type==='k') {if(pieces.h1?.type==='r') castles+='K';if(pieces.a1?.type==='r') castles+='Q';}
  const fen=rows.join('/')+' w '+(castles||'-')+' - 0 1';
  new Chess(fen); return {fen,positions};
}
export function newRun(difficulty: Difficulty = 'wanderer'): Run {
  const {fen,positions}=makeBattle(START_ARMY,0);
  return {stage:0,army:structuredClone(START_ARMY),positions,initialFen:fen,moves:[],elite:ENCOUNTERS[0].target,coins:15,relics:[],charges:2,phase:'battle',captures:0,losses:0,battleLosses:0,difficulty,log:['Your journey begins. Keep your king safe.'],earned:0,rewardClaimed:false,seed:Date.now()};
}
export function getChess(run: Run): Chess {const chess=new Chess(run.initialFen); for(const move of run.moves) chess.move(move); return chess;}
export function playMove(run: Run, input: string | {from:Square;to:Square;promotion?:string}): Run {
  if(run.phase!=='battle') return run;
  const chess=getChess(run); const move=chess.move(input);
  const next:Run={...run,army:run.army.map(u=>({...u})),positions:{...run.positions},moves:[...run.moves,move.san],log:[...run.log,`${move.color==='w'?'You':'Enemy'} · ${move.san}`].slice(-60)};
  const eliteMoved=run.elite===move.from;
  if(move.color==='w') {
    const id=next.positions[move.from]; delete next.positions[move.from]; next.positions[move.to]=id;
    if(move.isKingsideCastle()||move.isQueensideCastle()) {const from=move.isKingsideCastle()?'h1':'a1',to=move.isKingsideCastle()?'f1':'d1';next.positions[to]=next.positions[from];delete next.positions[from];}
    if(move.promotion) {const unit=next.army.find(u=>u.id===id); if(unit) unit.type=move.promotion;}
    if(move.captured) next.captures++;
    if(move.to===run.elite) {next.elite=null;if(run.stage===2) next.charges++;}
  } else {
    if(eliteMoved) next.elite=move.to;
    if(move.captured) {
      const square=move.isEnPassant()?move.to[0]+(Number(move.to[1])+1):move.to;
      const id=next.positions[square];next.army=next.army.filter(u=>u.id!==id);delete next.positions[square];next.losses++;next.battleLosses++;
      if(eliteMoved&&run.stage===1) {next.coins=Math.max(0,next.coins-5);next.log.push('Mire Rider steals 5 crowns.');}
    }
  }
  if(chess.isCheckmate()&&chess.turn()==='w') next.phase='defeat';
  else if(!next.elite||(chess.isCheckmate()&&chess.turn()==='b')) {
    next.earned=ENCOUNTERS[run.stage].bounty+(next.battleLosses===0?10:0)+(run.relics.includes('purse')?10:0);
    next.coins+=next.earned;next.phase=run.stage===4?'victory':'reward';
  } else if(chess.isDraw()) next.phase='draw';
  return next;
}
export function nextBattle(run: Run):Run {const stage=run.stage+1;const {fen,positions}=makeBattle(run.army,stage);return {...run,stage,positions,initialFen:fen,moves:[],elite:ENCOUNTERS[stage].target,phase:'battle',battleLosses:0,rewardClaimed:false,log:[`Entered ${ENCOUNTERS[stage].name}.`],earned:0};}
export function recruit(run:Run,type:PieceSymbol,cost=0):Run {if(run.coins<cost||run.army.length>=12||(type==='p'&&run.army.filter(u=>u.type==='p').length>=8))return run;return {...run,coins:run.coins-cost,army:[...run.army,{id:`recruit-${run.seed}-${run.stage}-${run.army.length}-${run.coins}`,type}]};}
export function takeRelic(run:Run,relic:Relic):Run {return {...run,relics:[...new Set([...run.relics,relic])],charges:run.charges+(relic==='hourglass'?2:0)};}
function evaluate(chess:Chess):number {
  if(chess.isCheckmate()) return chess.turn()==='b'?100000:-100000;
  if(chess.isDraw()) return 0;
  let score=0;
  for(const row of chess.board()) for(const p of row) if(p) {
    const file=p.square.charCodeAt(0)-97,rank=Number(p.square[1]);
    const center=3.5-Math.abs(3.5-file)+3.5-Math.abs(4.5-rank);
    const advance=p.color==='w'?rank-2:7-rank;
    const positional=p.type==='p'?advance*8:p.type==='n'||p.type==='b'?center*7:0;
    score+=(p.color==='w'?1:-1)*(VALUES[p.type]*100+positional);
  }
  return score;
}
export function chooseMove(chess: Chess, difficulty:Difficulty, elite?:Square|null): Move | undefined {
  const moves=chess.moves({verbose:true}); const color=chess.turn();
  const order=(m:Move)=>(m.captured?VALUES[m.captured]*10-VALUES[m.piece]:0)+(m.san.includes('+')?2:0)+(m.promotion?90:0);
  moves.sort((a,b)=>order(b)-order(a));
  let best:Move|undefined, bestScore=-Infinity;
  for(const move of moves) {
    chess.move(move);let score=evaluate(chess)*(color==='w'?1:-1);
    if(difficulty==='tactician'&&!chess.isGameOver()) {
      let worst=Infinity;
      for(const reply of chess.moves({verbose:true})) {chess.move(reply);let value=evaluate(chess)*(color==='w'?1:-1);if(color==='b'&&reply.to===(move.from===elite?move.to:elite))value-=1500;worst=Math.min(worst,value);chess.undo();}
      score=worst;
    } else if(chess.isAttacked(move.to,color==='w'?'b':'w')) score-=VALUES[move.piece]*65;
    if(color==='w'&&move.to===elite) score+=200000;
    if(color==='b'&&move.from===elite&&chess.isAttacked(move.to,'w'))score-=500;
    chess.undo();
    // A small deterministic tie-break keeps the opening varied by position.
    score+=Math.sin(move.to.charCodeAt(0)*13+Number(move.to[1])*7+chess.history().length)*2;
    if(score>bestScore){bestScore=score;best=move;}
  }
  return best;
}
export function hintFor(move:Move):string {if(move.san.includes('#'))return 'Checkmate: the king has no legal escape.';if(move.captured)return `Capture the ${NAMES[move.captured].toLowerCase()}. Check whether your piece will be defended afterward.`;if(move.san.includes('+'))return 'Give check. Your opponent must answer the threat to their king.';if(move.isKingsideCastle()||move.isQueensideCastle())return 'Castle to shelter your king and connect your rooks.';if(move.piece==='n'||move.piece==='b')return 'Develop a minor piece toward the center, where it controls more squares.';return 'Improve your position while keeping your king out of check.';}
export const SAVE_KEY='rooklike-run-v1';
export function loadRun():Run {try {const raw=localStorage.getItem(SAVE_KEY);if(raw){const run=JSON.parse(raw) as Run;if(run.stage>=0&&run.stage<5&&run.army.length<=12&&Array.isArray(run.relics)){getChess(run);return run;}}}catch {/* Invalid or unavailable storage starts a fresh run. */}return newRun();}
