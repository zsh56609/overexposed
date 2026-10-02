// V1b: a pending story is retractable. Exercise real cooling plays, including hands with end-turn penalties.
import assert from 'node:assert/strict';
import { createInitialState, legalActions, reduce, seedRng, cursor, nextInt, readLines, establishedLanes, type Content } from '../core/index.ts';
import { loadRawContent } from '../validate/load.ts';
import { deskModel } from '../ui/desk/model.ts';
import type { PlayedStep } from '../ui/queue.ts';
import { t } from '../ui/i18n.ts';
const content = loadRawContent() as Content;
let cooled = 0, labelled = 0;
for (let seed = 1; seed <= 60; seed++) {
  let s = createInitialState(seed, content, { strict: true });
  const rng = cursor(seedRng(seed));
  const history: PlayedStep[] = [{id: 1,action: null,before: null,after:s,events:s.events}];
  for (let n = 0; s.phase !== 'ended' && n < 200; n++) {
    const model = deskModel({state:s, steps:history, lines:{...readLines(history),lane:establishedLanes(history).slice(-1)[0] ?? null}});
    const pending = model.papers?.pages.flatMap(p=>[p.lead,...p.row]).filter(p=>p?.coming) ?? [];
    for (const p of pending) { assert.equal(p!.kicker,t('paper.kicker.coming')); labelled++; }
    const actions = legalActions(s);
    if (pending.length) for (const action of actions) {
      if (action.type !== 'PLAY_CARD') continue;
      const after = reduce(s,action);
      if (after.resources.heat >= s.resources.heat) continue;
      const end = reduce(after,{type:'END_TURN'});
      // Copying scandals can still print even after cooling: only demand a blank pending column when no scandal is added.
      if (end.events.some(e=>e.type === 'addCard' && after.content.cards[e.cardId]?.kind === 'scandal')) continue;
      const steps = [...history,{id:history.length+1,action,before:s,after,events:after.events}];
      const m = deskModel({state:after,steps,lines:{...readLines(steps),lane:establishedLanes(steps).slice(-1)[0] ?? null}});
      assert.equal(m.papers?.pages.flatMap(p=>[p.lead,...p.row]).filter(p=>p?.coming).length,0);
      cooled++;
    }
    const pick = nextInt(rng, actions.length);
    const action=actions[pick]!; const after=reduce(s,action);
    history.push({id:history.length+1,action,before:s,after,events:after.events}); s=after;
  }
}
assert.ok(cooled > 0 && labelled > 0, 'the pending/cooling fixtures must be exercised');
console.log(`press contract: ${labelled} pending labels; ${cooled} real cooling plays remove pending stories; PASS`);
