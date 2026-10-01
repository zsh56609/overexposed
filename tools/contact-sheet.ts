// npm run desk:sheet -- <out.png> <in.png> ... [--cols=3] [--band=<top>,<height>] — screenshots on one sheet, to
// read many at a glance (round V1a): a grid at half size, each captioned with its file name; or, with --band, the
// same strip of each (e.g. --band=0,110 for the stat bar) stacked at full width.
// Drawn in headless Chrome (check/browser.ts); the inputs are 1280x720 shots such as npm run desk:shots writes.

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { launch } from '../check/browser.ts';

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const [out, ...ins] = args.filter((a) => !a.startsWith('--'));
if (!out || ins.length === 0) {
  console.error('usage: node tools/contact-sheet.ts <out.png> <in.png> ... [--cols=3] [--band=<top>,<height>]');
  process.exit(1);
}
const images = ins.map((p) => ({ src: `data:image/png;base64,${readFileSync(p).toString('base64')}`, name: basename(p) }));
const band = flag('band')?.split(',').map(Number);
const cols = band ? 1 : Number(flag('cols') ?? 3);
const W = band ? 1280 : 640;
const H = band ? (band[1] as number) + 1 : 360 + 18;
const page = await launch('chrome', { width: cols * W, height: Math.ceil(images.length / cols) * H });
try {
  await page.evaluate(`(async () => {
    document.body.style.cssText = 'margin:0;background:#222;color:#ddd;font:12px sans-serif;display:grid;grid-template-columns:repeat(${cols},${W}px)';
    for (const { src, name } of ${JSON.stringify(images)}) {
      const cell = document.createElement('div');
      cell.style.cssText = 'position:relative;overflow:hidden;width:${W}px;height:${H}px' + (${band ? 'true' : 'false'} ? ';border-bottom:1px solid #f0f' : '');
      const img = new Image();
      img.src = src;
      if (${band ? 'true' : 'false'}) img.style.cssText = 'position:absolute;left:0;top:-${band?.[0] ?? 0}px';
      else {
        const cap = document.createElement('div');
        cap.textContent = name;
        cap.style.cssText = 'height:18px;padding-left:4px';
        cell.appendChild(cap);
        img.style.cssText = 'display:block;width:640px;height:360px';
      }
      cell.appendChild(img);
      document.body.appendChild(cell);
      await img.decode();
    }
  })()`);
  await page.screenshot(out);
  console.log(`${images.length} shots → ${out}`);
} finally {
  await page.close();
}
