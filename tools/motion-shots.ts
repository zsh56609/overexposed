// A loud/quiet play beside v18's own frames. Each frame starts a fresh replay; timing includes capture latency.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { launch } from '../check/browser.ts';
import { loadStates, reach, ROOT } from '../check/desk-replay.ts';
const out=join(ROOT,'docs/handoff/v1b-compare');mkdirSync(out,{recursive:true});
const server=await createServer({root:ROOT,logLevel:'error',server:{port:5198,strictPort:false}});await server.listen();
const url=server.resolvedUrls!.local[0]!;
const page=await launch('chrome',{width:1280,height:720});
const fonts=readFileSync(join(ROOT,'ui/desk/fonts.css'),'utf8').replaceAll('../fonts/','/ui/fonts/');
const rows:string[]=[];
try {
  for(const label of ['loud','quiet']) for(const ms of [200,500,820,1500]) {
    await reach(page,url,loadStates().s02!);
    await page.evaluate(`document.documentElement.dataset.motion='full';document.querySelector('.hand .card[data-card="${label==='loud'?'open_mic':'lay_low'}"]').click()`);
    await new Promise(r=>setTimeout(r,ms));
    await page.screenshot(join(out,`${label}-${ms}-game.jpg`));
    await page.navigate(`${url}docs/design/visual/mockups/vanity.html`);
    await page.evaluate(`(()=>{document.querySelectorAll('link').forEach(x=>x.remove());const css=document.createElement('style');css.textContent=${JSON.stringify(fonts+'\n.ctl{display:none!important}#stage{transform:none!important}.viewport{height:720px!important}')};document.head.appendChild(css);Object.assign(st,{f:'rising',c:'calm',l:'music',s:'summer',view:null});render()})()`);
    await page.evaluate('document.fonts.ready.then(()=>true)');
    await page.evaluate(`(()=>{const k=HANDS.music.findIndex(k=>(PLAY[k.n]||['quiet'])[0]${label==='quiet'?'===':'!=='}'quiet');document.querySelectorAll('#hand .card')[k].click()})()`);
    await new Promise(r=>setTimeout(r,ms));
    await page.screenshot(join(out,`${label}-${ms}-reference.jpg`));
    rows.push(`<h2>${label} · ${ms} ms</h2><div><img src="${label}-${ms}-reference.jpg"><img src="${label}-${ms}-game.jpg"></div>`);
    console.log(label,ms);
  }
  writeFileSync(join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>V1b A–C comparison</title><style>body{background:#15120e;color:#ede6d6;font:16px system-ui;margin:24px}div{display:flex;gap:12px}img{width:calc(50% - 6px)}h2{margin-top:30px}</style><h1>V1b A–C</h1><p>Left: v18 mockup. Right: real seed replay. Timings are requested capture delays, with browser screenshot latency. Prose and outcomes differ intentionally. Month-end flip and season-change frames await Part D; full reduced-motion acceptance awaits Part E.</p>${rows.join('\n')}`);
}finally{await page.close();await server.close();}
