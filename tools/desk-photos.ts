// npm run desk:photos — a contact sheet of every newspaper photograph the desk can print (round V1a): the eight
// scenes (the street in each season) in each of their drawings, as ui/desk/halftone.ts draws them, plus the
// headshot card's portrait. For a look at the drawings without playing to them.
//
// Usage: node tools/desk-photos.ts [--out=check/out/photos.png] [--browser=chrome]

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createServer } from 'vite';
import { launch, type BrowserName } from '../check/browser.ts';
import { ROOT } from '../check/desk-replay.ts';
import { PHOTO_VARIANTS } from '../ui/desk/model.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const OUT = flag('out', join(ROOT, 'check', 'out', 'photos.png'));
mkdirSync(dirname(OUT), { recursive: true });

const ROWS: [string, string][] = [
  ['singer', 'summer'],
  ['rival', 'summer'],
  ['crowd', 'summer'],
  ['paparazzi', 'summer'],
  ['carpet', 'summer'],
  ['filmset', 'summer'],
  ['trophy', 'summer'],
  ['street', 'spring'],
  ['street', 'summer'],
  ['street', 'autumn'],
  ['street', 'winter'],
];

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5194, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0] as string;
const width = PHOTO_VARIANTS * 486 + 6;
const height = ROWS.length * 196 + 520;
const page = await launch(flag('browser', 'chrome') as BrowserName, { width, height });
try {
  await page.navigate(url, 3000);
  const ms = await page.evaluate<number>(`(async () => {
    const m = await import('/ui/desk/halftone.ts');
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#333;color:#ddd;font:12px sans-serif;display:grid;grid-template-columns:repeat(${PHOTO_VARIANTS},480px);gap:6px;padding:6px';
    const t0 = performance.now();
    for (const [scene, season] of ${JSON.stringify(ROWS)}) {
      for (let v = 0; v < ${PHOTO_VARIANTS}; v++) {
        const d = document.createElement('div');
        d.textContent = scene + (scene === 'street' ? ' · ' + season : '') + ' · drawing ' + (v + 1);
        const i = new Image();
        i.src = m.photoUrl(scene, season, v);
        i.style.cssText = 'display:block;width:480px;height:172px;margin-top:2px';
        d.appendChild(i);
        document.body.appendChild(d);
      }
    }
    const d = document.createElement('div');
    d.textContent = 'headshot (the 8×10 card face)';
    const i = new Image();
    i.src = m.photoUrl('headshot', 'summer', 0);
    i.style.cssText = 'display:block;width:372px;height:504px;margin-top:2px';
    d.appendChild(i);
    document.body.appendChild(d);
    await Promise.all([...document.images].map((x) => x.decode()));
    return Math.round(performance.now() - t0);
  })()`);
  await page.screenshot(OUT);
  console.log(`${ROWS.length * PHOTO_VARIANTS + 1} photographs drawn in ${ms} ms → ${OUT}`);
} finally {
  await page.close();
  await server.close();
}
