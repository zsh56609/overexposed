// Presentation timing only. The reducer has already resolved this one action.
import { getCard, managerMessages, type GameEvent } from '../core/index.ts';
import type { MotionMode, PlayedStep } from './queue.ts';
export type BeatKind = 'lift' | 'land' | 'endPress' | 'stamp' | 'resources' | 'scandalLift' | 'scandalFlip' | 'scandalCarry' | 'impact' | 'sweep' | 'date' | 'season' | 'seasonEnd' | 'publish' | 'deal' | 'message' | 'gate' | 'draft' | 'settled';
export interface Beat { readonly at: number; readonly kind: BeatKind; readonly uid?: number; readonly event?: number; readonly bubble?: number; readonly resourceEvents?: readonly Extract<GameEvent,{type:'resource'}>[] }
export interface Timeline { readonly beats: readonly Beat[]; readonly duration: number; readonly incomingMessages: number; readonly existingMessages: number }
export function timeline(step: PlayedStep, history: readonly PlayedStep[], mode: MotionMode): Timeline | null {
  const end = step.events.findIndex(e=>e.type==='turnEnd');
  const start = step.events.findIndex(e=>e.type==='turnStart');
  const gate = step.events.some(e=>e.type==='gate');
  if(end<0 && start<0 && !gate) return null;
  const beats: Beat[]=[]; let cursor=end>=0?900:gate?260:120;
  beats.push({at:0,kind:end>=0?'endPress':gate?'gate':'draft'});
  if(end>=0) beats.push({at:320,kind:'stamp'});
  const stop=start<0?step.events.length:start;
  // Preserve resource order, including the turnEnd boundary between venting and manager relief.
  for(let i=0;i<stop;) {
    const e=step.events[i]!;
    if(e.type==='resource') {
      const resources: Extract<GameEvent,{type:'resource'}>[]=[];
      while(i<stop && step.events[i]?.type==='resource') resources.push(step.events[i++] as Extract<GameEvent,{type:'resource'}>);
      resources.forEach((event,j)=>beats.push({at:cursor+j*140,kind:'resources',resourceEvents:[event]}));
      cursor+=1350+(resources.length-1)*140; continue;
    }
    if(end>=0 && e.type==='addCard' && getCard(step.after.content,e.cardId)?.kind==='scandal') {
      const added: {uid:number;event:number}[]=[];
      while(i<stop) {
        const item=step.events[i]!;
        if(item.type==='scandal') {i++;continue;} // same uid as addCard, never a second face
        if(item.type!=='addCard' || getCard(step.after.content,item.cardId)?.kind!=='scandal') break;
        added.push({uid:item.uid,event:i++});
      }
      added.forEach((card,j)=> {
        const at=cursor+j*650;
        beats.push({at,kind:'scandalLift',...card},{at:at+1050,kind:'scandalFlip',...card},{at:at+2250,kind:'scandalCarry',...card},{at:at+2870,kind:'impact',...card});
      });
      cursor+=3270+(added.length-1)*650; continue;
    }
    i++;
  }
  if(end>=0) {
    const played=history.filter(s=>s.before?.turn===step.before?.turn).flatMap(s=>s.events.filter(e=>e.type==='play')).length;
    const added=beats.filter(b=>b.kind==='scandalCarry').length;
    beats.push({at:cursor,kind:'sweep'});cursor+=620+Math.max(0,played+added-1)*80;
  }
  if(step.before && step.after.turn!==step.before.turn) {beats.push({at:cursor,kind:'date'});cursor+=260;}
  const season=!!step.before && step.after.act!==step.before.act && step.after.phase!=='ended';
  const seasonAt=cursor;
  if(season) {beats.push({at:cursor,kind:'season'});cursor+=700;}
  beats.push({at:cursor,kind:'publish'});
  // The existing model opens messages at draftOffer OR turnStart. Animate that real opening,
  // including months that pause at a draft; the final pick must not announce them a second time.
  const existingMessages=managerMessages(history).find(m=>m.turn===step.after.turn)?.messages.length??0;
  const afterMessages=managerMessages([...history,step]).find(m=>m.turn===step.after.turn)?.messages.length??0;
  const incomingMessages=Math.max(0,afterMessages-existingMessages);
  if(start>=0) {
    let drawCount=0;
    // onDraw effects follow their own draw, in the reducer's order.
    step.events.slice(start).forEach((e,i)=>{
      if(e.type==='draw') beats.push({at:cursor+120+drawCount++*110,kind:'deal',uid:e.uid,event:start+i});
      if(e.type==='resource') beats.push({at:cursor+120+Math.max(0,drawCount-1)*110,kind:'resources',resourceEvents:[e],event:start+i});
    });
    cursor+=120+Math.max(0,drawCount-1)*110+450;
  } else cursor+=200; // newly exposed choice/ending consumes a skip, never a second action
  if(season) {beats.push({at:seasonAt+3000,kind:'seasonEnd'});cursor=Math.max(cursor,seasonAt+3000);}
  for(let i=0;i<incomingMessages*2;i++) beats.push({at:cursor+250+i*820,kind:'message',bubble:existingMessages*2+i});
  if(incomingMessages) cursor+=250+(incomingMessages*2-1)*820+450;
  beats.push({at:cursor,kind:'settled'});
  beats.sort((a,b)=>a.at-b.at);
  if(mode==='reduced') {
    let at=0,last=0;
    const reduced=beats.map((beat,i)=> {
      const gap=beat.at-last;last=beat.at;
      const previous=beats[i-1]?.kind;
      at+=previous==='scandalLift'||previous==='scandalFlip'||previous==='season'?gap:Math.min(150,gap);
      return {...beat,at};
    });
    return {beats:reduced,duration:at,existingMessages,incomingMessages};
  }
  return {beats,duration:cursor,existingMessages,incomingMessages};
}
