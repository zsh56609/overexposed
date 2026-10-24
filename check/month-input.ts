import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from './browser.ts';
import { cardPoint, centre, loadStates, reach, type DeskState, type Step } from './desk-replay.ts';
import { bubbleMonth, frenzyBubbleMonth, qualifyingMonths } from './month-fixtures.ts';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const settled=`JSON.stringify({step:document.querySelector('.desk')?.dataset.step,hand:[...document.querySelectorAll('.hand .card')].map(c=>[c.dataset.uid,c.dataset.card,c.textContent,getComputedStyle(c).visibility]),pile:[...document.querySelectorAll('[data-pile-uid]')].map(c=>[c.dataset.pileUid,c.dataset.pileCard,c.textContent,getComputedStyle(c).visibility,c.style.transform,c.firstElementChild.style.transform]),paper:[...document.querySelectorAll('.pp')].map(c=>c.textContent),note:document.querySelector('.nb-txt')?.textContent,stats:document.querySelector('.stats')?.textContent,bulbs:[...document.querySelectorAll('.slotbulbs i')].map(c=>c.className),bubbles:[...document.querySelectorAll('.bub[data-k]')].map(c=>[c.dataset.k,c.textContent]),phone:[...document.querySelectorAll('.nt')].map(c=>c.className),choice:document.querySelector('.screen-over,.scr')?.textContent})`;
async function waitIdle(page:Page) {
  // Round R3: the month's bubbles come as the desk's tails after a step (C1), and what leaves the desk fades for 0.15 s;
  // a text's messages arrive one at a time (round R2); a month's papers drop onto the old stack (round R4, A3d), which
  // can outlast a step whose season card waits — all of them are settled layout.
  const start=Date.now();while(await page.evaluate<boolean>(`document.querySelector('.desk,[data-presentation]')?.dataset.busy==='1'||!!document.querySelector('.bubbles[data-revealing],.screen-over.leaving,.event-screen[data-arriving],.news.dropping')`)){
    assert.ok(Date.now()-start<45000,`month stalled: ${await page.evaluate('document.querySelector(".desk")?.dataset.beat')}`);await sleep(35);
  }
}
/** A choice wears its stamp before it is made (round R1: SIGNED, TAKEN, ACCEPTED): wait until its action is dispatched. */
async function waitDispatched(page:Page,before:string) {
  const start=Date.now();
  // Dispatched: the queue holds it (busy), or it already played (with motion off the step counts at once).
  while(await page.evaluate<boolean>(`(()=>{const d=document.querySelector('.desk,[data-presentation]');return !!d&&d.dataset.busy!=='1'&&(d.dataset.step??'')===${JSON.stringify(before)}})()`)){
    assert.ok(Date.now()-start<3000,'a stamped choice was never made');await sleep(20);
  }
}
/** The fan has settled: no hand card is still moving (a hover lift, the gap closing). Points are sampled only then. */
async function waitFan(page:Page) {
  const start=Date.now();
  while(await page.evaluate<boolean>(`[...document.querySelectorAll('.hand .card')].some(c=>c.getAnimations().some(a=>a.playState==='running'))`)){
    assert.ok(Date.now()-start<5000,'the fan never settled');await sleep(20);
  }
}
/** A landed card's tails (the printed story, the handwriting, the signed figures) play on without holding input (round R1, Part A). */
async function waitTails(page:Page) {
  const start=Date.now();
  while(await page.evaluate<number>(`document.querySelectorAll('.motion-flight .plane,.motion-writing,.motion-delta').length`)){
    assert.ok(Date.now()-start<8000,'the tails never finished');await sleep(30);
  }
}
async function settledHits(page:Page) {
  const failures=await page.evaluate<string[]>(`(()=>{
    const issues=[];
    const test=(el,x,y)=>{if(x<0||y<0||x>=innerWidth||y>=innerHeight||!el.contains(document.elementFromPoint(x,y)))issues.push(el.dataset.card??el.className)};
    for(const c of document.querySelectorAll('.hand .card[aria-disabled="false"]')){
      const p=document.createElement('i');p.style.cssText='position:absolute;left:40px;top:120px;width:1px;height:1px;pointer-events:none';c.appendChild(p);const r=p.getBoundingClientRect();p.remove();test(c,r.x,r.y);
    }
    const end=document.querySelector('.endbtn');if(end){const r=end.getBoundingClientRect();test(end,r.x+r.width/2,r.y+r.height/2)}
    return issues;
  })()`);
  assert.deepEqual(failures,[],'settled legal hand/END TURN points must be visible and hit their real controls');
}
/**
 * The PRINTED stamp leaves with its issue (round R9a, C1): a month end into a month that opens on play — desk-states'
 * cdCrossed, April into May — by real input, in full motion. Watched each frame from the page: the stamp is on the front
 * paper before the date turns, and once the date reads the new month no .month-stamp is in the DOM.
 */
export async function checkStampInput(page:Page,url:string) {
  const fixture=loadStates().cdCrossed;assert.ok(fixture,'check/desk-states.json has no cdCrossed');
  assert.equal(await reach(page,url,fixture,300),'ok');
  // The replay ran with motion off; the month end plays in full motion.
  await page.evaluate(`document.documentElement.dataset.motion='full'`);
  await page.evaluate(`(()=>{
    const date=()=>document.querySelector('[data-hook="date"]')?.textContent??'';
    const w=window.__stamp={from:date(),to:null,before:0,after:0,stamped:0,click:0,shown:null,turned:null};
    addEventListener('pointerdown',()=>{w.click=performance.now()},{capture:true,once:true});
    const tick=()=>{
      const on=!!document.querySelector('.month-stamp');
      if(date()===w.from){if(on){w.before++;w.shown??=performance.now();}}
      else {w.to=date();w.turned??=performance.now();w.after++;if(on)w.stamped++;}
      if(w.after<40)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })()`);
  await page.click(...(await centre(page,'.endbtn'))!);
  await waitIdle(page);
  const start=Date.now();
  while((await page.evaluate<number>('window.__stamp.after'))<40){assert.ok(Date.now()-start<10000,`${page.name}: the date never turned`);await sleep(50);}
  const w=await page.evaluate<{from:string;to:string|null;before:number;after:number;stamped:number;click:number;shown:number|null;turned:number|null}>('window.__stamp');
  assert.ok(w.before>0,`${page.name}: PRINTED never showed on the front page before the date turned`);
  assert.equal(w.stamped,0,`${page.name}: PRINTED was still on the paper in ${w.stamped} of the ${w.after} frames after the date read ${w.to}`);
  const ms=(t:number|null)=>t===null?'-':`${Math.round(t-w.click)} ms`;
  console.log(`stamp input ${page.name}: ${w.from} into ${w.to} — PRINTED on the front page from ${ms(w.shown)} after END TURN until the date read ${w.to} at ${ms(w.turned)}; in none of the ${w.after} frames after`);
}
export async function checkOsMotion(page:Page,url:string) {
  if(!page.reducedMotion){console.log(`SKIP OS preference ${page.name}: this driver cannot emulate the media preference; explicit full/reduced modes are tested separately`);return;}
  const states=loadStates();
  try {
    for(const [name,fixture,selector] of [
      ['play',states.s02!,'.hand .card[data-card="side_gig"]'],
      ['month',states.s07b!,'.endbtn'],
    ] as const){
      await page.reducedMotion(false);assert.equal(await reach(page,url,fixture,80),'ok');
      await page.click(...(selector.includes('.card')?await cardPoint(page,await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].indexOf(document.querySelector(${JSON.stringify(selector)}))`)):await centre(page,selector))!);
      await waitIdle(page);await page.move(10,100);await sleep(200);const expected=await page.evaluate<string>(settled);
      for(const switching of [false,true]){
        assert.equal(await reach(page,url,fixture,80),'ok');await page.reducedMotion(!switching);
        await page.evaluate('delete document.documentElement.dataset.motion');await sleep(80);
        assert.equal(await page.evaluate(`document.documentElement.dataset.motionResolved`),switching?'full':'reduced');
        const point=selector.includes('.card')?await cardPoint(page,await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].indexOf(document.querySelector(${JSON.stringify(selector)}))`)):await centre(page,selector);
        assert.ok(point);await page.click(...point);
        if(switching){await sleep(100);assert.equal(await page.evaluate(`document.querySelector('.desk')?.dataset.busy`),'1');await page.reducedMotion(true);await sleep(80);assert.equal(await page.evaluate(`document.querySelector('.desk')?.dataset.busy`),'0','OS switch did not settle promptly');}
        const start=Date.now();let samples=0;
        do {
          const bad=await page.evaluate<string[]>(`document.getAnimations().flatMap(a=>{const k=a.effect?.getKeyframes()??[],d=Number(a.effect?.getTiming().duration??0);return d>200?['duration '+d]:['transform','clipPath','filter'].filter(p=>new Set(k.map(f=>f[p]).filter(v=>v!==undefined)).size>1).map(p=>'travel '+p)})`);
          assert.deepEqual(bad,[],`${name} OS reduced has non-fade motion`);samples++;
          assert.ok(Date.now()-start<45000,'OS motion deadline');await sleep(30);
        }while(await page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.busy==='1'`));
        await page.move(10,100);await sleep(200);assert.equal(await page.evaluate<string>(settled),expected,`${name} OS ${switching?'switch':'reduced'} parity`);
        await sleep(1100);assert.equal(await page.evaluate<string>(settled),expected,'OS preference stale callback');
        console.log(`OS preference ${page.name}: ${name} ${switching?'mid-sequence change':'reduced'} exact parity; ${samples} animation samples <=200ms, no travel`);
      }
    }
  }finally{await page.reducedMotion(false);}
}
export async function checkMonthEntry(page:Page,url:string) {
  assert.equal(await reach(page,url,loadStates().early!,80),'ok');
  await page.evaluate(`document.documentElement.dataset.motion='full'`);
  await page.click(...(await centre(page,'.endbtn'))!);await sleep(100);
  const exits=await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].filter(c=>c.getAnimations().some(a=>a.effect?.getKeyframes().some(k=>Number(k.opacity)===0))).length`);
  assert.ok(exits>0,'END TURN first beat must actually animate the remaining hand (including development StrictMode)');
  await page.click(640,350);await waitIdle(page);
  console.log(`month entry ${page.name}: ${exits} remaining cards animate before the stamp; skip settles`);
}
/**
 * The awards collected (round R4, A7) say "New" only the first time they are won: a pass that reaches the awards night
 * starts from none collected, so the night reads the same on every pass.
 */
const freshAwards=(page:Page)=>page.evaluate(`(() => { try { localStorage.removeItem('overexposed.awardsWon'); } catch {} })()`);

export async function checkMonthInput(page:Page,url:string) {
  const states=loadStates();
  const qualifying=qualifyingMonths();
  const ending=states['ending:redemption_arc']!;
  const seasonSteps=states.s02!.steps;
  const gateIndex=seasonSteps.findIndex(s=>s[0]==='gate');
  const fixtures:[string,DeskState,string][]=[
    ['calm',states.early!,'.endbtn'],['frenzy',states.s07b!,'.endbtn'],
    ['single-scandal',qualifying.single,'.endbtn'],['mags-relief',qualifying.relief,'.endbtn'],
    ['copycat-winter',states.celebCrisis!,'.endbtn'],
    ['season',{...states.s02!,steps:seasonSteps.slice(0,gateIndex)},'.gates .take'],
    ['draft',{...states.early!,steps:states.early!.steps.slice(0,-1)},'.draft .take'],
    ['winter-ending',{...ending,steps:ending.steps.slice(0,-1)},'.gates .take'],
  ];
  for(const [name,fixture,selector] of fixtures) {
    if(process.argv.includes('--coverage-only')&&!['single-scandal','mags-relief'].includes(name))continue;
    let expected='';
    for(const mode of ['off','full','reduced','skip-early','skip-late']) {
      await freshAwards(page);
      assert.equal(await reach(page,url,fixture,80),'ok',name);
      await page.evaluate(`document.documentElement.dataset.motion=${JSON.stringify(mode.startsWith('skip')?'full':mode)}`);
      const step=await page.evaluate<string>(`document.querySelector('.desk,[data-presentation]')?.dataset.step??''`);
      const point=await centre(page,selector);assert.ok(point,`${name} missing action`);await page.click(...point);
      if(selector!=='.endbtn')await waitDispatched(page,step);
      if(mode.startsWith('skip')) {await sleep(mode==='skip-early'?80:1200);if(await page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.busy==='1'`))await page.click(640,350);}
      await waitIdle(page);await page.move(10,100);await sleep(200);
      const actual=await page.evaluate<string>(settled);
      if(mode==='off')expected=actual;else assert.equal(actual,expected,`${name} ${mode} final layout differs`);
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('.month-motion,.motion-flight .plane,.motion-writing,.motion-delta,.month-stamp').length`),0,`${name} ${mode} transient remains`);
      if(mode.startsWith('skip')){await sleep(1100);assert.equal(await page.evaluate<string>(settled),expected,`${name} stale callback`);}
      console.log(`month input ${page.name}: ${name} ${mode} exact final parity`);
    }
  }
  if(page.diagnostics.length){mkdirSync('check/out',{recursive:true});const file=`check/out/month-${page.name}-diagnostics.json`;writeFileSync(file,JSON.stringify(page.diagnostics,null,2));console.log(`browser diagnostics: ${page.diagnostics.length} entries preserved in ${file}`);}
}

export async function checkPileInput(page:Page,url:string) {
  const states=loadStates();
  // Each case names a recorded state that holds its cards: a draw, a two-action card, an opportunity, two plays in a row,
  // the biggest hand. A new recording (npm run desk:states) can deal other hands: then name another state that holds them.
  const cases=[['s02',['networking']],['s10',['self_tape']],['card:streaming_role',['streaming_role']],['s02',['side_gig','lay_low']],['bigHand',['@recorded']]] as const;
  for(const [key,cards] of cases) for(const id of cards) assert.ok(states[key]&&(id==='@recorded'||states[key]!.hand.includes(id)),`pile case ${key}: its recorded hand has no ${id}`);
  const selected=process.argv.find(a=>a.startsWith('--pile-case='))?.slice(12);
  assert.ok(!selected||cases.some(([,cards])=>cards.join('+')===selected),`unknown pile case: ${selected}`);
  for(const [key,cards] of cases) {
    if(process.argv.includes('--big-hand-only')&&key!=='bigHand')continue;
    if(selected&&selected!==cards.join('+'))continue;
    let expected='';
    let staticFixture:DeskState|undefined;
    for(const mode of ['off','full','reduced','skip-early','skip-late','switch-reduced']) {
      const fixture=key==='bigHand'?{...states[key]!,steps:states[key]!.steps.slice(0,-1)}:states[key]!;
      assert.equal(await reach(page,url,fixture,80),'ok');
      await page.evaluate(`document.documentElement.dataset.motion=${JSON.stringify(mode.startsWith('skip')||mode.startsWith('switch')?'full':mode)}`);
      if(process.argv.includes('--trace-input'))await page.evaluate(`(()=>{
        window.__pileInput=[];
        for(const type of ['pointerdown','pointerup','click','keydown','keyup'])window.addEventListener(type,e=>{
          const d=document.querySelector('.desk');
          window.__pileInput.push({type,at:performance.now(),key:e.key,x:e.clientX,y:e.clientY,
            card:e.target.closest?.('[data-card]')?.dataset.card,target:e.target.tagName,
            path:e.composedPath().slice(0,5).map(n=>({tag:n.tagName,cls:typeof n.className==='string'?n.className:undefined})),
            step:d?.dataset.step,busy:d?.dataset.busy,beat:d?.dataset.beat});
        },true);
      })()`);
      const before=await page.evaluate<number>(`document.querySelectorAll('[data-pile-uid]').length`);
      const played:Step[]=[];
      for(const id of cards) {
        await waitFan(page);
        const index=id==='@recorded'?states.bigHand!.steps.at(-1)![1]:await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].findIndex(c=>c.dataset.card===${JSON.stringify(id)}&&c.getAttribute('aria-disabled')==='false')`);
        assert.ok(index>=0,`${key} ${id} is not legal`);
        played.push(['play',index]);
        const point=await cardPoint(page,index);assert.ok(point);await page.click(...point);
        if(mode==='skip-late'){
          // Round R1, Part A: once the card is down its tails hold no input: nothing to skip, the next action acts.
          await sleep(1100);
          assert.equal(await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'`),false,`${key} ${cards} skip-late: ${id} still holds input after it was set down`);
        } else if(mode==='skip-early'){
          await sleep(60);
          const busy=await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'`);
          if(!busy){
            const detail=await page.evaluate(`({trace:window.__pileInput??[],desk:{...document.querySelector('.desk').dataset},
              hand:[...document.querySelectorAll('.hand .card')].map(c=>({card:c.dataset.card,uid:c.dataset.uid,legal:c.getAttribute('aria-disabled')})),
              hit:document.elementFromPoint(${point[0]},${point[1]})?.closest('[data-card]')?.getAttribute('data-card')})`);
            mkdirSync('check/out',{recursive:true});const file=`check/out/pile-input-${page.name}-${Date.now()}.json`;
            writeFileSync(file,JSON.stringify({key,cards,mode,id,index,point,detail},null,2));
            assert.fail(`${key} ${cards} ${mode}: ${id} did not remain busy; input/state evidence: ${file}`);
          }
          if(await page.evaluate<boolean>('document.hasFocus()'))await page.key('Space');
          else{console.log(`SKIP pile keyboard ${page.name}: headless focus unavailable; separately using real pointer skip`);await page.click(640,350);}
          await sleep(30);assert.equal(await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'`),false,'skip not consumed');
        }
        if(mode==='switch-reduced'){await sleep(100);await page.evaluate(`document.documentElement.dataset.motion='reduced'`);}
        await waitIdle(page); // Keep the actual pointer over the closing fan through completion.
      }
      await page.move(10,100);await waitTails(page);await sleep(500);
      const actual=await page.evaluate<string>(settled);
      await settledHits(page);
      if(mode==='off')staticFixture={...fixture,steps:[...fixture.steps,...played]};
      if(mode==='off')expected=actual;else assert.equal(actual,expected,`${key} ${cards} ${mode}: pile/desk parity`);
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-pile-uid]').length`),before+cards.length,'played face missing or duplicated');
      if(key==='bigHand')assert.equal(await page.evaluate<number>(`document.querySelectorAll('.hand .card').length`),states.bigHand!.hand.length,'recorded large hand not restored');
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('.motion-flight .plane,.motion-writing,.motion-delta').length`),0,'transient remains');
      if(mode.startsWith('skip')||mode.startsWith('switch')){await sleep(1100);assert.equal(await page.evaluate<string>(settled),expected,'stale play callback');}
      console.log(`pile input ${page.name}: ${key} ${cards.join('+')} ${mode} exact final parity`);
    }
    assert.ok(staticFixture);assert.equal(await reach(page,url,staticFixture,500),'ok');
    assert.equal(await page.evaluate<string>(settled),expected,`${key}: static history replay parity`);
    await settledHits(page);
    console.log(`pile input ${page.name}: ${key} static replay parity; all settled modes preserve real control hit points`);
  }
}

export async function checkBoundaryInput(page:Page,url:string) {
  const states=loadStates(),s=states.s02!,gate=s.steps.findIndex(x=>x[0]==='gate');
  const winter=states['ending:redemption_arc']!;
  const cases:[string,DeskState,string,string][]=[
    ['flip',states.s07b!,'.endbtn','scandalFlip'],['carry',states.s07b!,'.endbtn','scandalCarry'],['sweep',states.s07b!,'.endbtn','sweep'],
    ['season',{...s,steps:s.steps.slice(0,gate)},'.gates .take','season'],
    ['after-season-publication',{...s,steps:s.steps.slice(0,gate)},'.gates .take','publish'],
    ['deal',{...states.early!,steps:states.early!.steps.slice(0,-1)},'.draft .take','deal'],
    ['winter-publication',{...winter,steps:winter.steps.slice(0,-1)},'.gates .take','publish'],
  ];
  const fresh=()=>freshAwards(page);
  for(const [name,fixture,selector,beat] of cases){
    const selected=process.argv.find(a=>a.startsWith('--boundary='))?.slice(11);if(selected&&name!==selected)continue;
    await fresh();
    assert.equal(await reach(page,url,fixture,80),'ok');
    await page.click(...(await centre(page,selector))!);await waitIdle(page);await page.move(10,100);await sleep(150);const expected=await page.evaluate<string>(settled);
    for(const input of ['click','Enter','Space']){
      await fresh();
      assert.equal(await reach(page,url,fixture,80),'ok');
      if(input!=='click'&&!await page.evaluate<boolean>('document.hasFocus()')){console.log(`SKIP ${name} ${input} ${page.name}: headless keyboard focus`);continue;}
      await page.evaluate(`document.documentElement.dataset.motion='full'`);await page.click(...(await centre(page,selector))!);
      const start=Date.now();
      while(!await page.evaluate<boolean>(`document.querySelector('.desk,[data-presentation]')?.dataset.beat===${JSON.stringify(beat)}`)){
        assert.ok(Date.now()-start<45000,`${name}: did not observe ${beat}`);await sleep(15);
      }
      if(input==='click')await page.click(...(name==='winter-publication'?(await centre(page,'.play-again'))!:[640,350] as [number,number]));else await page.key(input as 'Enter'|'Space');
      await sleep(40);assert.equal(await page.evaluate<boolean>(`document.querySelector('.desk,[data-presentation]')?.dataset.busy==='1'`),false,`${name}: input failed to skip`);
      // The month's messages are the desk's tails after the deal (round R3, C1): they come once it is still, so wait for them.
      await page.move(10,100);await sleep(180);await waitIdle(page);assert.equal(await page.evaluate<string>(settled),expected,`${name} ${input}: skip also chose/played`);
      await sleep(1600);assert.equal(await page.evaluate<string>(settled),expected,`${name} ${input}: stale callback`);
      console.log(`boundary input ${page.name}: ${name} ${input} exact final parity, no stale callbacks`);
    }
  }
  // The month's messages (round R3, C1): no step's beat any more but the desk's tails, once its hand is dealt. They
  // hold no input, and the phone lights as each comes, never a whole-phone filter. Round R7, A4: once the first has
  // come, the rest keep their pace whatever the player does — the author's case: four bubbles, a card played 0.3 s
  // after the desk is still; they come one at a time, about 0.38 s apart. Round R8a, C2: on every frame the lock
  // screen's manager bars are the bubbles on screen.
  const only=process.argv.find(a=>a.startsWith('--boundary='))?.slice(11);
  if(!only||only==='arrival'){
    const fixture=bubbleMonth();
    assert.equal(await reach(page,url,fixture,80),'ok');
    await page.evaluate(`document.documentElement.dataset.motion='full'`);
    const step=await page.evaluate<string>(`document.querySelector('.desk').dataset.step`);
    // Every change of the bubbles shown and of the desk's input hold, frame by frame, from END TURN on.
    // Each entry: the time, the bubbles shown, the desk's hold, its step, the lock screen's manager and press bars.
    await page.evaluate(`(()=>{window.__bub=[];const tick=()=>{const d=document.querySelector('.desk');const n=d?d.querySelectorAll('.bubbles .bub[data-k]').length:-1;const busy=d?.dataset.busy;const step=d?.dataset.step;const mgr=d?d.querySelectorAll('.phone .nt.mgr').length:-1;const press=d?d.querySelectorAll('.phone .nt.press').length:-1;const last=window.__bub.at(-1);if(!last||last[1]!==n||last[2]!==busy||last[3]!==step||last[4]!==mgr||last[5]!==press)window.__bub.push([performance.now(),n,busy,step,mgr,press]);if(window.__bub.length<400)requestAnimationFrame(tick);};requestAnimationFrame(tick);})()`);
    await page.click(...(await centre(page,'.endbtn'))!);
    let start=Date.now();
    while(!await page.evaluate<boolean>(`(()=>{const d=document.querySelector('.desk');return !!d&&d.dataset.busy!=='1'&&d.dataset.step!==${JSON.stringify(step)}})()`)){
      assert.ok(Date.now()-start<15000,'arrival: the month never opened');await sleep(10);
    }
    const stillAt=Date.now();
    while(!await page.evaluate<boolean>(`!!document.querySelector('.desk .bubbles .bub[data-k]')`)){
      assert.ok(Date.now()-stillAt<3000,'arrival: no message came once the hand was dealt');await sleep(10);
    }
    const pulse=`document.querySelector('.phone .phone-screen').getAnimations().some(a=>a.effect.getTiming().duration===450&&a.effect.getKeyframes().some(k=>k.boxShadow))`;
    const phone=await page.evaluate<{filter:string;screenPulse:boolean}>(`({filter:getComputedStyle(document.querySelector('.phone')).filter,screenPulse:${pulse}})`);
    assert.equal(phone.filter,'none','arrival must not filter the whole transformed phone');
    assert.equal(phone.screenPulse,true,'arrival must retain the screen light response');
    await sleep(Math.max(0,300-(Date.now()-stillAt)));
    const opened=await page.evaluate<string>(`document.querySelector('.desk').dataset.step`);
    const index=await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].findIndex(c=>c.getAttribute('aria-disabled')==='false')`);
    assert.ok(index>=0,'arrival: no legal card to play');
    await page.click(...(await cardPoint(page,index))!);
    await sleep(40);
    const acted=await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'||document.querySelector('.desk').dataset.step!==${JSON.stringify(opened)}`);
    assert.equal(acted,true,'arrival: the play did not act at once');
    start=Date.now();
    while(await page.evaluate<boolean>(`!!document.querySelector('.bubbles[data-revealing]')`)){
      assert.ok(Date.now()-start<6000,'arrival: the messages never all came');await sleep(30);
    }
    await sleep(100);
    const trace=await page.evaluate<[number,number,string,string,number,number][]>('window.__bub');
    // From the frame the new month's desk was still: each bubble's arrival, one at a time.
    const still=trace.findIndex((e,i)=>i>0&&e[2]==='0'&&trace.slice(0,i).some(x=>x[2]==='1'));
    assert.ok(still>0,'arrival: no still desk after END TURN in the trace');
    const comes:number[]=[];let shown=trace[still]![1];
    for(const [at,n] of trace.slice(still)){
      if(n>shown){assert.equal(n-shown,1,`arrival: ${n-shown} bubbles came in one frame`);comes.push(at);}
      shown=Math.max(shown,n);
    }
    assert.equal(shown,4,`arrival: ${shown} bubbles shown, expected the month's four`);
    const gaps=comes.slice(1).map((t,i)=>t-comes[i]!);
    for(const g of gaps)assert.ok(g>300&&g<520,`arrival: bubbles ${gaps.map(Math.round).join(', ')} ms apart, expected about 380`);
    console.log(`boundary input ${page.name}: arrival holds no input; with a card played 0.3 s after the desk was still, the four bubbles came one at a time, ${gaps.map(Math.round).join(', ')} ms apart`);
    // The phone's bars (round R8a, C2): a manager bar for each bubble on screen, on every frame from END TURN on.
    for(const [at,n,,,mgr] of trace)assert.equal(mgr,Math.min(n,7),`arrival: ${mgr} manager bars beside ${n} bubbles at ${Math.round(at)} ms`);
    console.log(`boundary input ${page.name}: arrival — a manager bar for each bubble on screen, on all ${trace.length} changes from END TURN on`);
  }
  // The phone's bars in a frenzy (round R8a, C2): a month whose press bars stand from its start; the draft pick deals
  // its hand and its four bubbles come. On every frame the manager bars are the bubbles on screen, each arriving with
  // its bubble, and the press bars, below them, never change.
  if(!only||only==='bars'){
    const {fixture,name,card,press}=frenzyBubbleMonth();
    assert.equal(await reach(page,url,fixture,80),'ok');
    await page.evaluate(`document.documentElement.dataset.motion='full'`);
    await page.evaluate(`(()=>{window.__bars=[];const tick=()=>{const d=document.querySelector('.desk');const n=d?d.querySelectorAll('.bubbles .bub[data-k]').length:-1;const mgr=d?d.querySelectorAll('.phone .nt.mgr').length:-1;const p=d?d.querySelectorAll('.phone .nt.press').length:-1;const last=window.__bars.at(-1);if(!last||last[1]!==n||last[2]!==mgr||last[3]!==p)window.__bars.push([performance.now(),n,mgr,p]);if(window.__bars.length<400)requestAnimationFrame(tick);};requestAnimationFrame(tick);})()`);
    await page.click(...(await centre(page,`.offers .lift.take[data-card="${card}"]`))!);
    const start=Date.now();
    while(!await page.evaluate<boolean>(`document.querySelectorAll('.desk .bubbles .bub[data-k]').length===4&&!document.querySelector('.bubbles[data-revealing]')`)){
      assert.ok(Date.now()-start<10000,'bars: the four bubbles never all came');await sleep(30);
    }
    await sleep(100);
    const trace=await page.evaluate<[number,number,number,number][]>('window.__bars');
    for(const [at,n,mgr] of trace)assert.equal(mgr,Math.min(n,7),`bars: ${mgr} manager bars beside ${n} bubbles at ${Math.round(at)} ms`);
    // The press bars come with the month's frenzy look, as the hand is dealt (the desk shows the month's own issue from
    // then on), before its first bubble; from then on they never change.
    const up=trace.findIndex(e=>e[3]===press),first=trace.findIndex(e=>e[1]>0);
    assert.ok(up>=0&&first>=0&&up<=first,`bars: the press bars came at change ${up}, the first bubble at ${first}`);
    assert.ok(trace.slice(up).every(e=>e[3]===press),`bars: the press bars went ${trace.slice(up).map(e=>e[3]).join(', ')}, expected ${press} throughout`);
    const shown=trace.slice(up).map(e=>`${e[1]}: ${e[2]}+${e[3]}`);
    console.log(`boundary input ${page.name}: the lock screen in a frenzy month (${name}, after its draft pick) — bubbles: manager + press bars on each change: ${shown.join(' · ')}`);
  }
}
