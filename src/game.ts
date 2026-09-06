import { Chess, type PieceSymbol, type Square, type Move } from 'chess.js';
import { assertPosition, legalMove, repairSetup } from './rules';

export type Unit = { id: string; type: PieceSymbol };
export type Relic = 'hourglass' | 'purse' | 'compass' | 'spurs' | 'choir' | 'seed' | 'bastion' | 'salvage' | 'vow' | 'supply' | 'trophy';
export type Difficulty = 'wanderer' | 'tactician';
export type Route = 'shelter' | 'danger';
export type Phase = 'battle' | 'reward' | 'victory' | 'defeat' | 'draw';
export type Encounter = { name: string; place: string; theme: string; description: string; lesson: string; enemy: string; ability: string; target: Square; pieces: [Square, PieceSymbol][]; bounty: number; power?: string; par?: number; effect?: 'theft' | 'lantern' | 'oracle' | 'toll' };
export const NAMES: Record<PieceSymbol, string> = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };
export const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const RULES: Record<PieceSymbol, string> = { k: 'One square in any direction. Your king may never move into check.', q: 'Any number of squares along a rank, file, or diagonal. Cannot jump pieces.', r: 'Any number of squares horizontally or vertically. Cannot jump pieces.', b: 'Any number of squares diagonally. Stays on the same color. Cannot jump pieces.', n: 'Two squares in one direction, then one sideways. Knights can jump over pieces.', p: 'Forward one square (two from its starting rank). Captures one square diagonally. Reaching the last rank earns promotion.' };
export const ENCOUNTERS: Encounter[] = [
  { name: 'The Overgrown Gate', place: 'MOSSWOOD', theme: 'forest', description: 'The old road is quiet. A sentinel still keeps its watch.', lesson: 'Develop your minor pieces. A knight in the center can threaten several pieces at once.', enemy: 'Briar Sentinel', ability: 'Moves exactly like a rook. Capture the marked sentinel to open the gate. A clean victory (no pieces lost) earns 10 extra crowns.', target: 'd5', pieces: [['g8','k'],['a6','p'],['b7','p'],['d5','r'],['c6','p'],['e6','p'],['f7','p'],['g7','p']], bounty: 25 },
  { name: 'A Knight in the Mire', place: 'GLASS MARSH', theme: 'marsh', description: 'Between the reeds, something leaps where others cannot tread.', lesson: 'Look for forks: a knight can attack two valuable pieces with a single move.', enemy: 'Mire Rider', ability: 'Moves exactly like a knight. Each piece it captures costs you 5 crowns. Watch for forks: its L-shaped attacks jump over blockers.', target: 'e5', pieces: [['g8','k'],['a7','p'],['e5','n'],['e4','p'],['d4','p'],['f4','p'],['a8','r'],['d6','p'],['f6','p'],['f7','p'],['g7','p']], bounty: 30 },
  { name: 'The Candle Archive', place: 'EMBER LIBRARY', theme: 'ember', description: 'A thousand forgotten openings. One diagonal left unguarded.', lesson: 'Bishops love open diagonals. Look for a pin against the enemy king.', enemy: 'Lantern Keeper', ability: 'Moves exactly like a bishop. Capturing it restores one Takeback charge. Its diagonal attacks stop at the first piece.', target: 'e6', pieces: [['g8','k'],['a7','p'],['e6','b'],['e5','p'],['f5','p'],['f8','r'],['b7','n'],['d5','p'],['g6','p'],['f7','p'],['g7','p']], bounty: 35 },
  { name: 'The White Silence', place: 'FROSTGLASS PASS', theme: 'frost', description: 'Two bishops. Two colors. Nowhere to hide without a plan.', lesson: 'A bishop only guards one color. Use the other color to approach, then challenge its diagonal.', enemy: 'Glass Oracle', power: 'Cold calculation', ability: 'A bishop backed by a second bishop. Each time the Oracle captures an ally, the victory bounty falls by 5 crowns, up to 15. Trade its defenders before you close in.', target: 'd6', pieces: [['g8','k'],['a7','p'],['d6','b'],['d5','p'],['c5','p'],['e5','p'],['f8','b'],['a8','r'],['f6','n'],['c7','p'],['f7','p'],['g7','p'],['h7','p']], bounty: 38, par: 16 },
  { name: 'The Rootbound Rampart', place: 'MOSSWOOD', theme: 'forest', description: 'The crown’s last guard stands upon a wall of ancient roots.', lesson: 'Coordinate your pieces. Attack a defender twice, or draw it away from the captain.', enemy: 'Root Warden', ability: 'Moves exactly like a rook. Its capture ends the encounter. Keep every ally alive to claim 10 extra crowns.', target: 'd7', pieces: [['g8','k'],['a7','p'],['d7','r'],['d6','p'],['c6','p'],['c5','b'],['f6','n'],['e6','p'],['f7','p'],['g7','p'],['h7','p']], bounty: 40 },
  { name: 'Thunder on the Files', place: 'STORMWATCH', theme: 'storm', description: 'The towers have a clear line to the throne. Close it.', lesson: 'Rooks coordinate along open files. Contest the file or block it with a defended piece.', enemy: 'Storm Marshal', power: 'King hunt', ability: 'A rook with a queen in support. Every check delivered by the Marshal costs 3 crowns. Answer the check first; the purse can wait.', target: 'e6', pieces: [['g8','k'],['a7','p'],['e6','r'],['e5','p'],['d5','p'],['f5','p'],['d7','q'],['a8','r'],['c6','b'],['f6','n'],['b7','p'],['f7','p'],['g7','p'],['h7','p']], bounty: 45, par: 18 },
  { name: 'The Sealed Keep', place: 'IRONWARD', theme: 'iron', description: 'A safe king is not a luxury. It is how a company survives.', lesson: 'Castle before the files open. A rook belongs in the fight; your king usually does not.', enemy: 'Iron Castellan', power: 'The long watch', ability: 'A rook behind a pawn screen. Its bishop and queen punish an exposed king. Break the screen, then hunt the captain.', target: 'c6', pieces: [['g8','k'],['c6','r'],['b5','p'],['c5','p'],['d5','p'],['e7','q'],['a8','r'],['f6','b'],['d7','n'],['a7','p'],['f7','p'],['g7','p'],['h7','p']], bounty: 48, par: 20 },
  { name: 'The Queen’s Bargain', place: 'VIOLET COURT', theme: 'storm', description: 'She offers you a pawn. Count what it will cost.', lesson: 'A tempting capture can open a line to your king. Look one reply further before you take.', enemy: 'Velvet Regent', power: 'Royal ransom', effect: 'theft', ability: 'A queen supported by two bishops. Each captain capture of an ally costs 5 crowns. Do not let a small prize lure your king into the open.', target: 'f6', pieces: [['g8','k'],['f6','q'],['e5','p'],['f5','p'],['g5','p'],['d6','b'],['c7','b'],['e7','n'],['b8','n'],['a8','r'],['a7','p'],['f7','p'],['g7','p'],['h7','p']], bounty: 55, par: 22 },
  { name: 'The Last Pawn', place: 'ASHEN MARCH', theme: 'ember', description: 'The smallest soldiers are closest to your throne.', lesson: 'Passed pawns become queens. Block their advance with a defended piece before they reach your back rank.', enemy: 'Ash Ferryman', power: 'A borrowed moment', effect: 'lantern', ability: 'A rook driving a line of advanced pawns. Its capture restores one Takeback. Enemy pawns promote by the same rules as yours.', target: 'd7', pieces: [['g8','k'],['d7','r'],['d6','p'],['c6','p'],['e6','p'],['a4','p'],['b4','p'],['c4','p'],['e7','q'],['b8','r'],['f6','n'],['h6','b'],['f7','p'],['g7','p'],['h7','p']], bounty: 50, par: 22 },
  { name: 'The Broken Diagonal', place: 'MOONGLASS', theme: 'frost', description: 'One narrow line runs through every good plan.', lesson: 'A pinned defender may look useful but cannot always recapture. Trace its line back to the king.', enemy: 'Mirror Confessor', power: 'The price of doubt', effect: 'oracle', ability: 'A bishop with a queen on the neighboring diagonal. Each ally it captures cuts the victory bounty by 5, up to 15.', target: 'g6', pieces: [['g8','k'],['g6','b'],['f5','p'],['g5','p'],['h5','p'],['c5','b'],['d8','r'],['f7','q'],['c6','n'],['a7','p'],['b7','p'],['e6','p'],['g7','p'],['h7','p']], bounty: 55, par: 23 },
  { name: 'The King’s Last Door', place: 'CROWN APPROACH', theme: 'iron', description: 'One guard between your company and the throne.', lesson: 'Checks, captures, threats. Look for forcing moves before quiet ones, especially when your king has little room.', enemy: 'Last Doorkeeper', power: 'The king’s levy', effect: 'toll', ability: 'A rook supported by a queen and a second rook. Each check the captain gives costs 3 crowns. Keep an escape square for your king.', target: 'f7', pieces: [['g8','k'],['f7','r'],['e6','p'],['f6','p'],['g6','p'],['d6','q'],['b8','r'],['c6','n'],['g7','b'],['a7','p'],['b7','p'],['c5','p'],['d5','p'],['e5','p'],['h7','p']], bounty: 60, par: 24 },
  { name: 'The Hollow Crown', place: 'CROWN SANCTUM', theme: 'crown', description: 'A kingdom is more than a crown. Bring your people home.', lesson: 'The queen is powerful but vulnerable to coordinated attacks. Check forces a response; use that tempo.', enemy: 'The Hollow Queen', ability: 'Moves exactly like a queen. Capture the crowned queen OR checkmate the enemy king to break the curse and win the act.', target: 'd6', pieces: [['g8','k'],['a7','p'],['d6','q'],['d5','p'],['c5','p'],['e5','p'],['f8','r'],['b8','r'],['c6','n'],['f6','b'],['e7','p'],['f7','p'],['g7','p'],['h7','p']], bounty: 60 },
];
ENCOUNTERS.forEach((e, i) => { e.par ??= [12, 14, 15, 18, 19, 20, 20, 22, 22, 23, 24, 25][i]; e.power ??= ['Unbroken company', 'Pickpocket', 'A moment of clarity', '', 'Unbroken company', '', '', '', '', '', '', 'The final stand'][i]; });
ENCOUNTERS[1].effect='theft';ENCOUNTERS[2].effect='lantern';ENCOUNTERS[3].effect='oracle';ENCOUNTERS[5].effect='toll';
export const ACTS = [
  {name:'The Wild Road', numeral:'I', description:'Learn the shapes. Bring your company through.'},
  {name:'The Fractured Court', numeral:'II', description:'Build a plan. The guard has one too.'},
  {name:'The Crown War', numeral:'III', description:'Every open line is a threat to your king.'},
];
export function seeded(seed:number, salt:number):number {let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return (x^(x>>>15))>>>0;}
const VARIANTS: Record<number,{name:string;enemy:string;theme?:string;place?:string;type?:PieceSymbol;description:string;lesson?:string}> = {
  3:{name:'The Rime Stalker',enemy:'Rime Stalker',type:'n',description:'The ice is still. The knight is not.',lesson:'Knights jump over a pawn wall. Look for the squares from which they can fork your king and a defender.'},
  4:{name:'The Toll Bridge',enemy:'Bridge Warden',theme:'marsh',place:'GLASS MARSH',description:'The bridge takes its toll in pieces.'},
  5:{name:'The Silent Battery',enemy:'Silent Marshal',description:'Two towers. One line through your king.'},
  6:{name:'The Brass Bastion',enemy:'Brass Castellan',description:'A fortress is only as strong as its weakest file.'},
  7:{name:'The Widow’s Court',enemy:'Widow Regent',theme:'crown',description:'Her first gift is free. The second is a trap.'},
  8:{name:'The Pawn Procession',enemy:'Cinder Ferryman',description:'A line of small ambitions. Stop them before they become crowns.'},
  9:{name:'The Drowned Confession',enemy:'Reed Confessor',theme:'marsh',place:'DEEP MARSH',description:'Under the water, the diagonals still meet.'},
  10:{name:'The Black Portcullis',enemy:'Obsidian Doorkeeper',theme:'crown',description:'The last door opens inward. Make room for your king.'},
  11:{name:'The Crown Unmasked',enemy:'The Unmasked Queen',description:'No more masks. No more roads. Keep your king standing.'},
};
export function encounterFor(stage:number, seed=0):Encounter {
  const base=ENCOUNTERS[stage];if(!base)throw new Error('Unknown encounter.');
  const encounter={...base,pieces:base.pieces.map(([sq,type])=>[sq,type] as [Square,PieceSymbol])};
  const variant=VARIANTS[stage];
  if(stage>0&&seeded(seed,stage*7)%2){
    if(variant){Object.assign(encounter,variant);if(variant.type){const captain=encounter.pieces.find(p=>p[0]===encounter.target)!;captain[1]=variant.type;encounter.ability=`Moves like a ${NAMES[variant.type].toLowerCase()}. Each ally the captain captures reduces its bounty by 5 crowns, up to 15.`;}}
    const guard=encounter.pieces.find(p=>p[0]!==encounter.target&&(p[1]==='n'||p[1]==='b'));
    if(guard)guard[1]=guard[1]==='n'?'b':'n';
    else {const pawn=encounter.pieces.find(p=>p[0]==='f6'&&p[1]==='p');if(pawn&&!encounter.pieces.some(p=>p[0]==='h6'))pawn[0]='h6';}
  }
  return encounter;
}
export function getEncounter(run:Pick<Run,'stage'|'seed'>){return encounterFor(run.stage,run.seed);}
export function shopStock(run:Run):{type:PieceSymbol;cost:number}[] {
  const base:{type:PieceSymbol;cost:number}[]=[{type:'p',cost:12},{type:'n',cost:25},{type:'b',cost:25},{type:'r',cost:35},{type:'q',cost:65}];
  const stock=run.stage===0?base.slice(0,4):[base[0],...base.slice(1).filter((_,i)=>i!==seeded(run.seed,run.stage*17)%4)];
  return stock.map(item=>({...item,cost:Math.max(8,item.cost+(run.stage===0?0:(seeded(run.seed,run.stage*31+item.cost)%3-1)*3)-(run.relics.includes('supply')?5:0))}));
}
export const START_ARMY: Unit[] = [{id:'king',type:'k'},{id:'rook',type:'r'},{id:'knight',type:'n'},{id:'bishop',type:'b'},{id:'pawn1',type:'p'},{id:'pawn2',type:'p'},{id:'pawn3',type:'p'}];
export type Run = { stage: number; army: Unit[]; positions: Record<string, string>; initialFen: string; moves: string[]; elite: Square | null; coins: number; relics: Relic[]; charges: number; phase: Phase; captures: number; losses: number; battleLosses: number; difficulty: Difficulty; log: string[]; earned: number; seed: number; rewardClaimed: boolean; claimedReward: string | null; version: 3; battleUndos: number; provisionClaimed: boolean; route: Route; nextRoute: Route; battleBonus: number; bountyPenalty: number; castlePaid: boolean; payout: { label: string; amount: number }[]; };
export const RELICS: Record<Relic,{name:string;description:string}> = {
  hourglass: {name:'Second Thought',description:'Gain 2 Takebacks now. One charge rewinds your move and the enemy reply. Can be chosen again.'},
  purse: {name:'Royal Purse',description:'Every victory pays 10 extra crowns. Invest early; bring a larger company to the throne.'},
  compass: {name:'Tactician’s Lens',description:'Unlock a suggested legal move and its idea. A second pair of eyes when the board gets sharp.'},
  spurs: {name:'Forked Spurs',description:'Every knight capture earns 4 crowns immediately. More knights, more chances to fund the company.'},
  choir: {name:'Two-color Choir',description:'Win with bishops on both square colors to earn 14 extra crowns. Keep both voices alive.'},
  seed: {name:'Crownseed',description:'Each pawn promotion earns 20 crowns and a Takeback. A small piece with a very long ambition.'},
  salvage: {name:'Last Rites',description:'The first ally lost each battle leaves 3 crowns per material point. A fallen rook leaves 15. Losses still carry forward.'},
  vow: {name:'Unbroken Oath',description:'Win without using a Takeback in that battle to earn 15 extra crowns. Commit to your line, or break the oath to save your king.'},
  supply: {name:'Quartermaster’s Seal',description:'Every recruit costs 5 fewer crowns, to a minimum of 8. More room in the purse for the company you want.'},
  trophy: {name:'Small Ambition',description:'Capture a captain with a pawn to earn 18 extra crowns. Promotions count. Clear a path for the smallest soldier.'},
  bastion: {name:'Hearthstone',description:'Your first castle each battle earns 8 crowns and a Takeback. Recruit a rook; build your king a home.'},
};
export function rewardRelics(run: Run): Relic[] {
  const pools: Relic[][] = [['spurs','purse','compass'], ['choir','bastion','seed'], ['seed','compass','spurs'], ['bastion','choir','purse']];
  const pool = run.stage===0 ? [...pools[0],...Object.keys(RELICS) as Relic[]] : (Object.keys(RELICS) as Relic[]).sort((a,b)=>seeded(run.seed,run.stage*53+Object.keys(RELICS).indexOf(a))-seeded(run.seed,run.stage*53+Object.keys(RELICS).indexOf(b)));
  return ['hourglass', ...[...new Set(pool)].filter(r => r !== 'hourglass' && (!run.relics.includes(r)||r===run.claimedReward)).slice(0,2)];
}
export function bonusState(run: Run) {
  const par = getEncounter(run).par!;
  const turns = Math.ceil(run.moves.length / 2);
  return { par, turns, remaining: Math.max(0, par - turns), available: turns < par || (turns === par && run.phase !== 'battle') };
}
export function armySynergies(run: Run): string[] {
  const count = (type: PieceSymbol) => run.army.filter(u => u.type === type).length;
  return [run.relics.includes('spurs') ? `${count('n')} knights · +4 per capture` : '', run.relics.includes('choir') ? `${count('b')} bishops · +14 for both colors surviving` : '', run.relics.includes('seed') ? `${count('p')} pawns · +20 per promotion` : '', run.relics.includes('bastion') ? 'Castle · +8 crowns & a Takeback' : ''].filter(Boolean);
}
export function makeBattle(army: Unit[], stage: number, route: Route = 'shelter', seed=0) {
  const pieces: Record<string,{type: PieceSymbol;color:'w'|'b'}> = {};
  const encounter=encounterFor(stage,seed);
  for (const [sq,type] of encounter.pieces) pieces[sq]={type,color:'b'};
  if(route==='danger') { const square = (['b6','a6','h6'] as Square[]).find(s => !pieces[s])!; pieces[square]={type:stage<3?'n':'r',color:'b'}; }
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
  const safe=repairSetup(fen,encounter.target);
  return {...safe,positions};
}
export function newRun(difficulty: Difficulty = 'wanderer', seed=Date.now()): Run {
  const {fen,positions,elite}=makeBattle(START_ARMY,0,'shelter',seed);
  return {battleUndos:0,provisionClaimed:false,claimedReward:null,version:3,route:'shelter',nextRoute:'shelter',battleBonus:0,bountyPenalty:0,castlePaid:false,payout:[],stage:0,army:structuredClone(START_ARMY),positions,initialFen:fen,moves:[],elite,coins:15,relics:[],charges:2,phase:'battle',captures:0,losses:0,battleLosses:0,difficulty,log:['Your journey begins. Keep your king safe.'],earned:0,rewardClaimed:false,seed};
}
export function getChess(run: Run): Chess {const chess=new Chess(run.initialFen); assertPosition(chess);for(const move of run.moves) legalMove(chess,move); return chess;}
export function playMove(run: Run, input: string | {from:Square;to:Square;promotion?:string}): Run {
  if(run.phase!=='battle') return run;
  const encounter=getEncounter(run);const chess=getChess(run); const move=legalMove(chess,input);
  const next:Run={...run,army:run.army.map(u=>({...u})),positions:{...run.positions},moves:[...run.moves,move.san],payout:[...run.payout],log:[...run.log,`${move.color==='w'?'You':'Enemy'} · ${move.san}`].slice(-60)};
  const eliteMoved=run.elite===move.from;
  if(move.color==='w') {
    const id=next.positions[move.from]; delete next.positions[move.from]; next.positions[move.to]=id;
    if(move.isKingsideCastle()||move.isQueensideCastle()) {const from=move.isKingsideCastle()?'h1':'a1',to=move.isKingsideCastle()?'f1':'d1';next.positions[to]=next.positions[from];delete next.positions[from];}
    if(move.promotion && run.relics.includes('seed')) {next.coins+=20;next.battleBonus+=20;next.charges++;next.log.push('Crownseed · +20 crowns, +1 Takeback.');}
    if((move.isKingsideCastle()||move.isQueensideCastle()) && run.relics.includes('bastion') && !run.castlePaid) {next.coins+=8;next.battleBonus+=8;next.charges++;next.castlePaid=true;next.log.push('Hearthstone · +8 crowns, +1 Takeback.');}
    if(move.captured && move.piece==='n' && run.relics.includes('spurs')) {next.coins+=4;next.battleBonus+=4;next.log.push('Forked Spurs · +4 crowns.');}
    if(move.promotion) {const unit=next.army.find(u=>u.id===id); if(unit) unit.type=move.promotion;}
    if(move.captured) next.captures++;
    if(move.to===run.elite) {next.elite=null;if(encounter.effect==='lantern') next.charges++;}
  } else {
    if(eliteMoved) {next.elite=move.to;if(encounter.effect==='toll'&&chess.isCheck()) {next.coins=Math.max(0,next.coins-3);next.log.push(`${encounter.enemy} · check toll, −3 crowns.`);}}
    if(move.captured) {
      const square=move.isEnPassant()?move.to[0]+(Number(move.to[1])+1):move.to;
      const id=next.positions[square];next.army=next.army.filter(u=>u.id!==id);delete next.positions[square];next.losses++;next.battleLosses++;
      if(run.relics.includes('salvage')&&run.battleLosses===0){const amount=VALUES[move.captured]*3;next.coins+=amount;next.battleBonus+=amount;next.log.push(`Last Rites · +${amount} crowns.`);}
      if(eliteMoved&&encounter.effect==='oracle') {next.bountyPenalty=Math.min(15,run.bountyPenalty+5);next.log.push(`${encounter.enemy} · victory bounty reduced by 5.`);}
      if(eliteMoved&&encounter.effect==='theft') {next.coins=Math.max(0,next.coins-5);next.log.push(`${encounter.enemy} steals 5 crowns.`);}
    }
  }
  if(chess.isCheckmate()&&chess.turn()==='w') next.phase='defeat';
  else if(!next.elite||(chess.isCheckmate()&&chess.turn()==='b')) {
    const bishops=chess.board().flat().filter(p=>p?.color==='w'&&p.type==='b');
    const colors=new Set(bishops.map(p=>(p!.square.charCodeAt(0)+Number(p!.square[1]))%2));
    next.payout=[{label:'Captain bounty',amount:encounter.bounty-next.bountyPenalty}];
    if(next.battleLosses===0)next.payout.push({label:'Everyone home',amount:10});
    if(Math.ceil(next.moves.length/2)<=getEncounter(run).par!)next.payout.push({label:'Swift passage',amount:12});
    if(run.route==='danger')next.payout.push({label:'Dangerous road',amount:20});
    if(run.relics.includes('purse'))next.payout.push({label:'Royal Purse',amount:10});
    if(run.relics.includes('choir')&&colors.size===2)next.payout.push({label:'Two-color Choir',amount:14});
    if(run.relics.includes('vow')&&run.battleUndos===0)next.payout.push({label:'Unbroken Oath',amount:15});
    if(run.relics.includes('trophy')&&move.color==='w'&&move.piece==='p'&&move.to===run.elite)next.payout.push({label:'Small Ambition',amount:18});
    next.earned=next.payout.reduce((sum,p)=>sum+p.amount,0);
    next.coins+=next.earned;next.phase=run.stage===ENCOUNTERS.length-1?'victory':'reward';
  } else if(chess.isDraw()) next.phase='draw';
  return next;
}
export function nextBattle(run: Run):Run {
  if(run.phase!=='reward' || !run.rewardClaimed || (run.stage%4===3&&!run.provisionClaimed) || run.stage>=ENCOUNTERS.length-1)return run;
  const stage=run.stage+1, route=run.nextRoute;
  const {fen,positions,elite}=makeBattle(run.army,stage,route,run.seed);
  return {...run,stage,route,nextRoute:'shelter',positions,initialFen:fen,moves:[],elite,phase:'battle',battleLosses:0,battleUndos:0,provisionClaimed:false,rewardClaimed:false,claimedReward:null,battleBonus:0,bountyPenalty:0,castlePaid:false,payout:[],charges:run.charges+(route==='shelter'?1:0),log:[`Entered ${encounterFor(stage,run.seed).name}.`,route==='danger'?'Dangerous road: an extra guard. +20 crowns if you win.':'Sheltered road: +1 Takeback.'],earned:0};
}
export function recruit(run:Run,type:PieceSymbol,cost=0):Run {if(type==='k'||cost<0||!Number.isFinite(cost)||run.coins<cost||run.army.length>=12||(type==='p'&&run.army.filter(u=>u.type==='p').length>=8))return run;return {...run,coins:run.coins-cost,army:[...run.army,{id:`recruit-${run.seed}-${run.stage}-${run.army.length}-${run.coins}`,type}]};}
export function claimProvision(run:Run,kind:'rest'|'gold'|'rook'):Run {
  if(run.phase!=='reward'||run.stage%4!==3||run.provisionClaimed)return run;
  if(kind==='rook'){const next=recruit(run,'r');return next===run?run:{...next,provisionClaimed:true};}
  return {...run,provisionClaimed:true,coins:run.coins+(kind==='gold'?25:0),charges:run.charges+(kind==='rest'?2:0)};
}
export function sendHome(run: Run, id: string): Run {
  const unit=run.army.find(u=>u.id===id);
  if(run.phase!=='reward'||!unit||unit.type==='k')return run;
  return {...run,army:run.army.filter(u=>u.id!==id),coins:run.coins+VALUES[unit.type]*2};
}
export function takeRelic(run:Run,relic:Relic):Run {return {...run,relics:[...new Set([...run.relics,relic])],charges:run.charges+(relic==='hourglass'?2:0)};}
export { chooseMove } from './engine';
export function tacticalRead(chess: Chess, square?: Square|null): string {
  if(chess.isCheck())return chess.turn()==='w'?'Check. Capture the attacker, block its line, or move your king. Only legal escapes are highlighted.':'Their king is in check. Watch which defender has to leave its post.';
  if(!square)return 'Select an enemy to trace its attacks. Select an ally to find your next move.';
  const piece=chess.get(square);if(!piece)return 'An open square can be an invitation. Check who controls it.';
  const enemy=piece.color==='w'?'b':'w';
  const attackers=chess.attackers(square,enemy);
  const defenders=chess.attackers(square,piece.color);
  if(attackers.length&&!defenders.length)return `${NAMES[piece.type]} on ${square} is attacked by ${attackers.join(', ')} and has no defender. ${piece.color==='w'?'Move it, defend it, or make a stronger threat.':'A possible target — check that your capture is safe.'}`;
  if(attackers.length)return `${square}: ${attackers.length} attacker${attackers.length===1?'':'s'}, ${defenders.length} defender${defenders.length===1?'':'s'}. Count the value of each exchange; numbers alone are not enough.`;
  const targets=chess.board().flat().filter(p=>p?.color===enemy&&chess.attackers(p.square,piece.color).includes(square));
  if(targets.length>=2)return `${NAMES[piece.type]} on ${square} attacks ${targets.map(p=>`${NAMES[p!.type].toLowerCase()} on ${p!.square}`).join(' and ')}. One piece, two threats: a fork.`;
  return `${NAMES[piece.type]} on ${square}. ${RULES[piece.type]}`;
}
export function hintFor(move:Move):string {if(move.san.includes('#'))return 'Checkmate: the king has no legal escape.';if(move.captured)return `Capture the ${NAMES[move.captured].toLowerCase()}. Check whether your piece will be defended afterward.`;if(move.san.includes('+'))return 'Give check. Your opponent must answer the threat to their king.';if(move.isKingsideCastle()||move.isQueensideCastle())return 'Castle to shelter your king and connect your rooks.';if(move.piece==='n'||move.piece==='b')return 'Develop a minor piece toward the center, where it controls more squares.';return 'Improve your position while keeping your king out of check.';}
export const SAVE_KEY='rooklike-run-v1';
export function loadRun():Run {
  try {
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw){
      const saved=JSON.parse(raw);
      const run={...newRun(),...saved} as Run;
      if(saved.version!==3){run.stage=saved.version===2?(saved.stage===6?11:saved.stage):(saved.stage===4?11:saved.stage===3?4:saved.stage);run.version=3;}
      if(Number.isInteger(run.stage)&&run.stage>=0&&run.stage<ENCOUNTERS.length&&Array.isArray(run.army)&&run.army.length<=12&&Array.isArray(run.relics)&&run.relics.every(r=>r in RELICS)&&['battle','reward','victory','defeat','draw'].includes(run.phase)){
        try {assertPosition(new Chess(run.initialFen),true);getChess(run);return run;}
        catch {const setup=makeBattle(run.army,run.stage,run.route,run.seed);return {...run,initialFen:setup.fen,positions:setup.positions,elite:setup.elite,moves:[],battleLosses:0,bountyPenalty:0,castlePaid:false,battleBonus:0,log:['An unsafe saved deployment was rebuilt. Your company, crowns and relics are intact.']};}
      }
    }
  }catch {/* Invalid or unavailable storage starts a fresh run. */}
  return newRun();
}
