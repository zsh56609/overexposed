// V1b actual card-play and month-end frame times, on the production build.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { preview } from 'vite';
import { launch, type BrowserName } from '../check/browser.ts';
import { loadStates, reach, ROOT } from '../check/desk-replay.ts';
const out = join(ROOT, 'docs/handoff/v1b-compare'); mkdirSync(out, { recursive: true });
const states = loadStates();
const server = await preview({ root: ROOT, logLevel: 'error', preview: { port: 4175, strictPort: false } });
const url = server.resolvedUrls!.local[0]!;
const rows: unknown[] = [];
try {
  for (const browser of ['chrome', 'firefox'] as BrowserName[]) for (const rate of browser === 'chrome' ? [1, 4] : [1]) {
    const page = await launch(browser, { width: 1280, height: 720 });
    try {
      await page.throttle(rate);
      for (const [label, key, selector] of [
        ['loud','s02','.hand .card[data-card="open_mic"]'], ['quiet','s02','.hand .card[data-card="lay_low"]'],
        ['calm-end','s02','.endbtn'], ['frenzy-end','s09','.endbtn'],
      ]) {
        if (await reach(page,url,states[key!]!) !== 'ok') throw new Error(`cannot reach ${key}`);
        const result = await page.evaluate(`(async()=>{
          document.documentElement.dataset.motion='full';
          const target=document.querySelector(${JSON.stringify(selector)}); if(!target || target.getAttribute('aria-disabled')==='true') throw Error('not playable');
          const frames=[]; let on=true,last=performance.now(); const tick=t=>{frames.push(t-last);last=t;if(on)requestAnimationFrame(tick)};requestAnimationFrame(tick);
          const before=Number(document.querySelector('.desk').dataset.step),start=performance.now();target.click();
          while(Number(document.querySelector('.desk')?.dataset.step??before)===before||document.querySelector('.desk')?.dataset.busy==='1') { if(performance.now()-start>10000)throw Error('motion timed out');await new Promise(r=>setTimeout(r,5)); }
          const settled=performance.now()-start; await new Promise(r=>setTimeout(r,1500));on=false;
          const f=frames.slice(1).sort((a,b)=>a-b),q=p=>Number(f[Math.min(f.length-1,Math.floor(f.length*p))].toFixed(2));
          return {settledMs:Math.round(settled),frames:f.length,p50:q(.5),p95:q(.95),max:q(1),over33:f.filter(x=>x>33.4).length,flight:document.querySelectorAll('.motion-flight .plane').length,pile:document.querySelectorAll('.motion-pile .plane').length};
        })()`);
        rows.push({browser,rate,label,...result as object}); console.log(JSON.stringify(rows.slice(-1)[0]));
      }
    } finally { await page.close(); }
  }
  rows.push({browser:'firefox',rate:4,skipped:'WebDriver BiDi has no CPU throttling command; no unthrottled result is labelled 4x.'});
  writeFileSync(join(out,'performance.json'),JSON.stringify(rows,null,2)+'\n');
} finally { await new Promise<void>(r=>server.httpServer.close(()=>r())); }
