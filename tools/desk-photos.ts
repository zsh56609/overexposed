// npm run desk:photos — a contact sheet of every newspaper photograph the desk can print (round V1a): the twelve
// scenes (four added in round R8a; the street in each season) in each of their drawings, as ui/desk/halftone.ts draws
// them, plus the headshot card's portrait. For a look at the drawings without playing to them. Each photograph is
// also read back (round R8a): one that fails to draw, comes out the wrong size or prints no ink fails the run.
// Firefox by default since R8a: headless Chrome's screenshot of a sheet this long never came back (on Windows, from
// twelve rows of photographs on).
//
// Usage: node tools/desk-photos.ts [--out=check/out/photos.png] [--browser=firefox]

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
  ['tvshow', 'summer'],
  ['studio', 'summer'],
  ['arena', 'summer'],
  ['podium', 'summer'],
  ['street', 'spring'],
  ['street', 'summer'],
  ['street', 'autumn'],
  ['street', 'winter'],
];

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5194, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0] as string;
// The headshot stands in a column of its own beside the first rows (round R8a).
const width = PHOTO_VARIANTS * 486 + 378 + 6;
const height = ROWS.length * 196 + 12;
const page = await launch(flag('browser', 'firefox') as BrowserName, { width, height });
try {
  await page.navigate(url, 3000);
  const { ms, read } = await page.evaluate<{ ms: number; read: { label: string; w: number; h: number; ink: number; error?: string }[] }>(`(async () => {
    const m = await import('/ui/desk/halftone.ts');
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#333;color:#ddd;font:12px sans-serif;display:grid;grid-template-columns:repeat(${PHOTO_VARIANTS},480px) 372px;gap:6px;padding:6px';
    const t0 = performance.now();
    for (const [scene, season] of ${JSON.stringify(ROWS)}) {
      for (let v = 0; v < ${PHOTO_VARIANTS}; v++) {
        const d = document.createElement('div');
        d.style.gridColumn = String(v + 1);
        d.textContent = scene + (scene === 'street' ? ' · ' + season : '') + ' · drawing ' + (v + 1);
        const i = new Image();
        i.src = m.photoUrl(scene, season, v);
        i.style.cssText = 'display:block;width:480px;height:172px;margin-top:2px';
        d.appendChild(i);
        document.body.appendChild(d);
      }
    }
    const d = document.createElement('div');
    d.style.cssText = 'grid-column:${PHOTO_VARIANTS + 1};grid-row:1 / span 3';
    d.textContent = 'headshot (the 8×10 card face)';
    const i = new Image();
    i.src = m.photoUrl('headshot', 'summer', 0);
    i.style.cssText = 'display:block;width:372px;height:504px;margin-top:2px';
    d.appendChild(i);
    document.body.appendChild(d);
    const read = await Promise.all([...document.images].map(async (x) => {
      const label = x.parentElement.firstChild.textContent;
      try {
        await x.decode();
      } catch (e) {
        return { label, w: 0, h: 0, ink: 0, error: String(e) };
      }
      // How much of it is ink: the share of pixels darker than the middle grey (the papers' ink, the red duotone's
      // and the headshot's all are; their paper is not).
      const c = document.createElement('canvas');
      c.width = x.naturalWidth;
      c.height = x.naturalHeight;
      const g = c.getContext('2d');
      g.drawImage(x, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 128) dark++;
      return { label, w: c.width, h: c.height, ink: dark / (d.length / 4) };
    }));
    return { ms: Math.round(performance.now() - t0), read };
  })()`);
  await page.screenshot(OUT);
  // A photograph is drawn: it decodes at its frame's size (the papers' 480×172, the headshot's 372×504) and prints
  // some ink, never all of it.
  const bad = read.filter((r) => r.error || r.w !== (r.label.startsWith('headshot') ? 372 : 480) || r.h !== (r.label.startsWith('headshot') ? 504 : 172) || r.ink < 0.02 || r.ink > 0.98);
  const inks = read.map((r) => r.ink);
  console.log(`${read.length} photographs drawn in ${ms} ms, ink ${Math.round(Math.min(...inks) * 100)}–${Math.round(Math.max(...inks) * 100)}% of each → ${OUT}`);
  for (const r of bad) console.log(`  FAILED ${r.label}: ${r.error ?? `${r.w}×${r.h}, ink ${(r.ink * 100).toFixed(1)}%`}`);
  if (bad.length > 0) process.exitCode = 1;
  else console.log('PASS: every drawing of every scene is drawn');
} finally {
  await page.close();
  await server.close();
}
