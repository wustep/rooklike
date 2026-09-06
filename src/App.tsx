import { useEffect, useMemo, useRef, useState } from 'react';
import type { PieceSymbol, Square } from 'chess.js';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, CircleHelp, Coins, Crown, Eye, EyeOff, Flag, Gem, Heart, Leaf, RotateCcw, Shield, Skull, Sparkles, Swords, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { legalMoves } from './rules';
import { Piece } from './Piece';
import { ENCOUNTERS, ACTS, encounterFor, getEncounter, shopStock, claimProvision, NAMES, VALUES, RULES, RELICS, SAVE_KEY, loadRun, getChess, newRun, playMove, nextBattle, recruit, sendHome, takeRelic, chooseMove, hintFor, rewardRelics, bonusState, armySynergies, tacticalRead, type Run, type Difficulty } from './game';

function sound(capture=false) {try {const ctx=new AudioContext(); const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(capture?260:440,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(capture?90:220,ctx.currentTime+.13);gain.gain.setValueAtTime(.06,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);osc.start();osc.stop(ctx.currentTime+.18);osc.onended=()=>void ctx.close();}catch{/* Audio is optional. */}}
const FILES='abcdefgh';
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
  const [lastTurn,setLastTurn]=useState<Run|null>(null);
  const rewardChosen=run.rewardClaimed;
  const [studying,setStudying]=useState(false);
  const [notice,setNotice]=useState('');
  const [saveError,setSaveError]=useState(false);
  const [roster,setRoster]=useState(false);
  const [journal,setJournal]=useState(false);
  const [focusSquare,setFocusSquare]=useState<Square>('e2');
  const squareRefs=useRef<Record<string,HTMLButtonElement|null>>({});
  const mutedRef=useRef(muted);mutedRef.current=muted;
  const chess=useMemo(()=>getChess(run),[run]);
  const encounter=getEncounter(run);
  const act=ACTS[Math.floor(run.stage/4)];
  const campActEnd=run.stage%4===3;
  const stock=shopStock(run);
  const routeMap=ENCOUNTERS.map((_,i)=>encounterFor(i,run.seed));
  const bonus=bonusState(run);
  const synergies=armySynergies(run);
  const finalStage=run.stage===ENCOUNTERS.length-1;
  const pressure=`ACT ${act.numeral} · ${act.name.toUpperCase()}`;
  const thinking=run.phase==='battle'&&chess.turn()==='b';
  const legal=useMemo(()=>selected&&chess.turn()==='w'&&run.phase==='battle'?legalMoves(chess,selected):[],[chess,selected,run.phase]);
  const riskySquares=useMemo(()=>{const probe=getChess(run);const squares=new Set<Square>();for(const candidate of legal){probe.move(candidate);if(probe.isAttacked(candidate.to,'b'))squares.add(candidate.to);probe.undo();}return squares;},[run,legal]);
  const inspectedSquare=selected??(hovered&&chess.get(hovered)?hovered:null);
  const inspected=inspectedSquare?chess.get(inspectedSquare):null;
  const elitePiece=run.elite?chess.get(run.elite):null;
  const lastMove=chess.history({verbose:true}).at(-1);
  const checkedKing=chess.isCheck()?chess.board().flat().find(p=>p?.type==='k'&&p.color===chess.turn())?.square:null;

  useEffect(()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(run));setSaveError(false);}catch{setSaveError(true);}},[run]);
  useEffect(()=>{
    if(!thinking||intro||help||restart) return;
    const worker=new Worker(new URL('./ai.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=(e:MessageEvent<string|null>)=>{if(e.data){if(!mutedRef.current)sound(e.data.includes('x'));setRun(current=>current===run?playMove(current,e.data!):current);}};
    worker.onerror=()=>{setNotice('The enemy paused. Retrying its move.'); const move=chooseMove(getChess(run),'wanderer',run.elite,run.stage);if(move)setRun(current=>current===run?playMove(current,move.san):current);};
    const timer=setTimeout(()=>worker.postMessage(run),550);
    return()=>{clearTimeout(timer);worker.terminate();};
  },[thinking,run,intro,help,restart]);
  useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(t);}},[notice]);

  function undo() {if(!lastTurn||run.charges<1||!['battle','defeat','draw'].includes(run.phase))return;setStudying(false);setRun({...lastTurn,charges:run.charges-1,battleUndos:run.battleUndos+1});setLastTurn(null);setSelected(null);setHint(null);setNotice('A second thought. Try another move.');}
  function move(from:Square,to:Square,promote?:string) {
    if(thinking||run.phase!=='battle') return;
    setLastTurn(run);const next=playMove(run,{from,to,promotion:promote});setRun(next);setSelected(null);setHint(null);setPromotion(null);
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
    else {if(selected)setNotice(chess.isCheck()?'Your king is in check. Choose a highlighted move that answers the check.':'Choose a highlighted square. All moves must keep your king safe.');setSelected(null);}
  }
  function showHint() {const m=chooseMove(chess,'tactician',run.elite);if(m){setHint({from:m.from,to:m.to,text:hintFor(m)});setSelected(m.from);}}
  useEffect(()=>{
    function key(e:KeyboardEvent) {
      if((e.target as HTMLElement).matches('select, input, textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.key==='Escape'){setHelp(false);setRestart(false);setPromotion(null);setSelected(null);setHint(null);}
      if(intro||help||restart||promotion||run.phase!=='battle')return;
      if(e.key.toLowerCase()==='h'){e.preventDefault();setThreats(t=>!t);}
      if(e.key.toLowerCase()==='u'){e.preventDefault();undo();}
      if(e.key==='?'){e.preventDefault();setHelp(true);}
    }
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  function reset(seed?:number) {setRun(newRun(run.difficulty,seed));setRestart(false);setSelected(null);setHint(null);setLastTurn(null);setStudying(false);}
  function start() {setIntro(false);try{localStorage.setItem('rooklike-welcomed','1');}catch{/* Optional. */}}
  function buy(type:PieceSymbol,cost:number) {const next=recruit(run,type,cost);if(next===run){setNotice('No room or not enough crowns for this recruit.');return;}setRun(next);setNotice(`${NAMES[type]} joined your company.`);}
  const modalOpen=intro||help||restart||!!promotion||(run.phase!=='battle'&&!studying);

  return <div className={`app theme-${encounter.theme}`}>
    <div className="ambient" aria-hidden="true"><i/><i/><i/></div>
    <div className="game-shell" inert={modalOpen}>
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setRestart(true);}} aria-label="Rooklike, start a new journey"><span className="brand-icon"><Piece type="r" small/></span>ROOKLIKE<span className="brand-dot">◆</span></a>
      <div className="chapter"><span>THE HOLLOW CROWN</span><span className="pill">ACT {act.numeral} / III</span></div>
      <div className="header-actions"><span className="save-label"><span className="status-dot"/>{saveError?'Save unavailable':'Journey saved'}</span><button className="icon-button" title={muted?'Enable sound':'Mute sound'} aria-label={muted?'Enable sound':'Mute sound'} onClick={()=>setMuted(!muted)}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button className="icon-button" title="How to play (?)" aria-label="How to play" onClick={()=>setHelp(true)}><CircleHelp size={19}/></button></div>
    </header>
    {studying&&<div className="study-banner">Final position · {run.phase}<button onClick={()=>reset()}>Begin a new journey</button></div>}
    <div className="layout">
      <aside className="left-panel">
        <div className="act-heading"><span className="eyebrow">YOUR JOURNEY</span><h2>{act.name}.</h2><p>{act.description}</p><span className="road-seed">ROAD {run.seed.toString(36).toUpperCase()}</span></div>
        <nav className="journey-map" aria-label="Campaign progress">{routeMap.map((e,i)=><div className={`map-stop ${Math.floor(i/4)!==Math.floor(run.stage/4)?'other-act':''} ${i===run.stage?'current':''} ${i<run.stage?'completed':''}`} key={e.name}><div className="map-node">{i<run.stage?<Check size={15}/>:i===ENCOUNTERS.length-1?<Crown size={17}/>:i===run.stage?<Swords size={16}/>:<span/>}</div><div><span className="map-kicker">{i===ENCOUNTERS.length-1?'THE BOSS':`ACT ${ACTS[Math.floor(i/4)].numeral} · ${String(i+1).padStart(2,'0')}`}</span><strong>{e.name.replace('The ','')}</strong>{i===run.stage&&<span className="you-are-here">You are here <ArrowRight size={12}/></span>}</div></div>)}</nav>
        <div className="company"><div className="section-label"><span>YOUR COMPANY</span><span>{run.army.length} / 12</span></div><div className="army-pieces">{run.army.map(unit=><span title={`${NAMES[unit.type]}${unit.type==='k'?' · Protect at all costs':` · ${VALUES[unit.type]} points`}`} key={unit.id}><Piece type={unit.type} small/></span>)}</div><p>Survivors march with you.</p>{synergies.map(text=><div className="synergy-line" key={text}><Sparkles size={12}/>{text}</div>)}</div>
        <div className="relics"><div className="section-label"><span>RELICS</span><Gem size={13}/></div>{run.relics.length?run.relics.map(r=><div className="relic-item" key={r} title={RELICS[r].description}><Sparkles size={15}/><span>{RELICS[r].name}</span></div>):<p className="empty-relic">A little luck awaits on the road.</p>}</div>
        <button className="quiet-button abandon" onClick={()=>setRestart(true)}><RotateCcw size={14}/> New journey</button>
      </aside>
      <main className="battle-panel">
        <div className="encounter-heading"><div className="location"><Leaf size={13}/><span>{encounter.place}</span><span className="location-line"/><span>{String(run.stage+1).padStart(2,'0')} / {ENCOUNTERS.length}</span></div><h1>{encounter.name}</h1><p>{encounter.description}</p></div>
        <div className="run-strip"><span>{pressure}</span><span className={run.route==='danger'?'danger-label':''}>{run.route==='danger'?'DANGEROUS ROAD · +20':'SHELTERED ROAD'}</span></div>
        <div className="mobile-company"><span><Shield size={12}/> {run.army.length} allies</span><span><Coins size={12}/> {run.coins}</span><span><Gem size={12}/> {run.relics.length} relics</span></div>
        <div className={`turn-bar ${chess.isCheck()?'check-bar':''}`}><div><span className={`turn-indicator ${thinking?'thinking':''}`}/><strong>{chess.isCheck()?(thinking?'Enemy king in check':'Your king is in check'):thinking?'The enemy is thinking…':'Your move'}</strong><span className="turn-detail">{chess.isCheck()?'Every legal move must answer the check.':thinking?'Watch the board. Plan your reply.':'Select a piece to see its legal moves.'}</span></div><span className="turn-count">TURN {Math.floor(run.moves.length/2)+1}</span></div>
        <div className={`board-scene ${lastMove?.captured?'capture-scene':''}`}>
          {lastMove?.captured&&<div key={`${run.stage}-${run.moves.length}`} className={`capture-feedback ${lastMove.color==='b'?'ally-lost':''}`} role="status">{lastMove.color==='w'?`Enemy ${NAMES[lastMove.captured].toLowerCase()} captured`:`Your ${NAMES[lastMove.captured].toLowerCase()} fell`}</div>}
          <div className="scene-ornament ornament-left" aria-hidden="true">✦</div><div className="scene-ornament ornament-right" aria-hidden="true">✦</div>
          <div className="board-frame">
            <div className="rank-labels" aria-hidden="true">{[8,7,6,5,4,3,2,1].map(r=><span key={r}>{r}</span>)}</div>
            <div className="chessboard" role="group" aria-label="Chessboard. You play ivory. Use arrow keys to navigate and Enter to select.">{Array.from({length:64},(_,i)=>{
              const rank=8-Math.floor(i/8),file=i%8,sq=(FILES[file]+rank) as Square,piece=chess.get(sq);
              const target=legal.some(m=>m.to===sq),isElite=sq===run.elite;
              const threatened=threats&&chess.isAttacked(sq,'b');
              const enemyReach=selected&&chess.get(selected)?.color==='b'&&chess.attackers(sq,'b').includes(selected);
              const risky=riskySquares.has(sq);
              return <button ref={el=>{squareRefs.current[sq]=el;}} key={sq} data-square={sq} className={`square ${(file+rank)%2===0?'light':'dark'} ${selected===sq?'selected':''} ${target?'legal':''} ${target&&piece?'capture':''} ${lastMove&&(lastMove.from===sq||lastMove.to===sq)?'last-move':''} ${checkedKing===sq?'king-check':''} ${hint?.to===sq?'hint-square':''} ${threatened?'threatened':''} ${enemyReach?'enemy-reach':''} ${isElite?'captain-square':''} ${risky?'risky-move':''}`} tabIndex={focusSquare===sq?0:-1} aria-label={`${sq}${piece?`, ${piece.color==='w'?'your':'enemy'} ${NAMES[piece.type]}`:', empty'}${isElite?', marked captain':''}${target?', legal move':''}${threatened?', enemy attacks this square':''}${enemyReach?', selected enemy attacks this square':''}${risky?', destination attacked — consider exchanges':''}`} aria-pressed={selected===sq} onClick={()=>selectSquare(sq)} onMouseEnter={()=>setHovered(sq)} onMouseLeave={()=>setHovered(null)} onFocus={()=>{setFocusSquare(sq);}} onKeyDown={e=>{
                const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8};const delta=offsets[e.key];if(delta!==undefined){e.preventDefault();const next=Math.max(0,Math.min(63,i+delta));const nextSq=(FILES[next%8]+(8-Math.floor(next/8))) as Square;setFocusSquare(nextSq);squareRefs.current[nextSq]?.focus();}
              }}>
                {piece&&<Piece type={piece.type} color={piece.color} variant={isElite?encounter.theme:undefined}/>}{isElite&&<span className="elite-mark" title="Marked captain"><Crown size={11}/></span>}{target&&!piece&&<span className="move-dot"/>}{enemyReach&&<span className="enemy-reach-dot"/>}{threatened&&<span className="threat-dot"/>}{checkedKing===sq&&<span className="check-mark">!</span>}
              </button>;
            })}</div>
            {lastMove&&<svg className="move-trail" viewBox="0 0 8 8" aria-hidden="true"><defs><marker id="move-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs><line x1={FILES.indexOf(lastMove.from[0])+.5} y1={8-Number(lastMove.from[1])+.5} x2={FILES.indexOf(lastMove.to[0])+.5} y2={8-Number(lastMove.to[1])+.5} markerEnd="url(#move-arrow)"/></svg>}
            <div className="file-labels" aria-hidden="true">{[...FILES].map(f=><span key={f}>{f}</span>)}</div>
          </div>
        </div>
        <div className="passage-bonus"><div><Zap size={14}/><strong>Swift passage</strong><span>{bonus.available ? `Win by turn ${bonus.par} · +12 crowns` : 'Bonus expired. The battle is still yours to win.'}</span></div><div className="bonus-track"><span style={{width:`${Math.max(0,1-Math.ceil(run.moves.length/2)/bonus.par)*100}%`}}/></div></div>
        <div className="board-footer"><span><span className="ivory-dot"/> YOU PLAY IVORY</span><span><Crown size={12}/> CAPTURE THE MARKED CAPTAIN</span></div>
        <div className="board-tools"><button className={threats?'tool active':'tool'} onClick={()=>setThreats(!threats)} aria-pressed={threats}>{threats?<Eye size={16}/>:<EyeOff size={16}/>} Threat vision <kbd>H</kbd></button><button className="tool" onClick={undo} disabled={!lastTurn||!run.charges||run.phase!=='battle'}><RotateCcw size={15}/> Takeback <span className="charge-count">{run.charges}</span><kbd>U</kbd></button>{run.relics.includes('compass')&&<button className="tool" onClick={showHint} disabled={thinking||run.phase!=='battle'}><Sparkles size={15}/> Hint</button>}<button className="tool journal-tool" onClick={()=>setJournal(!journal)} aria-expanded={journal}><BookOpen size={15}/><span>Move journal</span><ChevronDown size={12}/></button></div>
        {hint&&<div className="hint-message"><Sparkles size={16}/><span><strong>{hint.from} → {hint.to}.</strong> {hint.text}</span></div>}
        {journal&&<div className="journal"><div className="section-label">MOVE JOURNAL <button className="icon-button" aria-label="Close journal" onClick={()=>setJournal(false)}><X size={14}/></button></div><div>{run.log.map((entry,i)=><span key={i}>{entry}</span>)}</div></div>}
        <div className="position-read" role="status"><BookOpen size={15}/><p>{tacticalRead(chess,selected??inspectedSquare)}</p></div><div className="keyboard-note">● Legal move <span className="risk-key">◉ Attacked destination</span><span>Click an enemy to trace its reach.</span></div>
      </main>
      <aside className="right-panel">
        <div className="treasury"><div><Coins size={20}/><strong>{run.coins}</strong><span>crowns</span></div><span title="Encounter reward">+{encounter.bounty} on victory</span></div>
        <section className="objective-card"><div className="section-label"><span>THE OBJECTIVE</span><Flag size={14}/></div><h3>{finalStage?'Break the hollow crown.':'Break through the guard.'}</h3><p>Capture the marked {elitePiece?NAMES[elitePiece.type].toLowerCase():'captain'} or checkmate the enemy king.</p><div className="king-reminder"><Shield size={15}/><span>Your king must survive.</span></div></section>
        <section className="enemy-card"><div className="section-label"><span>{inspected&&inspected.color==='w'?'PIECE FIELD GUIDE':'KNOW YOUR ENEMY'}</span><span className="tiny-diamond">◆</span></div>{inspected&&inspected.color==='w'?<><div className="enemy-portrait ally-portrait"><Piece type={inspected.type}/><span className="portrait-rings"/></div><div className="enemy-title"><h3>{NAMES[inspected.type]}</h3><span className="enemy-tag">YOUR COMPANY · {inspectedSquare?.toUpperCase()}</span></div><p>{RULES[inspected.type]}</p><div className="ability"><BookOpen size={15}/><div><strong>{inspected.type==='k'?'The heart of your army':`${VALUES[inspected.type]} point${VALUES[inspected.type]===1?'':'s'} of material`}</strong><p>{inspected.type==='k'?'Check is a threat. Checkmate ends your journey.':'Highlighted moves are legal: they never leave your king in check.'}</p></div></div></>:<><div className="enemy-portrait"><Piece type={inspected?.type??elitePiece?.type??'r'} color="b" variant={!inspected||inspectedSquare===run.elite?encounter.theme:undefined}/><span className="portrait-rings"/><span className="portrait-star">✧</span></div><div className="enemy-title"><h3>{inspected&&inspectedSquare!==run.elite?`Hollow ${NAMES[inspected.type]}`:encounter.enemy}</h3><span className="enemy-tag">{inspected&&inspectedSquare!==run.elite?'STANDARD PIECE':'MARKED CAPTAIN'} · {(inspectedSquare&&inspected?inspectedSquare:run.elite)?.toUpperCase()}</span></div><p>{RULES[inspected?.type??elitePiece?.type??'r']}</p><div className="ability"><Zap size={15}/><div><strong>{inspected&&inspectedSquare!==run.elite?'Pure chess':encounter.power}</strong><p>{inspected&&inspectedSquare!==run.elite?'No special ability. Inspect its movement and watch what it defends.':encounter.ability}</p></div></div></>}</section>
        <section className="coach-card"><div className="section-label"><span><BookOpen size={13}/> THE IDEA TO LOOK FOR</span></div><p>{threats?'Red dots mark squares attacked by the enemy, including defended pieces. A pinned piece still attacks squares for king safety.':encounter.lesson}</p></section>
        <div className="difficulty-note">{run.stage<2?'A patient opening. Learn the shapes.':run.stage<4?'Defenders coordinate. Loose pieces get taken.':'The guard reads ahead. Expect forcing moves.'}</div><label className="difficulty"><span>Enemy strength</span><select aria-label="Enemy strength" value={run.difficulty} onChange={e=>setRun({...run,difficulty:e.target.value as Difficulty})}><option value="wanderer">Wanderer</option><option value="tactician">Tactician</option></select></label>
      </aside>
    </div><footer className="page-footer"><span>FORTUNE FAVORS THE THOUGHTFUL.</span><span>CHESS RULES. ROGUELIKE SOUL.</span></footer>
    </div>
    {notice&&<div className="toast" role="status">{notice}</div>}
    {intro&&<Modal label="Welcome to Rooklike" className="intro-modal"><div className="intro-emblem"><Piece type="k"/></div><span className="eyebrow">A CHESS ROGUELIKE</span><h2>Every king needs<br/>a little company.</h2><p>Lead a small army through the wilds of a fallen kingdom. Think in chess. Grow your company. Reclaim the Hollow Crown.</p><div className="intro-rules"><span><Shield size={18}/><strong>Protect your king</strong><small>Real checks. Real legal moves.</small></span><span><Crown size={18}/><strong>Hunt the captain</strong><small>Capture the marked enemy to advance.</small></span><span><Gem size={18}/><strong>Build your company</strong><small>Recruit pieces and collect relics.</small></span></div><button className="primary-button" onClick={start}>Begin your journey <ArrowRight size={18}/></button><span className="modal-footnote">THREE ACTS · TWELVE ENCOUNTERS · A NEW ROAD EACH RUN · SAVES AS YOU PLAY</span></Modal>}
    {help&&!intro&&<Modal label="How to play"><button className="modal-close icon-button" onClick={()=>setHelp(false)} aria-label="Close help"><X/></button><span className="eyebrow">THE FIELD GUIDE</span><h2>Chess, with a journey.</h2><p>You play ivory and move first. Select a piece, then a highlighted square. Each side makes one legal chess move per turn.</p><div className="help-grid"><div><Shield/><h3>Your king is sacred</h3><p>You cannot leave your king in check. When checked, capture the attacker, block it, or move your king. Checkmate ends the run.</p></div><div><Crown/><h3>Hunt the crown</h3><p>The small crown marks the enemy captain. Capture it or checkmate to win. These are tactical encounters: you do not need to capture every piece.</p></div><div><Heart/><h3>Keep your company</h3><p>Captured allies are lost. Survivors redeploy next battle. Choose one free reward and spend crowns on recruits. Maximum 12 pieces.</p></div><div><Eye/><h3>Learn by looking</h3><p>Hover or select a piece for its movement. Threat vision shows enemy attacks. Takeback rewinds your move and the reply, spending one charge.</p></div></div><p className="help-fine">Pawns move toward rank 8 and choose a promotion. Castling and en passant follow standard rules when available. Repetition, stalemate, the 50-move rule, and insufficient material end the run in a draw. Monster abilities affect rewards, never legal movement. At camp, the sheltered road gives a Takeback; the dangerous road adds a guard for 20 extra crowns. Win before the visible turn target for a 12-crown bonus. Missing it never ends the battle.</p><div className="help-shortcuts"><span><kbd>↑ ↓ ← →</kbd> Navigate</span><span><kbd>Enter</kbd> Select / move</span><span><kbd>H</kbd> Threats</span><span><kbd>U</kbd> Takeback</span><span><kbd>Esc</kbd> Close</span></div><button className="primary-button" onClick={()=>setHelp(false)}>Back to the board <ArrowRight size={16}/></button></Modal>}
    {restart&&!intro&&<Modal label="Start a new journey"><span className="eyebrow">A FRESH START</span><h2>Take another road?</h2><p>This replaces your saved journey. You’ll begin at the gate with a fresh company and two Takebacks. Three acts. Twelve encounters. A new set of encounters and shops each run, or replay this exact road.</p><div className="modal-actions"><button className="secondary-button" onClick={()=>reset(run.seed)}>Replay this road</button><button className="secondary-button" onClick={()=>setRestart(false)}>Keep playing</button><button className="primary-button" onClick={()=>reset()}>New journey <ArrowRight size={16}/></button></div></Modal>}
    {promotion&&<Modal label="Choose promotion"><span className="eyebrow">A PAWN’S AMBITION</span><h2>Choose your promotion.</h2><p>Your pawn reached the last rank. Which piece will it become?</p><div className="promotion-options">{(['q','r','b','n'] as PieceSymbol[]).map(type=><button key={type} onClick={()=>move(promotion.from,promotion.to,type)}><Piece type={type}/><strong>{NAMES[type]}</strong></button>)}</div></Modal>}
    {run.phase==='reward'&&!restart&&<Modal label="Encounter won" className="reward-modal">
      <span className="eyebrow">{campActEnd?`ACT ${act.numeral} COMPLETE`:`CAMP · ENCOUNTER ${String(run.stage+1).padStart(2,'0')} CLEARED`}</span><h2>{run.battleLosses===0?'Everyone came home.':'A fire. A count of the living.'}</h2><p>{run.battleLosses===0?'A clean board is good. An intact company is better.':'Remember the fallen. Give the survivors a better plan.'}</p>
      <div className="battle-summary"><span><Coins size={17}/><strong>+{run.earned}</strong> crowns</span><span><Shield size={17}/><strong>{run.battleLosses===0?'Flawless':run.battleLosses}</strong> {run.battleLosses===0?'· +10 bonus':'allies lost'}</span><span><Swords size={17}/><strong>{Math.ceil(run.moves.length/2)}</strong> turns</span></div>
      <div className="payout-list">{run.payout.map(p=><span key={p.label}>{p.label} <b>+{p.amount}</b></span>)}{run.battleBonus>0&&<span>Relics paid during battle <b>+{run.battleBonus}</b></span>}</div>
      <div className="section-label reward-label">{rewardChosen?'PACKED FOR THE ROAD':'1 · CHOOSE ONE GIFT'}</div>
      <div className="reward-options"><button disabled={rewardChosen||run.army.length>=12} className={`reward-choice ${run.claimedReward==='recruit'?'packed':''}`} onClick={()=>{setRun({...recruit(run,run.stage%2===0?'n':'b'),rewardClaimed:true,claimedReward:'recruit'});}}><Piece type={run.stage%2===0?'n':'b'} small/><strong>A willing {run.stage%2===0?'knight':'bishop'}</strong><p>{run.stage%2===0?'Leap over the front line. Look for two threats in one move.':'Open a diagonal. Pair with a bishop on the other color.'}</p><span>RECRUIT <ArrowUpRight size={13}/></span></button>
      {rewardRelics(run).map(relic=><button className={`reward-choice ${run.claimedReward===relic?'packed':''}`} disabled={rewardChosen} key={relic} onClick={()=>{setRun({...takeRelic(run,relic),rewardClaimed:true,claimedReward:relic});}}><span className="reward-icon">{relic==='hourglass'?<RotateCcw/>:relic==='purse'?<Coins/>:<Gem/>}</span><strong>{RELICS[relic].name}</strong><p>{RELICS[relic].description}</p><span>RELIC <ArrowUpRight size={13}/></span></button>)}</div>
      <div className="merchant"><div><span className="eyebrow">2 · STRENGTHEN YOUR COMPANY</span><span><Coins size={14}/> {run.coins} crowns</span></div><div className="shop-items">{stock.map(item=><button key={item.type} disabled={run.coins<item.cost||run.army.length>=12||(item.type==='p'&&run.army.filter(u=>u.type==='p').length>=8)} onClick={()=>buy(item.type,item.cost)} aria-label={`Recruit ${NAMES[item.type]} for ${item.cost} crowns`}><Piece type={item.type} small/><span>{NAMES[item.type]}<small>{item.cost} crowns</small></span><span>+</span></button>)}</div><span className="shop-capacity">Company: {run.army.length}/12 · Max 8 pawns · Recruits deploy next encounter</span><button className="quiet-button roster-toggle" aria-expanded={roster} onClick={()=>setRoster(!roster)}>Review company · send pieces home <ChevronDown size={12}/></button>{roster&&<div className="camp-roster">{run.army.filter(u=>u.type!=='k').map(u=><button key={u.id} onClick={()=>{setRun(sendHome(run,u.id));setNotice(`${NAMES[u.type]} heads home. +${VALUES[u.type]*2} crowns.`);}}><Piece type={u.type} small/><span>Send {NAMES[u.type].toLowerCase()} home<small>+{VALUES[u.type]*2} crowns · free a slot</small></span></button>)}</div>}{synergies.length>0&&<div className="camp-synergies">{synergies.map(text=><span key={text}><Sparkles size={12}/>{text}</span>)}</div>}</div>
      {campActEnd&&<div className="act-provisions"><span className="eyebrow">{run.provisionClaimed?'PROVISIONS SECURED':'ACT BREAK · CHOOSE YOUR PROVISIONS'}</span><p>The next road is harder. Take what your company needs.</p><div><button disabled={run.provisionClaimed||run.army.length>=12} onClick={()=>setRun(claimProvision(run,'rook'))}><Shield size={17}/><strong>A veteran rook</strong><small>One free recruit</small></button><button disabled={run.provisionClaimed} onClick={()=>setRun(claimProvision(run,'gold'))}><Coins size={17}/><strong>The war chest</strong><small>+25 crowns</small></button><button disabled={run.provisionClaimed} onClick={()=>setRun(claimProvision(run,'rest'))}><RotateCcw size={17}/><strong>A night of rest</strong><small>+2 Takebacks</small></button></div></div>}
      <div className="route-heading"><span className="eyebrow">3 · CHOOSE YOUR ROAD</span><strong>Next: {routeMap[run.stage+1].name}</strong></div><div className="route-options" role="group" aria-label="Choose your next route"><button className={run.nextRoute==='shelter'?'chosen':''} aria-pressed={run.nextRoute==='shelter'} onClick={()=>setRun({...run,nextRoute:'shelter'})}><Shield size={19}/><span><strong>The sheltered road</strong><small>Normal guard · gain 1 Takeback</small></span>{run.nextRoute==='shelter'&&<Check size={16}/>}</button><button className={run.nextRoute==='danger'?'chosen dangerous':''} aria-pressed={run.nextRoute==='danger'} onClick={()=>setRun({...run,nextRoute:'danger'})}><Swords size={19}/><span><strong>The dangerous road</strong><small>Extra {run.stage+1<3?'knight':'rook'} on b6 · +20 on victory</small></span>{run.nextRoute==='danger'&&<Check size={16}/>}</button></div>
      <p className="next-warning">{routeMap[run.stage+1].enemy} · {routeMap[run.stage+1].lesson}</p>
      <button className="primary-button wide" disabled={!rewardChosen||(campActEnd&&!run.provisionClaimed)} onClick={()=>{setRun(nextBattle(run));setSelected(null);setHovered(null);setHint(null);setLastTurn(null);setRoster(false);}}>Continue to {routeMap[run.stage+1].place.toLowerCase()} <ArrowRight size={17}/></button>
    </Modal>}
    {(run.phase==='victory'||run.phase==='defeat'||run.phase==='draw')&&!restart&&!studying&&<Modal label={run.phase==='victory'?'Campaign complete':'Journey ended'} className="end-modal"><span className={`end-icon ${run.phase}`} >{run.phase==='victory'?<Crown size={48}/>:run.phase==='draw'?<Flag size={48}/>:<Skull size={48}/>}</span><span className="eyebrow">{run.phase==='victory'?'THREE ACTS COMPLETE':run.phase==='draw'?'A DRAWN BATTLE':'THE JOURNEY ENDS'}</span><h2>{run.phase==='victory'?'Long live your company.':run.phase==='draw'?'The road falls quiet.':'A crown in the dust.'}</h2><p>{run.phase==='victory'?'The Hollow Crown is broken. Your small company did something extraordinary. The kingdom will remember.':run.phase==='draw'?'Neither side can claim this encounter. Stalemate and other chess draws end the journey — keep an escape square for the enemy king when setting a trap.':'Your king was checkmated. Every defeat leaves a lesson: develop your pieces, watch the threats, and give your king a safe home.'}</p><div className="end-stats"><span><strong>{run.stage+(run.phase==='victory'?1:0)}</strong>encounters cleared</span><span><strong>{run.captures}</strong>pieces captured</span><span><strong>{run.army.length}</strong>in your company</span></div><div className="end-chapter">{pressure} · {run.difficulty==='wanderer'?'Wanderer':'Tactician'}</div>{run.phase!=='victory'&&lastTurn&&run.charges>0&&<button className="secondary-button recover-button" onClick={undo}><RotateCcw size={15}/> Spend a Takeback · try another line</button>}<button className="primary-button" onClick={()=>reset()}>Begin another journey <ArrowRight size={17}/></button><button className="quiet-button" onClick={()=>{setStudying(true);setNotice('Final position opened for study. Start a new journey when ready.');}}>Study the final board <BookOpen size={15}/></button></Modal>}
  </div>;
}
function Modal({children,label,className=''}:{children:React.ReactNode;label:string;className?:string}) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';const el=ref.current;el?.querySelector<HTMLElement>('button:not(:disabled)')?.focus({preventScroll:true});function trap(e:KeyboardEvent){if(e.key!=='Tab'||!el)return;const elements=Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),select,a[href],[tabindex="0"]'));const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}el?.addEventListener('keydown',trap);return()=>{el?.removeEventListener('keydown',trap);document.body.style.overflow=oldOverflow;previous?.focus({preventScroll:true});};},[]);
  return <div className="modal-backdrop"><div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label}>{children}</div></div>;
}
