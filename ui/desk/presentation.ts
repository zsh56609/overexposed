// A display projection only: immutable resource endpoints from this action's events.
// No reducer calls and no writes to the queued GameState.
import type { Snapshot } from '../queue.ts';
import { statBar, type DeskModel } from './model.ts';
export function presentation(snap: Snapshot, model: DeskModel) {
  const active=snap.active;
  if(!active?.plan) return {stats:model.stats,phone:model.phone,visibleBubbles:undefined,hiddenCards:[] as number[]};
  const {step,plan}=active;
  const elapsed=plan.beats.slice(0,(active.index??0)+1);
  const base=step.before??step.after;
  const resources={...base.resources};
  for(const beat of elapsed) for(const e of beat.resourceEvents??[]) resources[e.target]=e.value;
  const published=!!active.published;
  const projection={...(published?step.after:base),resources};
  const stats=statBar(projection,model.lane==='early'?null:model.lane);
  const draws=step.events.filter(e=>e.type==='draw');
  const dealt=new Set(elapsed.filter(b=>b.kind==='deal').map(b=>b.uid));
  const hiddenCards=published?draws.filter(e=>!dealt.has(e.uid)).map(e=>e.uid):[];
  const dealing=published && draws.length>0 && hiddenCards.length>0;
  const outgoing=!published && step.events.some(e=>e.type==='turnEnd');
  const lastBubble=elapsed.filter(b=>b.kind==='message').at(-1)?.bubble;
  const visibleBubbles=published && plan.incomingMessages>0 ? (lastBubble===undefined?plan.existingMessages*2:lastBubble+1):undefined;
  let managerCount=0;
  const phone=visibleBubbles===undefined?model.phone:{notes:model.phone.notes.filter(k=>k!=='mgr'||++managerCount<=Math.ceil(visibleBubbles/2))};
  return {stats:outgoing||dealing?{...stats,actions:{...stats.actions,left:0}}:stats,phone,visibleBubbles,hiddenCards};
}
