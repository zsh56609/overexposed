// Presentation timing only. The reducer has already resolved this one action.
//
// The pace (round R2, 0.2): every beat and its order kept, the holds shortened and the beats overlapping — a number
// rolls while the next beat starts, the sweep runs into the date, the manager's bubbles arrive while the hand is
// dealt — so that, unskipped, a calm month end keeps the next decision waiting at most 4 s, a month with scandals
// 6 s plus 0.6 s for each scandal after the first, and a season change 5.5 s from the door's choice (with its
// ACCEPTED stamp). tools/pace.ts measures it over real reducer steps.
import { getCard, getEvent, type GameEvent } from '../core/index.ts';
import { t } from './i18n.ts';
import type { MotionMode, PlayedStep } from './queue.ts';
export type BeatKind = 'lift' | 'land' | 'endPress' | 'stamp' | 'resources' | 'scandalLift' | 'scandalFlip' | 'scandalCarry' | 'impact' | 'sweep' | 'date' | 'season' | 'publish' | 'deal' | 'message' | 'gate' | 'draft' | 'eventSend' | 'eventReply' | 'eventClose' | 'actions' | 'signAway' | 'signedAway' | 'undim' | 'lightsOut' | 'dark' | 'settled';
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
  /** A season's card (round R3, A3): it rises in — the dim 0.2 s, the card 0.25 s — and waits for its button. */
  date: 200, season: 300, seasonIn: 450,
  dealLead: 100, dealCard: 90, dealHold: 450, noDeal: 200,
  /** The manager's bubbles (round R3, C1): after the month's hand is dealt, one by one, as the desk's own tails. */
  messagesLead: 250, bubble: 380,
  /** The last door (round R3, B5): the mirror's bulbs go out one after another, then the room goes dark. */
  lightsOut: 700, dark: 450,
} as const;
/**
 * Signing (round R4, A2; it replaces R3's B3), from the action, which the SIGNED stamp sends 0.56 s after the click:
 * the heading and the footer fade and the other card slides down off the stage; 0.12 s later the signed card follows
 * on its own side, the phone glowing once — the manager lives there now; from 0.6 s the dim over the desk lifts
 * (0.35 s); at 0.75 s the month is published — its papers drop, the stat bar and the notes come up — and the desk
 * stays lit, on purpose, until the offers come up over their dim at 1.8 s.
 */
export const SIGN = { signed: 120, undim: 600, publish: 750, settled: 1800 } as const;
function signTimeline(mode: MotionMode): Timeline {
  const beats: Beat[] = [{ at: 0, kind: 'signAway' }, { at: SIGN.signed, kind: 'signedAway' }, { at: SIGN.undim, kind: 'undim' }, { at: SIGN.publish, kind: 'publish' }, { at: SIGN.settled, kind: 'settled' }];
  if (mode === 'reduced') return { beats: beats.map((b, i) => ({ ...b, at: i * 150 })), duration: (beats.length - 1) * 150, existingMessages: 0, incomingMessages: 0 };
  return { beats, duration: SIGN.settled, existingMessages: 0, incomingMessages: 0 };
}
/**
 * An event's answer (round R2, Part C): the player's bubble or tick, then — after a few typing dots — their reply,
 * or the SENT stamp and the outcome; the answer's effects land; the phone goes down, or the letter leaves; then
 * the month goes on (its offers, or its deal).
 *
 * Round R4, A3a: time to read the answer. The phone stays until their answer has finished arriving (its pop), then
 * 1.6 s and 0.1 s for each word of it; a letter the same, from the end of its outcome line's 0.5 s fade-in. A click
 * ends the hold at once (D7). Then, A3b, one exit: the content leaves as one piece (0.4 s; ui/style.css), and only
 * after it is the month published.
 */
export const EVENT_PACE = {
  replyText: 1300, replyLetter: 450,
  effectsLead: 250, effectGap: 120, carry: 620,
  popText: 280, popLetter: 500, read: 1600, perWord: 100, exit: 400,
} as const;
/** A word of an answer: a run of letters or digits (round R4, A3a); emoji and punctuation don't count. */
export const answerWords = (text: string): number => (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
function eventTimeline(step: PlayedStep, mode: MotionMode, chosen: number): Timeline {
  const e = step.events[chosen];
  const ev = e?.type === 'eventChosen' ? getEvent(step.after.content, e.eventId) : undefined;
  const form = ev?.form;
  const answer = e?.type === 'eventChosen' ? ev?.choices[e.choice]?.outcomeKey : undefined;
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
  // Time to read their answer, then the one exit (round R4, A3a–b).
  const read = (form === 'letter' ? EVENT_PACE.popLetter : EVENT_PACE.popText) + EVENT_PACE.read + EVENT_PACE.perWord * answerWords(answer ? t(answer) : '');
  const close = Math.max(reply+read, last+200);
  beats.push({at:close,kind:'eventClose'});
  const publishAt = close+EVENT_PACE.exit;
  beats.push({at:publishAt,kind:'publish'});
  // The month's messages are the desk's own tails now (round R3, C1): no step holds input for them.
  const existingMessages=0, incomingMessages=0;
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
  beats.push({at:done,kind:'settled'});
  beats.sort((a,b)=>a.at-b.at);
  if(mode==='reduced') {
    // No travel: the reply still waits a moment, and the answer its time to be read (A3a); everything else is quick.
    let now=0,prev=0,replied=0;
    const reduced=beats.map((beat,i)=>{
      const gap=beat.at-prev;prev=beat.at;
      if(beat.kind==='eventClose') now=Math.max(now+Math.min(150,gap),replied+read);
      else now+=beats[i-1]?.kind==='eventSend'?Math.min(500,gap):Math.min(150,gap);
      if(beat.kind==='eventReply') replied=now;
      return {...beat,at:now};
    });
    return {beats:reduced,duration:now,existingMessages,incomingMessages};
  }
  return {beats,duration:done,existingMessages,incomingMessages};
}
export function timeline(step: PlayedStep, history: readonly PlayedStep[], mode: MotionMode): Timeline | null {
  if (step.action?.type === 'CHOOSE_MANAGER' && !step.events.some((e) => e.type === 'resource' || e.type === 'draw')) return signTimeline(mode);
  const chosen = step.events.findIndex(e=>e.type==='eventChosen');
  if(chosen>=0) return eventTimeline(step,mode,chosen);
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
  // The year's last door: the lights go out before the awards night comes up (round R3, B5).
  if(step.after.phase==='ended') {beats.push({at:cursor,kind:'lightsOut'});cursor+=PACE.lightsOut;beats.push({at:cursor,kind:'dark'});cursor+=PACE.dark;}
  beats.push({at:cursor,kind:'publish'});
  const publishAt=cursor;
  // The existing model opens messages at draftOffer OR turnStart. Animate that real opening,
  // including months that pause at a draft; the final pick must not announce them a second time.
  // The month's messages are the desk's own tails now (round R3, C1): they come once its hand is dealt and the step
  // has ended, one by one, and hold no input (ui/desk/DeskItems.tsx Bubbles).
  const existingMessages=0, incomingMessages=0;
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
  // A season's card waits for the player (round R3): the step ends once its button can be clicked.
  if(season) {const ready=seasonAt+PACE.seasonIn;done=Math.max(done,ready);}
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
