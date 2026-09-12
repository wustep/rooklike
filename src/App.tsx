import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { PieceSymbol, Square } from 'chess.js';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, CircleHelp, Coins, Crown, Eye, EyeOff, Flag, Gem, Heart, RotateCcw, Shield, Skull, Sparkles, Swords, Volume2, VolumeX, X } from 'lucide-react';
import { legalMoves } from './rules';
import type { SearchProfile } from './engine';
import { Piece } from './Piece';
import { ENCOUNTERS, ACTS, encounterFor, getEncounter, shopStock, claimProvision, NAMES, VALUES, RULES, RELICS, SAVE_KEY, loadRun, loadHistory, saveHistory, getChess, newRun, playMove, nextBattle, recruit, sendHome, takeRelic, chooseMove, hintFor, rewardRelics, bonusState, armySynergies, tacticalRead, hangingSquares, coachLine, materialSwing, rememberTurn, takeback, DIFFICULTY_LABELS, formatSeed, parseSeed, type Run, type Difficulty } from './game';

function sound(capture=false) {try {const ctx=new AudioContext(); const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(capture?260:440,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(capture?90:220,ctx.currentTime+.13);gain.gain.setValueAtTime(.06,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);osc.start();osc.stop(ctx.currentTime+.18);osc.onended=()=>void ctx.close();}catch{/* Audio is optional. */}}
const FILES='abcdefgh';
declare global {interface Window {__ROOKLIKE_TEST__?:{override?:Partial<SearchProfile>;delay?:number}} interface ImportMeta {readonly env:{readonly DEV:boolean}}}
export default function App() {
  const [run,setRun]=useState<Run>(loadRun);
  const [selected,setSelected]=useState<Square|null>(null);
  const [hovered,setHovered]=useState<Square|null>(null);
  const [threats,setThreats]=useState(false);
  const [help,setHelp]=useState(false);
  const [intro,setIntro]=useState(()=>{try{return !localStorage.getItem('rooklike-welcomed');}catch{return true;}});
  const [restart,setRestart]=useState(false);
  const [muted,setMuted]=useState(true);
  const [hint,setHint]=useState<{from:Square;to:Square;text:string}|null>(null);
  const [promotion,setPromotion]=useState<{from:Square;to:Square}|null>(null);
  const [history,setHistory]=useState<Run[]>(()=>loadHistory(run));
  const rewardChosen=run.rewardClaimed;
  const [studying,setStudying]=useState(false);
  const [notice,setNotice]=useState('');
  const [saveError,setSaveError]=useState(false);
  const [roster,setRoster]=useState(false);
  const [code,setCode]=useState('');
  const [codeBad,setCodeBad]=useState(false);
  const [journal,setJournal]=useState(false);
  const [focusSquare,setFocusSquare]=useState<Square>('e2');
  const [drag,setDrag]=useState<{from:Square;x:number;y:number;originX:number;originY:number;size:number;piece:{type:PieceSymbol;color:'w'|'b'};active:boolean;already:boolean}|null>(null);
  const squareRefs=useRef<Record<string,HTMLButtonElement|null>>({});
  const mutedRef=useRef(muted);mutedRef.current=muted;
  const dragRef=useRef(drag);dragRef.current=drag;
  const skipClick=useRef(false);
  const workerRef=useRef<Worker|null>(null);
  const requestId=useRef(0);
  const chess=useMemo(()=>getChess(run),[run]);
  const encounter=getEncounter(run);
  const act=ACTS[Math.floor(run.stage/4)];
  const campActEnd=run.stage%4===3;
  const stock=shopStock(run);
  const routeMap=ENCOUNTERS.map((_,i)=>encounterFor(i,run.seed));
  const nextRoad=routeMap[run.stage+1];
  const nextCaptain=nextRoad?.pieces.find(p=>p[0]===nextRoad.target)?.[1];
  const bonus=bonusState(run);
  const synergies=armySynergies(run);
  const pressure=`ACT ${act.numeral} · ${act.name.toUpperCase()}`;
  const canUndo=!!takeback(run,history);
  const thinking=run.phase==='battle'&&chess.turn()==='b';
  const moveFrom=drag?.from??selected;
  const legal=useMemo(()=>moveFrom&&chess.turn()==='w'&&run.phase==='battle'?legalMoves(chess,moveFrom):[],[chess,moveFrom,run.phase]);
  const riskySquares=useMemo(()=>{const probe=getChess(run);const squares=new Set<Square>();for(const candidate of legal){probe.move(candidate);if(probe.isAttacked(candidate.to,'b'))squares.add(candidate.to);probe.undo();}return squares;},[run,legal]);
  const hanging=useMemo(()=>threats?hangingSquares(chess):new Set<Square>(),[chess,threats]);
  const inspected=selected?chess.get(selected):null;
  const moveHistory=useMemo(()=>chess.history({verbose:true}),[chess]);
  const swing=useMemo(()=>materialSwing(chess),[chess]);
  const lastMove=moveHistory.at(-1);
  const checkedKing=chess.isCheck()?chess.board().flat().find(p=>p?.type==='k'&&p.color===chess.turn())?.square:null;
  const checkers=useMemo(()=>checkedKing?chess.attackers(checkedKing,chess.turn()==='w'?'b':'w'):[],[chess,checkedKing]);
  const announcement=lastMove?`${lastMove.color==='w'?'Your':'Enemy'} ${NAMES[lastMove.piece].toLowerCase()} ${lastMove.captured?`takes ${NAMES[lastMove.captured].toLowerCase()} on ${lastMove.to}`:`to ${lastMove.to}`}.${lastMove.promotion?` Promotes to ${NAMES[lastMove.promotion].toLowerCase()}.`:''}${chess.isCheckmate()?' Checkmate.':chess.isCheck()?chess.turn()==='w'?' You are in check.':' Enemy king is in check.':''}`:'';

  useEffect(()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(run));saveHistory(history);setSaveError(false);}catch{setSaveError(true);}},[run,history]);
  useEffect(()=>()=>{workerRef.current?.terminate();workerRef.current=null;},[]);
  useEffect(()=>{
    if(!thinking||intro||help||restart) return;
    const hook=import.meta.env.DEV?window.__ROOKLIKE_TEST__:undefined;
    const fallback=()=>{setNotice('Enemy paused. Retrying.'); const move=chooseMove(getChess(run),'wanderer',run.elite,run.stage,hook?.override);if(move)setRun(current=>current===run?playMove(current,move.san):current);};
    const id=++requestId.current;
    let worker=workerRef.current;
    if(!worker){worker=new Worker(new URL('./ai.worker.ts',import.meta.url),{type:'module'});workerRef.current=worker;}
    worker.onmessage=(e:MessageEvent<{id:number;san:string|null}>)=>{if(e.data.id!==requestId.current)return;const san=e.data.san;if(!san){fallback();return;}if(!mutedRef.current)sound(san.includes('x'));setRun(current=>current===run?playMove(current,san):current);};
    worker.onerror=(e:ErrorEvent)=>{console.error('AI worker failed',e.message,e.filename,e.lineno);workerRef.current?.terminate();workerRef.current=null;fallback();};
    const timer=setTimeout(()=>workerRef.current?.postMessage({id,run,override:hook?.override}),hook?.delay??550);
    return()=>clearTimeout(timer);
  },[thinking,run,intro,help,restart]);
  useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(t);}},[notice]);

  function undo() {
    const next=takeback(run,history);if(!next)return;
    setStudying(false);setRun(next.run);setHistory(next.history);setSelected(null);setHint(null);setDrag(null);setNotice(next.history.length?'Takeback. You can rewind further.':'Takeback used.');
  }
  function move(from:Square,to:Square,promote?:string) {
    if(thinking||run.phase!=='battle') return;
    setHistory(current=>rememberTurn(current,run));const next=playMove(run,{from,to,promotion:promote});setRun(next);setSelected(null);setHint(null);setPromotion(null);setDrag(null);
    if(!muted)sound(!!chess.get(to));
  }
  function selectSquare(sq:Square) {
    if(run.phase!=='battle'){setSelected(sq);return;}
    if(thinking||intro)return;
    const candidate=legal.find(m=>m.to===sq);
    if(selected&&candidate) {if(candidate.promotion)setPromotion({from:selected,to:sq});else move(selected,sq);return;}
    const piece=chess.get(sq);
    if(piece?.color==='w'){setSelected(selected===sq?null:sq);setHint(null);}
    else if(piece?.color==='b'){setSelected(sq);setHint(null);}
    else {if(selected)setNotice(chess.isCheck()?'Check. Only highlighted moves are legal.':'Pick a highlighted square.');setSelected(null);}
  }
  function beginDrag(sq:Square,e:PointerEvent<HTMLButtonElement>) {
    if(thinking||intro||run.phase!=='battle'||chess.turn()!=='w')return;
    const piece=chess.get(sq);if(piece?.color!=='w')return;
    e.preventDefault();
    skipClick.current=true;
    const next={from:sq,x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,size:e.currentTarget.getBoundingClientRect().width,piece:{type:piece.type,color:piece.color},active:false,already:selected===sq};
    dragRef.current=next;setDrag(next);setSelected(sq);setHint(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDragMove(e:PointerEvent<HTMLButtonElement>) {
    const current=dragRef.current;if(!current)return;
    const active=current.active||Math.hypot(e.clientX-current.originX,e.clientY-current.originY)>12;
    const next={...current,x:e.clientX,y:e.clientY,active};
    dragRef.current=next;setDrag(next);
    const el=document.elementFromPoint(e.clientX,e.clientY);
    const sq=el?.closest('[data-square]')?.getAttribute('data-square') as Square|null;
    setHovered(sq??null);
  }
  function endDrag(e:PointerEvent<HTMLButtonElement>) {
    const current=dragRef.current;if(!current)return;
    const el=document.elementFromPoint(e.clientX,e.clientY);
    const sq=el?.closest('[data-square]')?.getAttribute('data-square') as Square|undefined;
    const candidate=sq?legalMoves(chess,current.from).find(m=>m.to===sq):undefined;
    dragRef.current=null;setDrag(null);
    skipClick.current=true;
    window.setTimeout(()=>{skipClick.current=false;},50);
    if(candidate){if(candidate.promotion)setPromotion({from:current.from,to:candidate.to});else move(current.from,candidate.to);}
    else if(current.active||current.already){setSelected(null);setHovered(null);}
  }
  function showHint() {const m=chooseMove(chess,'tactician',run.elite,run.stage,{nodes:2000});if(m){setHint({from:m.from,to:m.to,text:hintFor(m)});setSelected(m.from);}}
  useEffect(()=>{
    function key(e:KeyboardEvent) {
      if((e.target as HTMLElement).matches('select, input, textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.key==='Escape'){setHelp(false);setRestart(false);setPromotion(null);setSelected(null);setHint(null);setDrag(null);}
      if(intro||help||restart||promotion||run.phase!=='battle')return;
      if(e.key.toLowerCase()==='h'){e.preventDefault();setThreats(t=>!t);}
      if(e.key.toLowerCase()==='u'){e.preventDefault();undo();}
      if(e.key==='?'){e.preventDefault();setHelp(true);}
    }
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  function reset(seed?:number) {setRun(newRun(run.difficulty,seed));setRestart(false);setSelected(null);setHint(null);setHistory([]);setStudying(false);setDrag(null);setCode('');setCodeBad(false);}
  async function copySeed() {const text=formatSeed(run.seed);try{await navigator.clipboard.writeText(text);setNotice('Road code copied.');}catch{setNotice(`Road code: ${text}`);}}
  function playCode() {const seed=parseSeed(code);if(seed===null){setCodeBad(true);return;}reset(seed);setNotice('Road code loaded.');}
  const seedRow=(<div className="seed-row"><span className="eyebrow">ROAD CODE</span><code>{formatSeed(run.seed)}</code><button className="quiet-button" onClick={copySeed}>Copy</button></div>);
  function start() {setIntro(false);try{localStorage.setItem('rooklike-welcomed','1');}catch{/* Optional. */}}
  function buy(type:PieceSymbol,cost:number) {const next=recruit(run,type,cost);if(next===run){setNotice('Cannot recruit.');return;}setRun(next);setNotice(`${NAMES[type]} joined.`);}
  const modalOpen=intro||help||restart||!!promotion||(run.phase!=='battle'&&!studying);

  return <div className={`app theme-${encounter.theme}`}>
    <div className="ambient" aria-hidden="true"><i/><i/><i/></div>
    <div className="game-shell" inert={modalOpen}>
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setRestart(true);}} aria-label="Rooklike, start a new journey"><span className="brand-icon"><Piece type="r" small/></span>ROOKLIKE</a>
      <div className="chapter"><span className="pill">ACT {act.numeral} / III</span><span className="stage-count">{String(run.stage+1).padStart(2,'0')} / {ENCOUNTERS.length}</span></div>
      <div className="header-actions">
        <span className="purse" title="Crowns"><Coins size={14}/>{run.coins}</span>
        <label className="difficulty compact"><select aria-label="Difficulty" value={run.difficulty} onChange={e=>setRun({...run,difficulty:e.target.value as Difficulty})}><option value="wanderer">{DIFFICULTY_LABELS.wanderer}</option><option value="tactician">{DIFFICULTY_LABELS.tactician}</option></select></label>
        {saveError&&<span className="save-label">Save unavailable</span>}
        <button className="icon-button" title={muted?'Enable sound':'Mute sound'} aria-label={muted?'Enable sound':'Mute sound'} onClick={()=>setMuted(!muted)}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
        <button className="icon-button" title="How to play (?)" aria-label="How to play" onClick={()=>setHelp(true)}><CircleHelp size={19}/></button>
      </div>
    </header>
    {studying&&<div className="study-banner">Final position · {run.phase}<button onClick={()=>reset()}>New journey</button></div>}
    <div className="layout">
      <aside className="left-panel">
        <nav className="journey-dots" aria-label="Campaign progress">{routeMap.map((e,i)=><span className={`dot ${i===run.stage?'current':''} ${i<run.stage?'completed':''}`} title={e.name} key={e.name}/>)}</nav>
        <div className="army-pieces">{run.army.map(unit=><span title={`${NAMES[unit.type]}${unit.type==='k'?' · Protect':` · ${VALUES[unit.type]}`}`} key={unit.id}><Piece type={unit.type} small/></span>)}</div>
        {run.relics.length>0&&<div className="relics">{run.relics.map(r=><span className="relic-item" key={r} title={`${RELICS[r].name}: ${RELICS[r].description}`}><Sparkles size={13}/>{RELICS[r].name}</span>)}</div>}
        <button className="quiet-button abandon" onClick={()=>setRestart(true)}>New journey</button>
      </aside>
      <main className="battle-panel">
        <div className="encounter-heading"><h1>{encounter.name}</h1><p className="briefing"><Crown size={11}/><strong>{encounter.enemy}</strong> {encounter.ability} <span>{encounter.lesson}</span></p></div>
        <div className={`turn-bar ${chess.isCheck()?'check-bar':''}`} role="status" aria-live="polite"><div><span className={`turn-indicator ${thinking?'thinking':''}`}/><strong>{chess.isCheck()?(thinking?'Enemy king in check':'Check'):thinking?'Enemy thinking…':'Your move'}</strong></div><span className="sr-only">{announcement}</span><span className="turn-count">{Math.floor(run.moves.length/2)+1}</span></div>
        <div className={`board-scene ${lastMove?.captured?'capture-scene':''}`}>
          {lastMove?.captured&&<div key={`${run.stage}-${run.moves.length}`} className={`capture-feedback ${lastMove.color==='b'?'ally-lost':''}`} aria-hidden="true">{lastMove.color==='w'?`${NAMES[lastMove.captured]} captured`:`${NAMES[lastMove.captured]} lost`}</div>}
          <div className="board-frame">
            <div className="rank-labels" aria-hidden="true">{[8,7,6,5,4,3,2,1].map(r=><span key={r}>{r}</span>)}</div>
            <div className={`chessboard${drag?' is-dragging':''}${thinking?' is-thinking':''}`} role="group" aria-busy={thinking} aria-label="Chessboard. You play ivory. Drag or click a piece to move. Arrow keys navigate; Enter selects.">{Array.from({length:64},(_,i)=>{
              const rank=8-Math.floor(i/8),file=i%8,sq=(FILES[file]+rank) as Square,piece=chess.get(sq);
              const target=legal.some(m=>m.to===sq),isElite=sq===run.elite;
              const threatened=threats&&chess.isAttacked(sq,'b'),undefended=hanging.has(sq);
              const enemyReach=selected&&chess.get(selected)?.color==='b'&&chess.attackers(sq,'b').includes(selected);
              const risky=riskySquares.has(sq),givesCheck=checkers.includes(sq);
              return <button ref={el=>{squareRefs.current[sq]=el;}} key={sq} data-square={sq} className={`square ${(file+rank)%2===0?'light':'dark'} ${selected===sq||drag?.from===sq?'selected':''} ${target?'legal':''} ${target&&piece?'capture':''} ${lastMove&&(lastMove.from===sq||lastMove.to===sq)?'last-move':''} ${checkedKing===sq?'king-check':''} ${givesCheck?'checking-piece':''} ${hint?.to===sq?'hint-square':''} ${threatened?'threatened':''} ${enemyReach?'enemy-reach':''} ${isElite?'captain-square':''} ${risky?'risky-move':''} ${drag?.from===sq?'dragging-from':''} ${drag?.active&&hovered===sq&&target?'drop-target':''}`} tabIndex={focusSquare===sq?0:-1} aria-label={`${sq}${piece?`, ${piece.color==='w'?'your':'enemy'} ${NAMES[piece.type]}`:', empty'}${isElite?', marked captain':''}${givesCheck?', gives check':''}${checkedKing===sq?', in check':''}${target?', legal move':''}${threatened?', enemy attacks this square':''}${undefended?', undefended':''}${enemyReach?', selected enemy attacks this square':''}${risky?', destination attacked':''}`} aria-pressed={selected===sq} onPointerDown={e=>beginDrag(sq,e)} onPointerMove={onDragMove} onPointerUp={e=>{endDrag(e);if(e.pointerType!=='mouse')setHovered(null);}} onPointerCancel={endDrag} onClick={()=>{if(skipClick.current){skipClick.current=false;return;}selectSquare(sq);}} onMouseEnter={()=>setHovered(sq)} onMouseLeave={()=>setHovered(null)} onFocus={()=>{setFocusSquare(sq);}} onKeyDown={e=>{
                const offsets:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const step=offsets[e.key];if(step){e.preventDefault();const col=i%8+step[0],row=Math.floor(i/8)+step[1];if(col<0||col>7||row<0||row>7)return;const nextSq=(FILES[col]+(8-row)) as Square;setFocusSquare(nextSq);squareRefs.current[nextSq]?.focus();}
              }}>
                {piece&&<Piece type={piece.type} color={piece.color} variant={isElite?encounter.theme:undefined}/>}{isElite&&<span className="elite-mark" title="Marked captain"><Crown size={11}/></span>}{target&&!piece&&<span className="move-dot"/>}{enemyReach&&<span className="enemy-reach-dot"/>}{threatened&&<span className={undefended?'threat-dot hanging':'threat-dot'}/>}{checkedKing===sq&&<span className="check-mark">!</span>}
              </button>;
            })}</div>
            {drag?.active&&<div className="drag-ghost" style={{left:drag.x,top:drag.y,'--ghost':`${drag.size}px`} as React.CSSProperties} aria-hidden="true"><Piece type={drag.piece.type} color={drag.piece.color}/></div>}
            {lastMove&&<svg className="move-trail" viewBox="0 0 8 8" aria-hidden="true"><defs><marker id="move-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs><line x1={FILES.indexOf(lastMove.from[0])+.5} y1={8-Number(lastMove.from[1])+.5} x2={FILES.indexOf(lastMove.to[0])+.5} y2={8-Number(lastMove.to[1])+.5} markerEnd="url(#move-arrow)"/></svg>}
            <div className="file-labels" aria-hidden="true">{[...FILES].map(f=><span key={f}>{f}</span>)}</div>
          </div>
        </div>
        <div className="passage-bonus"><div className="bonus-label"><strong>Swift passage</strong><span>Turn {Math.floor(run.moves.length/2)+1} · target {bonus.par} · {bonus.available?'+12':'expired'}</span></div><div className="bonus-track"><span style={{width:`${Math.max(0,1-Math.ceil(run.moves.length/2)/bonus.par)*100}%`}}/></div></div>
        {swing.taken.length+swing.lost.length>0&&<div className="material" role="status" aria-label={`Material: ${swing.taken.length} taken, ${swing.lost.length} lost, ${swing.reading}`}>{swing.taken.length>0&&<span className="material-side">TAKEN {swing.taken.map((type,i)=><Piece key={i} type={type} color="b" small/>)}</span>}{swing.lost.length>0&&<span className="material-side">LOST {swing.lost.map((type,i)=><Piece key={i} type={type} color="w" small/>)}</span>}<strong className={swing.delta>0?'ahead':swing.delta<0?'behind':''}>{swing.reading}</strong></div>}
        <div className="board-tools">
          <button className={threats?'tool active':'tool'} onClick={()=>setThreats(!threats)} aria-pressed={threats}>{threats?<Eye size={16}/>:<EyeOff size={16}/>} Threats <kbd>H</kbd></button>
          <button className="tool" onClick={undo} disabled={!canUndo||(run.phase!=='battle'&&run.phase!=='defeat'&&run.phase!=='draw')}><RotateCcw size={15}/> Takeback <span className="charge-count">{run.charges}</span><kbd>U</kbd></button>
          {run.relics.includes('compass')&&<button className="tool" onClick={showHint} disabled={thinking||run.phase!=='battle'}><Sparkles size={15}/> Hint</button>}
          <button className="tool journal-tool" onClick={()=>setJournal(!journal)} aria-expanded={journal} aria-label="Move journal"><BookOpen size={15}/></button>
        </div>
        {hint&&<div className="hint-message"><Sparkles size={16}/><span><strong>{hint.from} → {hint.to}.</strong> {hint.text}</span></div>}
        {journal&&<div className="journal"><div className="section-label">JOURNAL <button className="icon-button" aria-label="Close journal" onClick={()=>setJournal(false)}><X size={14}/></button></div><div>{run.log.map((entry,i)=><span className={i===run.log.length-1?'latest-entry':''} key={i}>{i===run.log.length-1&&<b>LATEST</b>}{entry}</span>).reverse()}</div></div>}
        {selected&&inspected&&<div className="inspect"><h3>{selected===run.elite?encounter.enemy:NAMES[inspected.type]}</h3>{selected===run.elite&&<p className="inspect-ability">{encounter.ability}</p>}<div className="position-read"><p>{tacticalRead(chess,selected)}</p></div></div>}
      </main>
    </div>
    </div>
    <div className="sr-only" role="status" aria-live="polite">{notice}</div>
    {notice&&<div className="toast" aria-hidden="true">{notice}</div>}
    {intro&&<Modal label="Welcome to Rooklike" className="intro-modal"><div className="intro-emblem"><Piece type="k"/></div><span className="eyebrow">A CHESS ROGUELIKE</span><h2>Every king needs<br/>a little company.</h2><p>Think in chess. Grow your company. Reclaim the Hollow Crown.</p><div className="intro-rules"><span><Shield size={18}/><strong>Protect your king</strong><small>Real checks. Real legal moves.</small></span><span><Crown size={18}/><strong>Hunt the captain</strong><small>Capture the marked enemy.</small></span><span><Gem size={18}/><strong>Build your company</strong><small>Recruit pieces. Collect relics.</small></span></div><button className="primary-button" onClick={start}>Begin your journey <ArrowRight size={18}/></button><span className="modal-footnote">3 ACTS · 12 ENCOUNTERS · SAVES AS YOU PLAY</span></Modal>}
    {help&&!intro&&<Modal label="How to play"><button className="modal-close icon-button" onClick={()=>setHelp(false)} aria-label="Close help"><X/></button><span className="eyebrow">FIELD GUIDE</span><h2>Chess, with a journey.</h2><p>You play ivory. Drag or click a piece to a highlighted square. One legal move each.</p><div className="help-grid"><div><Shield/><h3>King is sacred</h3><p>Never leave your king in check. Capture, block, or move. Checkmate ends the run.</p></div><div><Crown/><h3>Hunt the crown</h3><p>Capture the marked captain or checkmate to win. You do not need every piece.</p></div><div><Heart/><h3>Keep your company</h3><p>Lost allies stay lost. Survivors redeploy. One free gift, then recruits. Max 12.</p></div><div><Eye/><h3>Learn by looking</h3><p>Select a piece for its moves. H shows threats. U undoes a turn; press again to rewind further.</p></div></div><p className="help-fine">Pawns promote on rank 8. Castling and en passant work. Draws end the run. Monster abilities change rewards, not movement. Sheltered road: +1 Takeback. Dangerous road: extra guard, +20. Swift passage: +12 if you beat the turn target.</p><details className="help-guide"><summary>Field guide: how the pieces move</summary><table><tbody>{(['p','n','b','r','q','k'] as PieceSymbol[]).map(type=><tr key={type}><td><Piece type={type} small/></td><td>{NAMES[type]}<small>{VALUES[type]?`${VALUES[type]} points`:'Priceless'}</small></td><td>{RULES[type]}</td></tr>)}</tbody></table><ul>{['Mire Rider','Lantern Keeper','Glass Oracle','Storm Marshal'].map(enemy=><li key={enemy}><strong>{enemy}</strong> {ENCOUNTERS.find(e=>e.enemy===enemy)!.ability}</li>)}</ul></details><div className="help-shortcuts"><span><kbd>↑ ↓ ← →</kbd> Navigate</span><span><kbd>Enter</kbd> Select</span><span><kbd>H</kbd> Threats</span><span><kbd>U</kbd> Takeback</span><span><kbd>Esc</kbd> Cancel</span></div><button className="primary-button" onClick={()=>setHelp(false)}>Back to the board <ArrowRight size={16}/></button></Modal>}
    {restart&&!intro&&<Modal label="Start a new journey"><span className="eyebrow">FRESH START</span><h2>Take another road?</h2><p>This replaces your save. Fresh company, two Takebacks. Replay this road or roll a new one.</p><div className="modal-actions"><button className="secondary-button" onClick={()=>reset(run.seed)}>Replay this road</button><button className="secondary-button" onClick={()=>setRestart(false)}>Keep playing</button><button className="primary-button" onClick={()=>reset()}>New journey <ArrowRight size={16}/></button></div>{seedRow}<div className={`seed-entry${codeBad?' invalid':''}`}><input aria-label="Enter a road code" placeholder="Enter a road code" value={code} onChange={e=>{setCode(e.target.value);setCodeBad(false);}} onKeyDown={e=>{if(e.key==='Enter')playCode();}}/><button className="quiet-button" onClick={playCode}>Play this code</button>{codeBad&&<small role="alert">Not a road code.</small>}</div></Modal>}
    {promotion&&<Modal label="Choose promotion"><span className="eyebrow">PROMOTION</span><h2>Choose a piece.</h2><p>Your pawn reached the last rank.</p><div className="promotion-options">{(['q','r','b','n'] as PieceSymbol[]).map(type=><button key={type} onClick={()=>move(promotion.from,promotion.to,type)}><Piece type={type}/><strong>{NAMES[type]}</strong></button>)}</div></Modal>}
    {run.phase==='reward'&&!restart&&<Modal label="Encounter won" className="reward-modal">
      <span className="eyebrow">{campActEnd?`ACT ${act.numeral} COMPLETE`:`CAMP · ${String(run.stage+1).padStart(2,'0')} CLEARED`}</span><h2>{run.battleLosses===0?'Everyone came home.':'Count the living.'}</h2><p>{run.battleLosses===0?'An intact company is better than a clean board.':'Give the survivors a better plan.'}</p>
      <div className="battle-summary"><span><Coins size={17}/><strong>+{run.earned}</strong> crowns</span><span><Shield size={17}/><strong>{run.battleLosses===0?'Flawless':run.battleLosses}</strong> {run.battleLosses===0?'· +10 bonus':'allies lost'}</span><span><Swords size={17}/><strong>{Math.ceil(run.moves.length/2)}</strong> turns</span></div>
      <p className="coach"><BookOpen size={13}/>{coachLine(run.moves,encounter.lesson)}</p>
      <div className="payout-list">{run.payout.map(p=><span key={p.label}>{p.label} <b>+{p.amount}</b></span>)}{run.battleBonus>0&&<span>Relics paid during battle <b>+{run.battleBonus}</b></span>}</div>
      <div className="section-label reward-label">{rewardChosen?'PACKED':'1 · CHOOSE ONE GIFT'}</div>
      <div className="reward-options"><button disabled={rewardChosen||run.army.length>=12} className={`reward-choice ${run.claimedReward==='recruit'?'packed':''}`} onClick={()=>{setRun({...recruit(run,run.stage%2===0?'n':'b'),rewardClaimed:true,claimedReward:'recruit'});}}><Piece type={run.stage%2===0?'n':'b'} small/><strong>A willing {run.stage%2===0?'knight':'bishop'}</strong><p>{run.stage%2===0?'Leap the line. Look for two threats at once.':'Open a diagonal. Pair the other color.'}</p><span>RECRUIT <ArrowUpRight size={13}/></span></button>
      {rewardRelics(run).map(relic=><button className={`reward-choice ${run.claimedReward===relic?'packed':''}`} disabled={rewardChosen} key={relic} onClick={()=>{setRun({...takeRelic(run,relic),rewardClaimed:true,claimedReward:relic});}}><span className="reward-icon">{relic==='hourglass'?<RotateCcw/>:relic==='purse'?<Coins/>:<Gem/>}</span><strong>{RELICS[relic].name}</strong><p>{RELICS[relic].description}</p><span>RELIC <ArrowUpRight size={13}/></span></button>)}</div>
      <div className="merchant"><div><span className="eyebrow">2 · RECRUIT</span><span><Coins size={14}/> {run.coins} crowns</span></div><div className="shop-items">{stock.map(item=><button key={item.type} disabled={run.coins<item.cost||run.army.length>=12||(item.type==='p'&&run.army.filter(u=>u.type==='p').length>=8)} onClick={()=>buy(item.type,item.cost)} aria-label={`Recruit ${NAMES[item.type]} for ${item.cost} crowns`}><Piece type={item.type} small/><span>{NAMES[item.type]}<small>{item.cost} crowns</small></span><span>+</span></button>)}</div><span className="shop-capacity">{run.army.length}/12 · max 8 pawns · next fight</span><button className="quiet-button roster-toggle" aria-expanded={roster} onClick={()=>setRoster(!roster)}>Review company · send pieces home <ChevronDown size={12}/></button>{roster&&<div className="camp-roster">{run.army.filter(u=>u.type!=='k').map(u=><button key={u.id} onClick={()=>{setRun(sendHome(run,u.id));setNotice(`${NAMES[u.type]} home. +${VALUES[u.type]*2}.`);}}><Piece type={u.type} small/><span>Send {NAMES[u.type].toLowerCase()} home<small>+{VALUES[u.type]*2} · free a slot</small></span></button>)}</div>}{synergies.length>0&&<div className="camp-synergies">{synergies.map(text=><span key={text}><Sparkles size={12}/>{text}</span>)}</div>}</div>
      {campActEnd&&<div className="act-provisions"><span className="eyebrow">{run.provisionClaimed?'PROVISIONS SECURED':'ACT BREAK · CHOOSE ONE'}</span><p>The next road is harder.</p><div><button disabled={run.provisionClaimed||run.army.length>=12} onClick={()=>setRun(claimProvision(run,'rook'))}><Shield size={17}/><strong>A veteran rook</strong><small>One free recruit</small></button><button disabled={run.provisionClaimed} onClick={()=>setRun(claimProvision(run,'gold'))}><Coins size={17}/><strong>The war chest</strong><small>+25 crowns</small></button><button disabled={run.provisionClaimed} onClick={()=>setRun(claimProvision(run,'rest'))}><RotateCcw size={17}/><strong>A night of rest</strong><small>+2 Takebacks</small></button></div></div>}
      <div className="route-heading"><span className="eyebrow">3 · ROAD</span><strong>Next: {routeMap[run.stage+1].name}</strong></div><div className="route-options" role="group" aria-label="Choose your next route"><button className={run.nextRoute==='shelter'?'chosen':''} aria-pressed={run.nextRoute==='shelter'} onClick={()=>setRun({...run,nextRoute:'shelter'})}><Shield size={19}/><span><strong>The sheltered road</strong><small>Normal guard · +1 Takeback</small></span>{run.nextRoute==='shelter'&&<Check size={16}/>}</button><button className={run.nextRoute==='danger'?'chosen dangerous':''} aria-pressed={run.nextRoute==='danger'} onClick={()=>setRun({...run,nextRoute:'danger'})}><Swords size={19}/><span><strong>The dangerous road</strong><small>Extra {run.stage+1<3?'knight':'rook'} on b6 · +20</small></span>{run.nextRoute==='danger'&&<Check size={16}/>}</button></div>
      <p className="next-warning"><span className="next-captain">{nextCaptain&&<Piece type={nextCaptain} color="b" small/>}<strong>{nextRoad.enemy}</strong><span>{nextCaptain?NAMES[nextCaptain]:'Captain'} · {nextRoad.bounty} crowns · target {nextRoad.par} turns</span></span>{nextRoad.lesson}</p>
      <button className="primary-button wide" disabled={!rewardChosen||(campActEnd&&!run.provisionClaimed)} onClick={()=>{setRun(nextBattle(run));setSelected(null);setHovered(null);setHint(null);setHistory([]);setRoster(false);}}>Continue to {nextRoad.place.toLowerCase()} <ArrowRight size={17}/></button>
      {(!rewardChosen||(campActEnd&&!run.provisionClaimed))&&<p className="continue-reason">{!rewardChosen?'Choose a gift first':'Choose a provision first'}</p>}
    </Modal>}
    {(run.phase==='victory'||run.phase==='defeat'||run.phase==='draw')&&!restart&&!studying&&<Modal label={run.phase==='victory'?'Campaign complete':'Journey ended'} className="end-modal"><span className={`end-icon ${run.phase}`} >{run.phase==='victory'?<Crown size={48}/>:run.phase==='draw'?<Flag size={48}/>:<Skull size={48}/>}</span><span className="eyebrow">{run.phase==='victory'?'THREE ACTS COMPLETE':run.phase==='draw'?'A DRAW':'THE JOURNEY ENDS'}</span><h2>{run.phase==='victory'?'Long live your company.':run.phase==='draw'?'The road falls quiet.':'A crown in the dust.'}</h2><p>{run.phase==='victory'?'The Hollow Crown is broken. Your company did something rare.':run.phase==='draw'?'A draw ends the journey. Leave the enemy king an escape when you can.':`${checkers[0]?`Checkmate by the enemy ${NAMES[chess.get(checkers[0])!.type]} on ${checkers[0]}.`:'Checkmate.'} Develop, watch threats, give the king a safe square.`}</p><div className="end-stats"><span><strong>{run.stage+(run.phase==='victory'?1:0)}</strong>cleared</span><span><strong>{run.captures}</strong>captures</span><span><strong>{run.army.length}</strong>in company</span></div><div className="end-chapter">{pressure} · {DIFFICULTY_LABELS[run.difficulty]}</div>{seedRow}{run.phase!=='victory'&&canUndo&&<button className="secondary-button recover-button" onClick={undo}><RotateCcw size={15}/> Spend a Takeback · try another line</button>}<button className="primary-button" onClick={()=>reset()}>Begin another journey <ArrowRight size={17}/></button><button className="quiet-button" onClick={()=>{setStudying(true);setNotice('Final board opened.');}}>Study the final board <BookOpen size={15}/></button></Modal>}
  </div>;
}
function Modal({children,label,className=''}:{children:React.ReactNode;label:string;className?:string}) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';const el=ref.current;el?.querySelector<HTMLElement>('button:not(:disabled)')?.focus({preventScroll:true});function trap(e:KeyboardEvent){if(e.key!=='Tab'||!el)return;const elements=Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),select,input,a[href],[tabindex="0"]'));const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}el?.addEventListener('keydown',trap);return()=>{el?.removeEventListener('keydown',trap);document.body.style.overflow=oldOverflow;previous?.focus({preventScroll:true});};},[]);
  return <div className="modal-backdrop"><div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label}>{children}</div></div>;
}
