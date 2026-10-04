// Continuous WebKit video, then ordered frames decoded from that recording (not delayed screenshots).
import { webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { PLAY_STEPS, loadStates, ROOT, type DeskState } from '../check/desk-replay.ts';
const revision=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim();
try{execFileSync('git',['diff','--quiet','HEAD','--','ui','i18n','core','content']);}catch{throw Error('Commit game source before recording so the video names identify its actual source.');}
const recordings=resolve(process.argv.find(a=>a.startsWith('--out='))?.slice(6)??`.npm-cache/v1b-recordings-${revision}`);
const evidence=join(ROOT,'docs/handoff/v1b-compare/continuous');mkdirSync(recordings,{recursive:true});mkdirSync(evidence,{recursive:true});
const ffmpeg=join(ROOT,'.npm-cache/pw-browsers/ffmpeg-1011/ffmpeg-win64.exe');
const server=await createServer({root:ROOT,logLevel:'error',server:{port:5199,strictPort:false}});await server.listen();
const url=server.resolvedUrls!.local[0]!,states=loadStates();
const s=states.s02!,gate=s.steps.findIndex(x=>x[0]==='gate'),ending=states['ending:redemption_arc']!;
const fixtures:Record<string,{state:DeskState;selector:string}>={
 loud:{state:s,selector:'.hand .card[data-card="open_mic"]'},quiet:{state:s,selector:'.hand .card[data-card="lay_low"]'},
 calm:{state:states.early!,selector:'.endbtn'},frenzy:{state:states.s07b!,selector:'.endbtn'},
 season:{state:{...s,steps:s.steps.slice(0,gate)},selector:'.gates .take'},
 winter:{state:{...ending,steps:ending.steps.slice(0,-1)},selector:'.gates .take'},
};
const manifest:unknown[]=[];
const browser=await webkit.launch({headless:true});
try {
 for(const [label,fixture] of Object.entries(fixtures)) for(const source of label==='winter'||label==='calm'?['game']:['reference','game']){
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:recordings,size:{width:1280,height:720}}});
  const page=await context.newPage();const diagnostics:string[]=[];page.on('pageerror',e=>diagnostics.push(String(e)));page.on('console',m=>{if(m.type()==='error')diagnostics.push(m.text());});
  let selector=fixture.selector;
  if(source==='game'){
    await page.goto(`${url}?seed=${fixture.state.seed}`);await page.waitForSelector('button.big');
    if(await page.evaluate(PLAY_STEPS(fixture.state.steps))!=='ok')throw Error(`replay ${label}`);
    await page.evaluate(`document.documentElement.dataset.motion='full'`);
  }else{
    await page.goto(`${url}docs/design/visual/mockups/vanity.html`);
    const fonts=readFileSync(join(ROOT,'ui/desk/fonts.css'),'utf8').replaceAll('../fonts/','/ui/fonts/');
    await page.evaluate(`(()=>{document.querySelectorAll('link').forEach(x=>x.remove());const css=document.createElement('style');css.textContent=${JSON.stringify(fonts+'\n.ctl{display:none!important}#stage{transform:none!important}.viewport{height:720px!important}')};document.head.appendChild(css);Object.assign(st,{f:'rising',c:${JSON.stringify(label==='frenzy'?'crisis':'calm')},l:'music',s:${JSON.stringify(label==='season'?'spring':'summer')},view:null});${label==='season'?'MONTH_OVERRIDE=3;':''}render()})()`);
    if(label==='loud'||label==='quiet')selector=await page.evaluate(`(()=>{const i=HANDS.music.findIndex(k=>(PLAY[k.n]||['quiet'])[0]${label==='quiet'?'===':'!=='}'quiet');return '#hand .card:nth-child('+(i+1)+')'})()`);
    else selector='.endbtn';
  }
  await page.evaluate('document.fonts.ready');await page.waitForTimeout(400);
  const point=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('target missing');if(el.classList.contains('card')){const p=document.createElement('i');p.style.cssText='position:absolute;left:40px;top:120px;width:1px;height:1px;pointer-events:none';el.appendChild(p);const r=p.getBoundingClientRect();p.remove();return [r.x,r.y]}const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`) as [number,number];
  await page.evaluate(`(()=>{const clock=document.createElement('div');clock.id='record-clock';clock.style.cssText='position:fixed;left:8px;top:54px;background:#000;color:#fff;z-index:2147483647;font:12px monospace;padding:4px;pointer-events:none';document.body.appendChild(clock);document.addEventListener('pointerdown',()=>{window.__recordStart=performance.now();const frame=()=>{clock.textContent=Math.round(performance.now()-window.__recordStart)+'ms | '+(document.querySelector('.desk')?.dataset.beat??${JSON.stringify(source)});window.__recordRaf=requestAnimationFrame(frame)};frame()},{once:true,capture:true})})()`);
  await page.mouse.click(...point); // Do not move the pointer away.
  if(source==='game')await page.waitForFunction(`document.querySelector('.desk,[data-presentation]')?.dataset.busy!=='1'`,undefined,{timeout:60000});
  else await page.waitForFunction(`performance.now()-window.__recordStart>1000&&!busy&&!document.querySelector('#fly3d .plane')&&${label==='frenzy'||label==='season'?"!document.querySelector('#bubbles .bw:not(.done)')&&":''}document.getAnimations().every(a=>a.playState==='finished'||a.effect?.getTiming().iterations===Infinity)`,undefined,{timeout:30000});
  await page.waitForTimeout(1500);
  const elapsed=await page.evaluate<number>('performance.now()-window.__recordStart');
  const video=page.video()!;await context.close();const videoPath=join(recordings,`${label}-${source}.webm`);await video.saveAs(videoPath);
  const frames=join(recordings,`${label}-${source}-frames`);mkdirSync(frames,{recursive:true});
  execFileSync(ffmpeg,['-y','-i',videoPath,'-vf','fps=4','-q:v','4',join(frames,'frame-%04d.jpg')],{stdio:'ignore'});
  const all=readdirSync(frames).filter(f=>f.endsWith('.jpg')).sort();
  const start=Math.max(0,all.length-Math.ceil(elapsed/250)-4),n=all.length-start;
  const chosen=[...new Set(Array.from({length:Math.min(16,n)},(_,i)=>start+Math.round(i*(n-1)/Math.max(1,Math.min(16,n)-1))))];
  const selected=chosen.map(i=>{const file=`${label}-${source}-${all[i]}`;copyFileSync(join(frames,all[i]!),join(evidence,file));return {file,videoPtsSeconds:i/4};});
  manifest.push({label,source,revision,videoPath,elapsedAfterPointerMs:elapsed,selected,diagnostics});
  writeFileSync(join(evidence,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`${label} ${source}: ${Math.round(elapsed)}ms, ${all.length} decoded frames; ${videoPath}`);
 }
 writeFileSync(join(evidence,'index.html'),`<!doctype html><meta charset="utf-8"><title>V1b continuous recordings</title><style>body{background:#15120e;color:#ede6d6;font:15px system-ui;margin:24px}section{display:flex;overflow:auto;gap:8px}figure{margin:0;min-width:480px}img{width:480px}</style><h1>Continuous motion · ${revision}</h1><p>Headless WebKit recordings. Each sequence is one continuous recording; frames below are decoded in order. Burned-in milliseconds come from the real pointer event and animation frames. Video PTS is relative to recording start, including replay. The pointer stays still after play. Headless WebKit is not real Safari/iPad acceptance. Full recording paths and diagnostics: manifest.json.</p>`+(manifest as {label:string;source:string;selected:{file:string;videoPtsSeconds:number}[]}[]).map(row=>`<h2>${row.label} · ${row.source}</h2><section>${row.selected.map(f=>`<figure><img src="${f.file}"><figcaption>Video PTS ${f.videoPtsSeconds.toFixed(2)}s</figcaption></figure>`).join('')}</section>`).join(''));
}finally{await browser.close();await server.close();}
