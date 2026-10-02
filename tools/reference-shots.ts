// Re-capture v18's desk references at its exact logical size, using the shipped OFL fonts offline.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { launch } from '../check/browser.ts';
import { ROOT } from '../check/desk-replay.ts';
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5197, strictPort: false } });
await server.listen();
const page = await launch('chrome', { width: 1280, height: 720 });
const shots: [string, string, string, string, string][] = [
  ['01','unknown','calm','music','spring'], ['02','rising','calm','music','summer'],
  ['03','famous','calm','music','summer'], ['04','famous','calm','screen','autumn'],
  ['05','rising','calm','celebrity','winter'], ['07','unknown','crisis','music','summer'],
  ['08','unknown','crisis','music','summer'], ['09','famous','crisis','music','winter'],
  ['10','famous','calm','screen','autumn'], ['11','famous','calm','screen','autumn'],
];
try {
  await page.navigate(`${server.resolvedUrls!.local[0]}docs/design/visual/mockups/vanity.html`);
  const fonts = readFileSync(join(ROOT,'ui/desk/fonts.css'),'utf8').replaceAll('../fonts/', '/ui/fonts/');
  await page.evaluate(`(() => { document.querySelectorAll('link').forEach(x=>x.remove()); const s=document.createElement('style'); s.textContent=${JSON.stringify(fonts + '\n.ctl{display:none!important} #stage{transform:none!important} .viewport{height:720px!important}')}; document.head.appendChild(s); })()`);
  await page.evaluate('document.fonts.ready.then(()=>true)');
  for (const [id,f,c,l,s] of shots) {
    await page.evaluate(`Object.assign(st,${JSON.stringify({f,c,l,s,view:null})});render()`);
    if (id === '08') await page.evaluate(`st.view='flash';renderPapers()`);
    if (id === '10') {
      const point = await page.evaluate<[number,number]>(`(()=>{const r=document.querySelector('.cell[data-tip="craft"]').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
      await page.move(...point);
    } else await page.move(640,300);
    if (id === '11') await page.evaluate(`(()=>{const b=document.querySelectorAll('.bub:not(.who)');b[0]?.click();document.querySelector('.rx-bar button')?.click();b[b.length-1]?.click()})()`);
    await new Promise(r=>setTimeout(r,600));
    const file = readdirSync(join(ROOT,'docs/design/visual/shots')).find(n=>n.startsWith(id+'-'))!;
    await page.screenshot(join(ROOT,'docs/design/visual/shots',file)); console.log(file);
  }
} finally { await page.close(); await server.close(); }
