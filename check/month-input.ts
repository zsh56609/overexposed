import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from './browser.ts';
import { cardPoint, centre, loadStates, reach, type DeskState } from './desk-replay.ts';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const settled=`JSON.stringify({step:document.querySelector('.desk')?.dataset.step,hand:[...document.querySelectorAll('.hand .card')].map(c=>[c.dataset.uid,c.dataset.card,c.textContent,getComputedStyle(c).visibility]),pile:[...document.querySelectorAll('[data-pile-uid]')].map(c=>[c.dataset.pileUid,c.dataset.pileCard,c.textContent,getComputedStyle(c).visibility,c.style.transform,c.firstElementChild.style.transform]),paper:[...document.querySelectorAll('.pp')].map(c=>c.textContent),note:document.querySelector('.nb-txt')?.textContent,stats:document.querySelector('.stats')?.textContent,bulbs:[...document.querySelectorAll('.slotbulbs i')].map(c=>c.className),bubbles:[...document.querySelectorAll('.bub[data-k]')].map(c=>[c.dataset.k,c.textContent]),phone:[...document.querySelectorAll('.nt')].map(c=>c.className),choice:document.querySelector('.screen-over,.plain.full')?.textContent})`;
async function waitIdle(page:Page) {
  const start=Date.now();while(await page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.busy==='1'`)){
    assert.ok(Date.now()-start<45000,`month stalled: ${await page.evaluate('document.querySelector(".desk")?.dataset.beat')}`);await sleep(35);
  }
}
export async function checkMonthInput(page:Page,url:string) {
  const states=loadStates();
  const ending=states['ending:redemption_arc']!;
  const seasonSteps=states.s02!.steps;
  const gateIndex=seasonSteps.findIndex(s=>s[0]==='gate');
  const fixtures:[string,DeskState,string][]=[
    ['calm',states.early!,'.endbtn'],['frenzy',states.s07b!,'.endbtn'],
    ['copycat-winter',states.celebCrisis!,'.endbtn'],
    ['season',{...states.s02!,steps:seasonSteps.slice(0,gateIndex)},'.gates .take'],
    ['draft',{...states.early!,steps:states.early!.steps.slice(0,-1)},'.draft .take'],
    ['winter-ending',{...ending,steps:ending.steps.slice(0,-1)},'.gates .take'],
  ];
  for(const [name,fixture,selector] of fixtures) {
    let expected='';
    for(const mode of ['off','full','reduced','skip-early','skip-late']) {
      assert.equal(await reach(page,url,fixture,80),'ok',name);
      await page.evaluate(`document.documentElement.dataset.motion=${JSON.stringify(mode.startsWith('skip')?'full':mode)}`);
      const point=await centre(page,selector);assert.ok(point,`${name} missing action`);await page.click(...point);
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
  for(const [key,cards] of [['s02',['networking']],['card:self_tape',['self_tape']],['s02',['streaming_role']],['s02',['open_mic','lay_low']],['bigHand',['@recorded']]] as const) {
    if(process.argv.includes('--big-hand-only')&&key!=='bigHand')continue;
    let expected='';
    for(const mode of ['off','full','reduced','skip-early','skip-late','switch-reduced']) {
      const fixture=key==='bigHand'?{...states[key]!,steps:states[key]!.steps.slice(0,-1)}:states[key]!;
      assert.equal(await reach(page,url,fixture,80),'ok');
      await page.evaluate(`document.documentElement.dataset.motion=${JSON.stringify(mode.startsWith('skip')||mode.startsWith('switch')?'full':mode)}`);
      const before=await page.evaluate<number>(`document.querySelectorAll('[data-pile-uid]').length`);
      for(const id of cards) {
        const index=id==='@recorded'?states.bigHand!.steps.at(-1)![1]:await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].findIndex(c=>c.dataset.card===${JSON.stringify(id)}&&c.getAttribute('aria-disabled')==='false')`);
        assert.ok(index>=0,`${key} ${id} is not legal`);
        const point=await cardPoint(page,index);assert.ok(point);await page.click(...point);
        if(mode.startsWith('skip')){await sleep(mode==='skip-early'?60:1100);assert.ok(await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'`));if(await page.evaluate<boolean>('document.hasFocus()'))await page.key('Space');else{console.log(`SKIP pile keyboard ${page.name}: headless focus unavailable; separately using real pointer skip`);await page.click(640,350);}await sleep(30);assert.equal(await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'`),false,'skip not consumed');}
        if(mode==='switch-reduced'){await sleep(100);await page.evaluate(`document.documentElement.dataset.motion='reduced'`);}
        await waitIdle(page); // Keep the actual pointer over the closing fan through completion.
      }
      await page.move(10,100);await sleep(500);
      const actual=await page.evaluate<string>(settled);
      if(mode==='off')expected=actual;else assert.equal(actual,expected,`${key} ${cards} ${mode}: pile/desk parity`);
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-pile-uid]').length`),before+cards.length,'played face missing or duplicated');
      if(key==='bigHand')assert.equal(await page.evaluate<number>(`document.querySelectorAll('.hand .card').length`),states.bigHand!.hand.length,'recorded large hand not restored');
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('.motion-flight .plane,.motion-writing,.motion-delta').length`),0,'transient remains');
      if(mode.startsWith('skip')||mode.startsWith('switch')){await sleep(1100);assert.equal(await page.evaluate<string>(settled),expected,'stale play callback');}
      console.log(`pile input ${page.name}: ${key} ${cards.join('+')} ${mode} exact final parity`);
    }
  }
}

export async function checkBoundaryInput(page:Page,url:string) {
  const states=loadStates(),s=states.s02!,gate=s.steps.findIndex(x=>x[0]==='gate');
  const cases:[string,DeskState,string,string][]=[
    ['flip',states.s07b!,'.endbtn','scandalFlip'],['carry',states.s07b!,'.endbtn','scandalCarry'],['sweep',states.s07b!,'.endbtn','sweep'],
    ['season',{...s,steps:s.steps.slice(0,gate)},'.gates .take','season'],
    ['after-season-publication',{...s,steps:s.steps.slice(0,gate)},'.gates .take','publish'],
    ['deal',{...states.early!,steps:states.early!.steps.slice(0,-1)},'.draft .take','deal'],
    ['arrival',states.s07b!,'.endbtn','message'],
  ];
  for(const [name,fixture,selector,beat] of cases){
    const selected=process.argv.find(a=>a.startsWith('--boundary='))?.slice(11);if(selected&&name!==selected)continue;
    assert.equal(await reach(page,url,fixture,80),'ok');
    await page.click(...(await centre(page,selector))!);await waitIdle(page);await page.move(10,100);await sleep(150);const expected=await page.evaluate<string>(settled);
    for(const input of ['click','Enter','Space']){
      assert.equal(await reach(page,url,fixture,80),'ok');
      if(input!=='click'&&!await page.evaluate<boolean>('document.hasFocus()')){console.log(`SKIP ${name} ${input} ${page.name}: headless keyboard focus`);continue;}
      await page.evaluate(`document.documentElement.dataset.motion='full'`);await page.click(...(await centre(page,selector))!);
      const start=Date.now();
      while(!await page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.beat===${JSON.stringify(beat)}`)){
        assert.ok(Date.now()-start<45000,`${name}: did not observe ${beat}`);await sleep(15);
      }
      if(input==='click')await page.click(640,350);else await page.key(input as 'Enter'|'Space');
      await sleep(40);assert.equal(await page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.busy==='1'`),false,`${name}: input failed to skip`);
      await page.move(10,100);await sleep(180);assert.equal(await page.evaluate<string>(settled),expected,`${name} ${input}: skip also chose/played`);
      await sleep(1600);assert.equal(await page.evaluate<string>(settled),expected,`${name} ${input}: stale callback`);
      console.log(`boundary input ${page.name}: ${name} ${input} exact final parity, no stale callbacks`);
    }
  }
}
