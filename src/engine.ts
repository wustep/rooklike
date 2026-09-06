import { Chess, type Move, type Square, type PieceSymbol } from 'chess.js';
import { assertPosition } from './rules';

export type SearchProfile = { depth: number; nodes: number; quiescence: number };
export type SearchStats = { depth: number; nodes: number; score: number };
export const SEARCH_PROFILES: SearchProfile[] = [
  {depth:1,nodes:350,quiescence:0},
  {depth:2,nodes:1000,quiescence:2},
  {depth:2,nodes:1600,quiescence:3},
  {depth:3,nodes:2200,quiescence:3},
  {depth:3,nodes:2800,quiescence:3},
  {depth:3,nodes:3500,quiescence:4},
  {depth:3,nodes:4000,quiescence:4},
  {depth:4,nodes:4500,quiescence:4},
  {depth:4,nodes:5000,quiescence:4},
  {depth:4,nodes:5500,quiescence:4},
  {depth:4,nodes:6000,quiescence:5},
  {depth:4,nodes:6500,quiescence:5},
];
const VALUE: Record<PieceSymbol,number> = {p:100,n:320,b:335,r:500,q:950,k:0};
const WIN=100000;

/** Centipawns from ivory's perspective. No chess rules are changed by this evaluation. */
export function evaluatePosition(chess: Chess): number {
  const board=chess.board();
  const pawns={w:Array(8).fill(0) as number[],b:Array(8).fill(0) as number[]};
  const bishops={w:0,b:0},undeveloped={w:0,b:0};
  let nonPawnMaterial=0;
  for(const row of board)for(const p of row)if(p){if(p.type==='p')pawns[p.color][p.square.charCodeAt(0)-97]++;else if(p.type!=='k')nonPawnMaterial+=VALUE[p.type];if(p.type==='b')bishops[p.color]++;if((p.type==='b'||p.type==='n')&&p.square[1]===(p.color==='w'?'1':'8'))undeveloped[p.color]++;}
  let score=0;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const p=board[y][x];if(!p)continue;
    const sign=p.color==='w'?1:-1,advance=p.color==='w'?6-y:y-1;
    const center=7-Math.abs(x-3.5)-Math.abs(y-3.5);
    let positional=0;
    if(p.type==='p'){
      positional=advance*9+Math.max(0,advance-2)**2*7+center*2;
      if(pawns[p.color][x]>1)positional-=13;
      if(!(pawns[p.color][x-1]||pawns[p.color][x+1]))positional-=10;
      let passed=true;
      for(let rank=y+(p.color==='w'?-1:1);rank>=0&&rank<8;rank+=p.color==='w'?-1:1)for(let file=Math.max(0,x-1);file<=Math.min(7,x+1);file++)if(board[rank][file]?.type==='p'&&board[rank][file]?.color!==p.color)passed=false;
      if(passed)positional+=12+advance*8;
    }else if(p.type==='n')positional=center*12-(x===0||x===7?18:0)-(advance<0?18:0);
    else if(p.type==='b')positional=center*6+(advance>=0?10:-12);
    else if(p.type==='r')positional=(pawns[p.color][x]?0:18)+(pawns[p.color==='w'?'b':'w'][x]?0:10)+(advance===5?24:0);
    else if(p.type==='q')positional=center*3-(advance>0&&undeveloped[p.color]>=2?12:0);
    else if(p.type==='k'){
      if(nonPawnMaterial<1800)positional=center*10;
      else {
        positional=-Math.max(0,advance+1)*19;
        if((x<=2||x>=6)&&(p.color==='w'?y>=6:y<=1))positional+=26;
        const shieldRank=y+(p.color==='w'?-1:1);
        for(let file=Math.max(0,x-1);file<=Math.min(7,x+1);file++)if(board[shieldRank]?.[file]?.color===p.color&&board[shieldRank][file]?.type==='p')positional+=14;
        for(let rank=Math.max(0,y-2);rank<=Math.min(7,y+2);rank++)for(let file=Math.max(0,x-2);file<=Math.min(7,x+2);file++){const threat=board[rank][file];if(threat&&threat.color!==p.color)positional-=threat.type==='q'?32:threat.type==='r'?22:14;}
      }
    }
    score+=sign*(VALUE[p.type]+positional);
  }
  if(bishops.w>=2)score+=35;if(bishops.b>=2)score-=35;
  return score;
}

export function chooseMove(chess: Chess, difficulty:'wanderer'|'tactician', elite?:Square|null, stage=0, override?:Partial<SearchProfile>, stats?:SearchStats): Move|undefined {
  try {assertPosition(chess);}catch{return undefined;}
  const base=SEARCH_PROFILES[Math.min(stage,SEARCH_PROFILES.length-1)]??SEARCH_PROFILES[0];
  const profile={...base,...(difficulty==='tactician'?{depth:Math.min(5,base.depth+1),nodes:Math.round(base.nodes*1.6),quiescence:Math.max(2,base.quiescence)}:{}),...override};
  let nodes=0,completed=0,lastScore=0;
  const abort=Symbol('search budget');
  const table=new Map<string,{depth:number;score:number;bound:'exact'|'lower'|'upper';move:string}>();
  const killers=new Map<number,string[]>();
  const history=new Map<string,number>();
  const code=(m:Move)=>m.from+m.to+(m.promotion??'');
  const sign=()=>chess.turn()==='w'?1:-1;
  function moves(captain:Square|null|undefined,preferred?:string,ply=0){
    const order=(m:Move)=>(code(m)===preferred?1000000:0)+(m.color==='w'&&m.to===captain?500000:0)+(m.captured?10000+VALUE[m.captured]*10-VALUE[m.piece]:0)+(m.promotion?8000+VALUE[m.promotion]:0)+(m.san.includes('+')?900:0)+(killers.get(ply)?.includes(code(m))?700:0)+(history.get(code(m))??0);
    return chess.moves({verbose:true}).filter(m=>m.captured!=='k').sort((a,b)=>order(b)-order(a));
  }
  function tick(){if(++nodes>profile.nodes)throw abort;}
  function terminal(ply:number):number|undefined{
    if(chess.isCheckmate())return -WIN+ply;
    if(chess.isInsufficientMaterial()||chess.isThreefoldRepetition()||chess.isDrawByFiftyMoves())return 0;
  }
  function after(move:Move,captain:Square|null|undefined,callback:(next:Square|null|undefined)=>number):number{
    if(move.color==='w'&&move.to===captain)return WIN;
    chess.move(move);
    try{return -callback(move.color==='b'&&move.from===captain?move.to:captain);}finally{chess.undo();}
  }
  function quiet(alpha:number,beta:number,captain:Square|null|undefined,remaining:number,ply:number):number{
    tick();const end=terminal(ply);if(end!==undefined)return end;
    const checked=chess.isCheck();
    if(!checked&&chess.isStalemate())return 0;
    let all:Move[]|undefined;
    if((stage>0||difficulty==='tactician')&&chess.turn()==='w'&&captain&&chess.isAttacked(captain,'w')){
      all=moves(captain,undefined,ply);
      if(all.some(m=>m.to===captain))return WIN-ply;
    }
    const stand=evaluatePosition(chess)*sign();
    if(!checked){if(stand>=beta)return stand;alpha=Math.max(alpha,stand);}
    if(remaining<=0&&!checked)return stand;
    if(remaining<-2)return stand;
    all??=moves(captain,undefined,ply);
    if(!all.length)return checked?-WIN+ply:0;
    const candidates=checked?all:all.filter(m=>m.captured||m.promotion);
    for(const move of candidates){const value=after(move,captain,next=>quiet(-beta,-alpha,next,remaining-1,ply+1));if(value>=beta)return value;alpha=Math.max(alpha,value);}
    return alpha;
  }
  function search(depth:number,alpha:number,beta:number,captain:Square|null|undefined,ply:number):number{
    if(depth<=0)return quiet(alpha,beta,captain,profile.quiescence,ply);
    tick();const end=terminal(ply);if(end!==undefined)return end;
    // Position and captain both matter. Avoid history-sensitive TT reuse around repetition.
    const key=chess.fen()+'|'+(captain??'');
    const cached=table.get(key),originalAlpha=alpha;
    if(cached&&cached.depth>=depth&&Math.abs(cached.score)<WIN-1000){if(cached.bound==='exact')return cached.score;if(cached.bound==='lower')alpha=Math.max(alpha,cached.score);else beta=Math.min(beta,cached.score);if(alpha>=beta)return cached.score;}
    const all=moves(captain,cached?.move,ply);if(!all.length)return 0;
    let best=-Infinity,bestMove=all[0];
    for(const move of all){
      const value=after(move,captain,next=>search(depth-1,-beta,-alpha,next,ply+1));
      if(value>best){best=value;bestMove=move;}alpha=Math.max(alpha,value);
      if(alpha>=beta){if(!move.captured){killers.set(ply,[code(move),...(killers.get(ply)??[])].slice(0,2));history.set(code(move),(history.get(code(move))??0)+depth*depth);}break;}
    }
    if(table.size<20000)table.set(key,{depth,score:best,bound:best<=originalAlpha?'upper':best>=beta?'lower':'exact',move:code(bestMove)});
    return best;
  }
  let all=moves(elite),best=all[0];
  if(!best)return undefined;
  // A legal, safety-aware fallback is available even if a large position exhausts depth one.
  let fallback=-Infinity;
  for(const move of all){
    let value=after(move,elite,()=>{
      if(chess.isCheckmate())return -WIN;
      let result=evaluatePosition(chess)*sign();
      if(chess.isAttacked(move.to,chess.turn()))result+=VALUE[move.piece]*.8;
      if(move.color==='b'&&elite&&chess.isAttacked(move.from===elite?move.to:elite,'w'))result+=stage>=2?20000:move.from===elite?600:0;
      return result;
    });
    if(value>fallback){fallback=value;best=move;}
  }
  all=[best,...all.filter(m=>code(m)!==code(best))];
  for(let depth=1;depth<=profile.depth;depth++){
    let iterationBest=best,score=-Infinity;
    const ranked:{move:Move;score:number}[]=[];
    try{
      for(const move of all){let value=after(move,elite,next=>search(depth-1,-Infinity,-score,next,1));if(value>score){score=value;iterationBest=move;}ranked.push({move,score:value});}
      best=iterationBest;lastScore=score;completed=depth;all=ranked.sort((a,b)=>b.score-a.score).map(r=>r.move);
      if(score>=WIN-100)break;
    }catch(error){if(error!==abort)throw error;break;}
  }
  if(stats){stats.depth=completed;stats.nodes=nodes;stats.score=lastScore;}
  return best;
}
