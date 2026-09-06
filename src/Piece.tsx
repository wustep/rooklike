import { useId } from 'react';
import type { PieceSymbol } from 'chess.js';
export function Piece({type, color='w', small=false, variant}: {type:PieceSymbol;color?:'w'|'b';small?:boolean;variant?:string}) {
  const gradient=useId();
  return <svg className={`piece ${color==='w'?'ivory':'obsidian'} ${small?'small':''}`} viewBox="0 0 80 88" aria-hidden="true">
    <defs><linearGradient id={gradient} x1="0" x2="1" y1="0" y2=".8"><stop offset="0" stopColor={color==='w'?'#fff3d5':'#8f9fb9'}/><stop offset=".5" stopColor={color==='w'?'#ddd0a7':'#364359'}/><stop offset="1" stopColor={color==='w'?'#a69a73':'#141d30'}/></linearGradient></defs>
    {variant&&<g className={`captain-aura aura-${variant}`} fill="none" stroke={variant==='frost'?'#ccf0ff':variant==='storm'?'#d2baff':'#f0cf85'} strokeWidth="1.2" opacity=".85"><ellipse cx="40" cy="77" rx="30" ry="8"/><path d="M9 77h8m46 0h8M40 66v-4"/>{variant==='forest'?<path d="m19 58-6-13 8 4-2-14m41 23 7-13-8 4 2-14"/>:variant==='frost'?<path d="m13 32 4-9 4 9-4 9zm47 14 4-9 4 9-4 9z"/>:variant==='storm'?<path d="m17 20-7 18h9l-6 16m54-34-7 18h9l-6 16"/>:variant==='ember'?<path d="M13 47q-9-8 3-20-2 11 3 14t-6 6m53 7q-9-8 3-20-2 11 3 14t-6 6"/>:<path d="m11 39 5-7 5 7-5 7zm48 0 5-7 5 7-5 7z"/>}</g>}
    <ellipse cx="40" cy="80" rx="26" ry="5" fill="#0b100d" opacity=".25"/>
    <g fill={`url(#${gradient})`} stroke={color==='w'?'#817657':'#101525'} strokeWidth="1.6" strokeLinejoin="round">
      {type==='p'&&<><circle cx="40" cy="27" r="12"/><path d="M31 39h18l-3 10 8 19H26l8-19z"/><path d="M29 40h22v6H29z"/></>}
      {type==='r'&&<><path d="M23 16h9v9h5v-9h8v9h5v-9h8v22l-9 9 3 21H28l3-21-8-9z"/><path d="M26 38h29v7H26z"/><path d="M34 49h5v15h-5z" opacity=".25"/></>}
      {type==='b'&&<><path d="M40 10c-6 10-18 18-17 29 0 7 7 12 17 12s17-5 17-12c0-10-9-16-17-29z"/><path d="m44 22-9 16" fill="none" strokeWidth="4"/><path d="M33 49h14l5 19H28z"/><path d="M28 48h24v6H28z"/><circle cx="40" cy="10" r="4"/></>}
      {type==='n'&&<><path d="m24 68 4-18 15-12-7-7-13 12-10-5 9-20 13-4 8-8 3 11c18 5 22 26 14 51z"/><path d="m29 24-6 12 11-6" fill="none"/><path d="M46 22c10 12 9 24 3 35" fill="none" opacity=".4"/><circle cx="35" cy="23" r="2" fill={color==='w'?'#554c35':'#bacc9d'} stroke="none"/></>}
      {type==='q'&&<><path d="m19 23 10 10 11-17 11 17 10-10-9 28H28z"/><path d="m31 49-4 19h26l-4-19z"/><path d="M27 48h26v7H27z"/>{[19,40,61].map((x,i)=><circle key={x} cx={x} cy={i===1?15:22} r="4"/>)}</>}
      {type==='k'&&<><path d="M37 7h6v7h7v6h-7v10h-6V20h-7v-6h7z"/><path d="M24 30q16-12 32 0l-7 20H31z"/><path d="m32 48-5 20h26l-5-20z"/><path d="M28 47h24v7H28z"/></>}
      <path d="M25 67h30l5 7H20z"/><path d="M20 74h40v6H20z"/>
    </g><path d="M24 76h30" stroke={color==='w'?'#fff7dd':'#c0d0e5'} opacity=".5" strokeWidth="1.5"/>
  </svg>;
}
