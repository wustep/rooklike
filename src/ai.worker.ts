import { getChess, chooseMove, type Run } from './game';
self.onmessage = (event:MessageEvent<Run>) => { const run=event.data; const move=chooseMove(getChess(run),run.difficulty,run.elite,run.stage); self.postMessage(move?.san??null); };
