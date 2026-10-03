import { useMemo } from 'react';
import { establishedLanes, readLines } from '../../core/index.ts';
import type { Snapshot } from '../queue.ts';
import { CardPicture } from './Hand.tsx';
import { cardModel, type DeskModel } from './model.ts';
export const PILE_SLOTS = [[896,458,-8],[918,450,5],[938,442,-3],[956,436,7],[972,430,-5]] as const;
export const planeFace = (x:number,y:number,rot:number,scale=.55) => `translate(${x-93}px,${y-126}px) rotateZ(${rot}deg) scale(${scale})`;
export function Pile({snap,model}:{snap:Snapshot;model:DeskModel}) {
  const cards=useMemo(()=> {
    const found: {face:ReturnType<typeof cardModel>;step:number;event:number}[]=[];
    snap.steps.forEach((step,i)=> {
      if(step.events.some(e=>e.type==='turnEnd')) found.length=0;
      if(!step.before || step.before.turn!==snap.state.turn) return;
      const event=step.events.findIndex(e=>e.type==='play'),played=step.events[event]; if(played?.type!=='play') return;
      const before=snap.steps.slice(0,i);
      const lines={...readLines(before),lane:establishedLanes(before).slice(-1)[0]??null};
      found.push({face:cardModel(step.before,played,lines,true),step:step.id,event});
    });return found;
  },[snap.steps,snap.state.turn]);
  const flying=snap.active?.mode==='full' && !snap.active.plan ? snap.active.step.id : null;
  return <div className="scene3d motion-pile" aria-hidden="true">{cards.map(({face:card,step,event},i)=>{
    const [x,y,rot]=PILE_SLOTS[Math.min(i,PILE_SLOTS.length-1)]!;
    return <div key={`${step}:${event}`} className="plane motion-face" data-pile-event={`${step}:${event}`} data-pile-uid={card.uid} data-pile-card={card.cardId} style={{transform:'rotateX(64deg)',visibility:step===flying?'hidden':'visible'}}><div style={{position:'absolute',transform:planeFace(x,y,rot)}}><CardPicture card={card} words={model.handWords} season={model.season}/></div></div>;
  })}</div>;
}
