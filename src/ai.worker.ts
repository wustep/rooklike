import { getChess, chooseMove, type Run } from './game';
import type { SearchProfile } from './engine';
self.onmessage = (event:MessageEvent<{id:number;run:Run;override?:Partial<SearchProfile>}>) => { const {id,run,override}=event.data; const move=chooseMove(getChess(run),run.difficulty,run.elite,run.stage,override); self.postMessage({id,san:move?.san??null}); };
