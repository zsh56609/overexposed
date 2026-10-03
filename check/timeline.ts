// Real recorded runs + a virtual clock: every beat boundary, including callbacks after a skip.
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { readFileSync } from 'node:fs';
import { createInitialState, getCard, reduce, type Action, type Content, type GameState } from '../core/index.ts';
import { loadRawContent } from '../validate/load.ts';
import { EventQueue, type MotionMode, type PlayedStep } from '../ui/queue.ts';
import { timeline } from '../ui/timeline.ts';
import type { DeskState, Step } from './desk-replay.ts';
const content=loadRawContent() as Content;
const fixtures=JSON.parse(readFileSync(new URL('./desk-states.json',import.meta.url),'utf8')) as Record<string,DeskState>;
function actionFor(s:GameState,[kind,i]:Step):Action {
  switch(kind){
    case 'manager':return {type:'CHOOSE_MANAGER',managerId:content.managers!.managers[i]!.id};
    case 'draft':return {type:'DRAFT_PICK',cardId:s.draft!.offer[i]!};
    case 'extra':return {type:'DRAFT_EXTRA_PICK'};
    case 'reroll':return {type:'DRAFT_REROLL'};
    case 'gate':return {type:'CHOOSE_GATE',gateId:s.gateOffer[i]!};
    case 'play':return {type:'PLAY_CARD',uid:s.hand[i]!.uid};
    case 'end':return {type:'END_TURN'};
  }
}
const cases=new Map<string,{history:PlayedStep[];step:PlayedStep}>();
for(const fixture of Object.values(fixtures)) {
  let state=createInitialState(fixture.seed,content,{strict:true});
  const history:PlayedStep[]=[{id:1,action:null,before:null,after:state,events:state.events}];
  for(const spec of fixture.steps){
    const action=actionFor(state,spec),after=reduce(state,action);
    const step:PlayedStep={id:history.length+1,action,before:state,after,events:after.events};
    if(timeline(step,history,'full')) {
      const key=JSON.stringify([fixture.seed,history.map(s=>s.action),action]);
      if(!cases.has(key))cases.set(key,{history:[...history],step});
    }
    history.push(step);state=after;
  }
}
mock.timers.enable({apis:['setTimeout','Date']});
let boundaries=0;
const coverage=new Set<string>();
try {
 for(const {history,step} of cases.values()) {
  const plan=timeline(step,history,'full')!;
  const adds=step.events.filter(e=>e.type==='addCard').filter(e=>getCard(step.after.content,e.cardId)?.kind==='scandal');
  if(step.action?.type==='END_TURN')coverage.add(`scandals:${Math.min(2,adds.length)}`);
  if(adds.some(e=>e.cardId==='copycat_story'))coverage.add('copycat');
  if(step.events.some((e,i)=>e.type==='resource'&&i>step.events.findIndex(e=>e.type==='turnEnd')&&e.delta<0&&step.after.manager==='guardian'&&step.events.some(e=>e.type==='turnEnd')))coverage.add('mags-relief');
  if(step.action?.type==='END_TURN')assert.deepEqual(plan.beats.filter(b=>b.kind==='scandalLift').map(b=>b.uid),adds.map(e=>e.uid));
  assert.deepEqual(plan.beats.flatMap(b=>b.resourceEvents??[]),step.events.filter(e=>e.type==='resource'));
  assert.deepEqual(plan.beats.filter(b=>b.kind==='deal').map(b=>b.uid),step.events.filter(e=>e.type==='draw').map(e=>e.uid));
  coverage.add(`${step.action?.type}->${step.after.phase}`);
  if(plan.beats.some(b=>b.kind==='season'))coverage.add('season');
  const make=()=>{
    let mode:MotionMode='off';const first=history[0]!;
    const q=new EventQueue({action:first.action,state:first.after,events:first.events},()=>mode);
    for(const s of history.slice(1))q.enqueue({action:s.action,state:s.after,events:s.events});
    mode='full';q.enqueue({action:step.action,state:step.after,events:step.events});return q;
  };
  // Normal completion publishes the reducer result once; no next hand before publish.
  const normal=make();let at=0;
  for(const beat of plan.beats){mock.timers.tick(beat.at-at);at=beat.at;if(beat.at<plan.beats.find(b=>b.kind==='publish')!.at)assert.equal(normal.getSnapshot().state,step.before);}
  assert.equal(normal.getSnapshot().state,step.after);assert.equal(normal.busy,false);assert.equal(normal.getSnapshot().steps.length,history.length+1);normal.dispose();
  for(const boundary of [...new Set(plan.beats.flatMap(b=>[Math.max(0,b.at-1),b.at+1]))]){
    const q=make();mock.timers.tick(boundary);q.skip();
    assert.equal(q.getSnapshot().state,step.after);assert.equal(q.busy,false);assert.equal(q.getSnapshot().steps.length,history.length+1);
    mock.timers.tick(plan.duration+2000);assert.equal(q.getSnapshot().steps.length,history.length+1);assert.equal(q.getSnapshot().active,null);q.dispose();boundaries++;
  }
 }
} finally {mock.timers.reset();}
for(const required of ['scandals:0','scandals:1','scandals:2','copycat','mags-relief','season','END_TURN->draft','END_TURN->play','END_TURN->gate','CHOOSE_GATE->draft','CHOOSE_GATE->ended','DRAFT_PICK->play'])assert.ok(coverage.has(required),`missing ${required}`);
console.log(`timeline: ${cases.size} real reducer steps, ${boundaries} before/after beat skips, ordered resources, actual draws, UID dedup, publication and stale callbacks — PASS`);
console.log([...coverage].sort().join(', '));
