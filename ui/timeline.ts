// Presentation timing only. The reducer has already resolved this one action.
//
// The pace (round R2, 0.2): every beat and its order kept, the holds shortened and the beats overlapping — a number
// rolls while the next beat starts, the sweep runs into the date, the manager's bubbles arrive while the hand is
// dealt — so that, unskipped, a calm month end keeps the next decision waiting at most 4 s, a month with scandals
// 6 s plus 0.6 s for each scandal after the first, and a season change 5.5 s from the door's choice (with its
// ACCEPTED stamp). tools/pace.ts measures it over real reducer steps.
import { getCard, getEvent, managerMessages, type GameEvent } from '../core/index.ts';
import type { MotionMode, PlayedStep } from './queue.ts';
export type BeatKind = 'lift' | 'land' | 'endPress' | 'stamp' | 'resources' | 'scandalLift' | 'scandalFlip' | 'scandalCarry' | 'impact' | 'sweep' | 'date' | 'season' | 'seasonEnd' | 'publish' | 'deal' | 'message' | 'gate' | 'draft' | 'eventSend' | 'eventReply' | 'eventClose' | 'actions' | 'settled';
/** `slots`: an 'actions' beat's actions left this month, as an answer to an event leaves them (round R2). */
export interface Beat { readonly at: number; readonly kind: BeatKind; readonly uid?: number; readonly event?: number; readonly bubble?: number; readonly resourceEvents?: readonly Extract<GameEvent,{type:'resource'}>[]; readonly slots?: number }
export interface Timeline { readonly beats: readonly Beat[]; readonly duration: number; readonly incomingMessages: number; readonly existingMessages: number }
/** Every hold of the month end, in ms (round R2, 0.2). */
export const PACE = {
  stamp: 250,
  /** The first resource beat after END TURN; a gate's or a draft's. */
  resources: 600, gateResources: 200, draftResources: 120,
  /** Resources roll in the stat bar while what follows starts: a short lead per group, a gap per number. */
  resourceGap: 120, resourceLead: 150,
  /** A scandal: its headline rises, turns over into its card, drops onto the pile; the next one 0.54 s later. */
  scandalFlip: 700, scandalCarry: 1600, scandalImpact: 2220, scandalEnd: 2500, scandalStagger: 540,
  /** The sweep runs into the date flip: a lead, and a little more for each card on the pile. */
  sweepLead: 250, sweepCard: 50,
  date: 200, season: 300, seasonHold: 2200,
  dealLead: 100, dealCard: 90, dealHold: 450, noDeal: 200,
  /** The manager's bubbles, after the issue is out (after the season's card in a new season). */
  messagesLead: 150, bubble: 380, bubbleHold: 450,
} as const;
/**
 * An event's answer (round R2, Part C): the player's bubble or tick, then — after a few typing dots — their reply,
 * or the SENT stamp and the outcome; the answer's effects land; the phone goes down, or the letter leaves; then
 * the month goes on (its offers, or its deal).
 */
export const EVENT_PACE = {
  replyText: 1300, replyLetter: 450,
  effectsLead: 250, effectGap: 120, carry: 620,
  close: 900, closeHold: 380,
} as const;
function eventTimeline(step: PlayedStep, history: readonly PlayedStep[], mode: MotionMode, chosen: number): Timeline {
  const e = step.events[chosen];
  const form = e?.type === 'eventChosen' ? getEvent(step.after.content, e.eventId)?.form : undefined;
  const beats: Beat[] = [{at:0,kind:'eventSend'}];
  const reply = form === 'letter' ? EVENT_PACE.replyLetter : EVENT_PACE.replyText;
  beats.push({at:reply,kind:'eventReply'});
  // The answer's own effects, up to the month going on: numbers roll, a bulb dims, a scandal card is laid on the pile.
  const rest = step.events.slice(chosen+1);
  const open = rest.findIndex(x=>x.type==='draftOffer'||x.type==='turnStart');
  const stop = chosen+1+(open<0?rest.length:open);
  let at = reply+EVENT_PACE.effectsLead, last = at;
  for(let i=chosen+1;i<stop;i++) {
    const x = step.events[i]!;
    if(x.type==='resource') {beats.push({at,kind:'resources',resourceEvents:[x],event:i});last=at;at+=EVENT_PACE.effectGap;}
    if(x.type==='slots') {beats.push({at,kind:'actions',slots:x.value,event:i});last=at;at+=EVENT_PACE.effectGap;}
    if(x.type==='addCard' && getCard(step.after.content,x.cardId)?.kind==='scandal') {beats.push({at,kind:'scandalCarry',uid:x.uid,event:i},{at:at+EVENT_PACE.carry,kind:'impact',uid:x.uid,event:i});last=at+EVENT_PACE.carry;at+=EVENT_PACE.effectGap;}
  }
  const close = Math.max(reply+EVENT_PACE.close, last+200);
  beats.push({at:close,kind:'eventClose'});
  const publishAt = close+EVENT_PACE.closeHold;
  beats.push({at:publishAt,kind:'publish'});
  const existingMessages=managerMessages(history).find(m=>m.turn===step.after.turn)?.messages.length??0;
  const afterMessages=managerMessages([...history,step]).find(m=>m.turn===step.after.turn)?.messages.length??0;
  const incomingMessages=Math.max(0,afterMessages-existingMessages);
  let done = publishAt+PACE.noDeal;
  const start = step.events.findIndex(x=>x.type==='turnStart');
  if(start>=0) {
    let drawCount=0;
    step.events.slice(start).forEach((x,i)=>{
      if(x.type==='draw') beats.push({at:publishAt+PACE.dealLead+drawCount++*PACE.dealCard,kind:'deal',uid:x.uid,event:start+i});
      if(x.type==='resource') beats.push({at:publishAt+PACE.dealLead+Math.max(0,drawCount-1)*PACE.dealCard,kind:'resources',resourceEvents:[x],event:start+i});
    });
    done=publishAt+PACE.dealLead+Math.max(0,drawCount-1)*PACE.dealCard+PACE.dealHold;
  }
  for(let i=0;i<incomingMessages*2;i++) beats.push({at:publishAt+PACE.messagesLead+i*PACE.bubble,kind:'message',bubble:existingMessages*2+i});
  if(incomingMessages) done=Math.max(done,publishAt+PACE.messagesLead+(incomingMessages*2-1)*PACE.bubble+PACE.bubbleHold);
  beats.push({at:done,kind:'settled'});
  beats.sort((a,b)=>a.at-b.at);
  if(mode==='reduced') {
    // No travel: the reply still waits a moment to be read; everything else crossfades quickly.
    let t=0,prev=0;
    const reduced=beats.map((beat,i)=>{const gap=beat.at-prev;prev=beat.at;t+=beats[i-1]?.kind==='eventSend'?Math.min(500,gap):Math.min(150,gap);return {...beat,at:t};});
    return {beats:reduced,duration:t,existingMessages,incomingMessages};
  }
  return {beats,duration:done,existingMessages,incomingMessages};
}
export function timeline(step: PlayedStep, history: readonly PlayedStep[], mode: MotionMode): Timeline | null {
  const chosen = step.events.findIndex(e=>e.type==='eventChosen');
  if(chosen>=0) return eventTimeline(step,history,mode,chosen);
  const end = step.events.findIndex(e=>e.type==='turnEnd');
  const start = step.events.findIndex(e=>e.type==='turnStart');
  const gate = step.events.some(e=>e.type==='gate');
  if(end<0 && start<0 && !gate) return null;
  const beats: Beat[]=[]; let cursor:number=end>=0?PACE.resources:gate?PACE.gateResources:PACE.draftResources;
  // While a scandal is in flight, what follows in the reducer's order starts beside it: numbers roll in the stat bar
  // and the next scandal lifts 0.54 s after the last one, even across the resources between them.
  let scandalTail=0;
  beats.push({at:0,kind:end>=0?'endPress':gate?'gate':'draft'});
  if(end>=0) beats.push({at:PACE.stamp,kind:'stamp'});
  const stop=start<0?step.events.length:start;
  // Preserve resource order, including the turnEnd boundary between venting and manager relief.
  for(let i=0;i<stop;) {
    const e=step.events[i]!;
    if(e.type==='resource') {
      const resources: Extract<GameEvent,{type:'resource'}>[]=[];
      while(i<stop && step.events[i]?.type==='resource') resources.push(step.events[i++] as Extract<GameEvent,{type:'resource'}>);
      resources.forEach((event,j)=>beats.push({at:cursor+j*PACE.resourceGap,kind:'resources',resourceEvents:[event]}));
      if(scandalTail<=cursor) cursor+=PACE.resourceLead+(resources.length-1)*PACE.resourceGap;
      continue;
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
        const at=cursor+j*PACE.scandalStagger;
        beats.push({at,kind:'scandalLift',...card},{at:at+PACE.scandalFlip,kind:'scandalFlip',...card},{at:at+PACE.scandalCarry,kind:'scandalCarry',...card},{at:at+PACE.scandalImpact,kind:'impact',...card});
        scandalTail=at+PACE.scandalEnd;
      });
      cursor+=added.length*PACE.scandalStagger; continue;
    }
    i++;
  }
  cursor=Math.max(cursor,scandalTail);
  if(end>=0) {
    const played=history.filter(s=>s.before?.turn===step.before?.turn).flatMap(s=>s.events.filter(e=>e.type==='play')).length;
    const added=beats.filter(b=>b.kind==='scandalCarry').length;
    beats.push({at:cursor,kind:'sweep'});cursor+=PACE.sweepLead+Math.max(0,played+added-1)*PACE.sweepCard;
  }
  if(step.before && step.after.turn!==step.before.turn) {beats.push({at:cursor,kind:'date'});cursor+=PACE.date;}
  const season=!!step.before && step.after.act!==step.before.act && step.after.phase!=='ended';
  const seasonAt=cursor;
  if(season) {beats.push({at:cursor,kind:'season'});cursor+=PACE.season;}
  beats.push({at:cursor,kind:'publish'});
  const publishAt=cursor;
  // The existing model opens messages at draftOffer OR turnStart. Animate that real opening,
  // including months that pause at a draft; the final pick must not announce them a second time.
  const existingMessages=managerMessages(history).find(m=>m.turn===step.after.turn)?.messages.length??0;
  const afterMessages=managerMessages([...history,step]).find(m=>m.turn===step.after.turn)?.messages.length??0;
  const incomingMessages=Math.max(0,afterMessages-existingMessages);
  let done=publishAt+PACE.noDeal; // newly exposed choice/ending consumes a skip, never a second action
  if(start>=0) {
    let drawCount=0;
    // onDraw effects follow their own draw, in the reducer's order.
    step.events.slice(start).forEach((e,i)=>{
      if(e.type==='draw') beats.push({at:publishAt+PACE.dealLead+drawCount++*PACE.dealCard,kind:'deal',uid:e.uid,event:start+i});
      if(e.type==='resource') beats.push({at:publishAt+PACE.dealLead+Math.max(0,drawCount-1)*PACE.dealCard,kind:'resources',resourceEvents:[e],event:start+i});
    });
    done=publishAt+PACE.dealLead+Math.max(0,drawCount-1)*PACE.dealCard+PACE.dealHold;
  }
  // In a new season its card covers the desk until it lifts; the bubbles follow it. Otherwise they arrive with the deal.
  let messagesAt=publishAt;
  if(season) {const lift=seasonAt+PACE.seasonHold;beats.push({at:lift,kind:'seasonEnd'});messagesAt=lift;done=Math.max(done,lift);}
  for(let i=0;i<incomingMessages*2;i++) beats.push({at:messagesAt+PACE.messagesLead+i*PACE.bubble,kind:'message',bubble:existingMessages*2+i});
  if(incomingMessages) done=Math.max(done,messagesAt+PACE.messagesLead+(incomingMessages*2-1)*PACE.bubble+PACE.bubbleHold);
  cursor=Math.max(cursor,done);
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
