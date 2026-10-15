// Production only; correctness audits must be stopped. Keep active and idle samples separate.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { preview } from 'vite';
import { launch, type BrowserName } from '../check/browser.ts';
import { cardPoint, centre, loadStates, reach, ROOT, type DeskState } from '../check/desk-replay.ts';
import { longestQuietPlay } from './motion-cases.ts';
const arg=(name:string)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const root=resolve(arg('root')??ROOT),name=arg('name')??'de-active';
const out=join(ROOT,'docs/handoff/v1b-compare');mkdirSync(out,{recursive:true});
const server=await preview({root,logLevel:'error',preview:{port:4175,strictPort:false}});
const url=server.resolvedUrls!.local[0]!,states=loadStates(),rows:unknown[]=[];
const runStartedAt=new Date().toISOString();
const firefoxHeaded=process.env.OVEREXPOSED_FIREFOX_HEADED==='1';
const rendererEvidence:unknown[]=[];
const end=states['ending:redemption_arc']!,season=states.s02!,gate=season.steps.findIndex(s=>s[0]==='gate');
const longest=longestQuietPlay(),profiling=process.argv.includes('--profile');
const diagnosticBackdropOff=process.argv.includes('--without-backdrop');
const diagnosticPromoteCards=process.argv.includes('--promote-cards');
// Controlled CSS probes only; never count these altered presentations as acceptance.
const paintProbes:Record<string,string>={
 'compact-planes':'.desk .scene3d .plane{width:0!important;height:0!important}',
 'ambient-layer':'.desk .up,.desk .bulb.flicker{will-change:transform}',
 'no-blend':'.desk .lightpool{mix-blend-mode:normal!important}',
 'no-ambient':'.desk .metro,.desk .steam,.desk .bulb.flicker{visibility:hidden!important}',
 'flat-presentation':'.desk .scene3d,.desk .deskscene{perspective:none!important}.desk .plane,.desk .desktop{transform:none!important}',
 'no-grain':'.desk .pp{background-image:radial-gradient(ellipse at 50% 42%,rgba(255,252,242,.55) 0%,rgba(0,0,0,0) 58%,rgba(125,100,62,.18) 100%)!important}',
};
const diagnosticPaintProbe=arg('paint-probe')??null;
if(diagnosticPaintProbe&&!paintProbes[diagnosticPaintProbe])throw Error(`unknown paint probe ${diagnosticPaintProbe}`);
const scenarios:[string,DeskState,string][]=[['loud',states.s02!,'.hand .card[data-card="open_mic"]'],['quiet',states.s02!,'.hand .card[data-card="lay_low"]'],['calm-end',states.early!,'.endbtn'],['frenzy-end',states.s07b!,'.endbtn'],['copycat-end',states.celebCrisis!,'.endbtn'],['season',{...season,steps:season.steps.slice(0,gate)},'.gates .take'],['winter-ending',{...end,steps:end.steps.slice(0,-1)},'.gates .take']];
scenarios.push(['quiet-longest-recorded',longest.fixture,longest.selector]);
// Retain the exact A-C timing fixtures to investigate the reported 83.34/124.9ms outliers.
scenarios.push(['reviewed-calm-end',states.s02!,'.endbtn'],['reviewed-frenzy-end',states.s09!,'.endbtn']);
console.log(`Longest quiet line in fixed replay corpus: ${longest.key}, ${longest.writingMs}ms handwriting, ${longest.corpus}`);
try {
 for(const browser of (arg('browsers')??'chrome,firefox,webkit').split(',') as BrowserName[]) for(const rate of browser==='chrome'?(arg('rates')??'1,4').split(',').map(Number):[1]){
  const page=await launch(browser,{width:1280,height:720});
  try {
   if(browser==='firefox'&&firefoxHeaded){
    await page.navigate('about:support',1000);
    const renderer=await page.evaluate<{compositing:string;decisions:string}>(`({compositing:[...document.querySelectorAll('#graphics-features-tbody tr')].find(tr=>tr.innerText.startsWith('Compositing'))?.innerText??'',decisions:document.getElementById('graphics-decisions-tbody')?.innerText??''})`,5000);
    rendererEvidence.push({browser,at:new Date().toISOString(),...renderer});
    writeFileSync(join(out,`${name}.json`),JSON.stringify({root,firefoxHeaded,rendererEvidence,rows},null,2)+'\n');
    if(!renderer.compositing||/Software|Basic/i.test(renderer.compositing))throw Error(`Headed Firefox hardware compositing is not established: ${renderer.compositing}; diagnostic saved, no hardware performance pass`);
    console.log(`Headed Firefox compositor: ${renderer.compositing}`);
   }
   await page.throttle(rate);
   for(const [label,fixture,selector] of scenarios){
    if(arg('case')&&!arg('case')!.split(',').includes(label))continue;
    const caseStartedAt=new Date().toISOString();
    if(await reach(page,url,fixture)!=='ok')throw Error(`cannot reach ${label}`);
    const visibilityBefore=await page.evaluate<{state:string;focused:boolean}>(`({state:document.visibilityState,focused:document.hasFocus()})`);
    if(browser==='firefox'&&firefoxHeaded&&visibilityBefore.state!=='visible')throw Error(`Headed timing needs a visible document: ${label}`);
    if(diagnosticBackdropOff)await page.evaluate(`(()=>{const style=document.createElement('style');style.textContent='.screen-over > .screen-scrim{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';document.head.appendChild(style)})()`);
    if(diagnosticPromoteCards){await page.evaluate(`(()=>{const style=document.createElement('style');style.textContent='.desk .hand .card{will-change:transform}';document.head.appendChild(style)})()`);await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');}
    if(diagnosticPaintProbe)await page.evaluate(`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(paintProbes[diagnosticPaintProbe])};document.head.appendChild(style)})()`);
    const point=selector.includes('.card')?await cardPoint(page,await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].indexOf(document.querySelector(${JSON.stringify(selector)}))`)):await centre(page,selector);
    if(!point)throw Error(`missing ${label}`);
    await page.evaluate(`(()=>{
      document.documentElement.dataset.motion='full';
      const p=window.__perf={done:false,start:0,startWall:0,last:null,firstFrameMs:null,active:[],idle:[],beats:[],slowFrames:[],longTasks:[],landing:null,settled:null,seenFlight:false,visibilityChanges:[]};
      document.addEventListener('visibilitychange',()=>{if(p.start)p.visibilityChanges.push({at:performance.now()-p.start,state:document.visibilityState})});
      if(PerformanceObserver.supportedEntryTypes.includes('longtask')){p.observer=new PerformanceObserver(list=>{for(const e of list.getEntries())if(p.start&&e.startTime>=p.start)p.longTasks.push({at:e.startTime-p.start,duration:e.duration})});p.observer.observe({type:'longtask'});}
      const before=document.querySelector('.desk,[data-presentation]')?.dataset.step;
      document.addEventListener('pointerdown',()=>{
        p.start=performance.now();p.startWall=Date.now();let previous='';
        const tick=t=>{
          const desk=document.querySelector('.desk,[data-presentation]'),busy=desk?.dataset.busy==='1',beat=desk?.dataset.beat??(busy?'busy':'idle');
          const changed=!desk||desk.dataset.step!==before;
          const flight=!!document.querySelector('.motion-flight .plane');if(flight)p.seenFlight=true;
          if(p.seenFlight&&!flight&&p.landing===null)p.landing=t-p.start;
          if(beat!==previous){p.beats.push({at:t-p.start,beat});previous=beat;}
          if(p.firstFrameMs===null)p.firstFrameMs=t-p.start;
          if(p.settled===null){if(p.last!==null){p.active.push(t-p.last);if(t-p.last>33.4)p.slowFrames.push({at:t-p.start,beat,ms:t-p.last});}if(changed&&!busy)p.settled=t-p.start;}else if(p.last!==null)p.idle.push(t-p.last);
          p.last=t;
          if(p.settled!==null&&t-p.start-p.settled>=1500){p.observer?.disconnect();p.done=true;}
          else if(t-p.start>60000){p.error='60s deadline';p.done=true;}else requestAnimationFrame(tick);
        };requestAnimationFrame(tick);
      },{once:true,capture:true});
    })()`);
    if(profiling){if(!page.profileStart)throw Error('CPU profiling only supported in Chromium');await page.profileStart();}
    await page.click(...point); // Real pointer; it stays above the fan until the sequence finishes.
    await page.evaluate(`new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{if(window.__perf.done)return resolve(true);if(performance.now()-start>65000)return reject(Error('measurement deadline'));setTimeout(poll,50)};poll()})`,70000);
    if(profiling){mkdirSync(join(ROOT,'.npm-cache/profiles'),{recursive:true});writeFileSync(join(ROOT,`.npm-cache/profiles/${name}-${browser}-${rate}-${label}.cpuprofile`),JSON.stringify(await page.profileStop!()));}
    const result=await page.evaluate<Record<string,unknown>>(`(()=>{const p=window.__perf;const stats=a=>{const x=[...a].sort((a,b)=>a-b),q=k=>x[Math.min(x.length-1,Math.floor(x.length*k))]??null;return {frames:x.length,p50:q(.5),p95:q(.95),max:q(1),over33:x.filter(v=>v>33.4).length}};return {inputAt:new Date(p.startWall).toISOString(),firstFrameMs:p.firstFrameMs,landingMs:p.landing,totalBusyMs:p.settled,active:stats(p.active),idleObservationMs:1500,idle:stats(p.idle),beats:p.beats,slowFrames:p.slowFrames,longTasks:p.longTasks,visibilityChanges:p.visibilityChanges,error:p.error??null}})()`);
    const visibilityAfter=await page.evaluate<{state:string;focused:boolean}>(`({state:document.visibilityState,focused:document.hasFocus()})`);
    const row={browser,rate,label,launchMode:browser==='firefox'&&firefoxHeaded?'headed':'headless',visibilityBefore,visibilityAfter,runStartedAt,caseStartedAt,caseFinishedAt:new Date().toISOString(),...result};rows.push(row);console.log(JSON.stringify(row));
    if(browser==='firefox'&&firefoxHeaded&&(visibilityAfter.state!=='visible'||(result.visibilityChanges as {state:string}[]).some(v=>v.state!=='visible'))){
      writeFileSync(join(out,`${name}.json`),JSON.stringify({root,firefoxHeaded,rendererEvidence,rows,error:'headed document became hidden'},null,2)+'\n');
      throw Error(`Headed document became hidden during ${label}; no hardware performance pass`);
    }
    if(result.error)throw Error(String(result.error));
    writeFileSync(join(out,`${name}.json`),JSON.stringify({root,firefoxHeaded,rendererEvidence,profiling,diagnosticBackdropOff,diagnosticPromoteCards,diagnosticPaintProbe,longest,rows},null,2)+'\n');
   }
  }finally{await page.close();}
 }
 rows.push({browser:'firefox',rate:4,capabilitySkip:'BiDi has no CPU throttling; no substitute labelled 4x.'});
 writeFileSync(join(out,`${name}.json`),JSON.stringify({root,firefoxHeaded,rendererEvidence,profiling,diagnosticBackdropOff,diagnosticPromoteCards,diagnosticPaintProbe,longest,rows},null,2)+'\n');
}finally{await new Promise<void>(r=>server.httpServer.close(()=>r()));}
