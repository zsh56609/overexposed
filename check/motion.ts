// D7 must be checked with motion on, independently of the static hit/overflow audits.
import type { Page } from './browser.ts';
import { cardPoint, centre, loadStates, reach } from './desk-replay.ts';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export async function checkD7(page: Page, url: string): Promise<void> {
  for (const delay of [60, 1100]) {
  const state = loadStates().s02;
  if (!state || await reach(page, url, state) !== 'ok') throw new Error('D7: cannot reach its fixture');
  const before = await page.evaluate<{ step: number; date: string }>(`({step:Number(document.querySelector('.desk').dataset.step),date:document.querySelector('[data-hook="date"]').textContent})`);
  await page.evaluate(`document.documentElement.dataset.motion = 'full'`);
  const idx = await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].findIndex(c=>c.getAttribute('aria-disabled')==='false')`);
  const point = await cardPoint(page, idx);
  if (!point) throw new Error('D7: no playable card');
  await page.click(...point); await sleep(delay);
  if (!await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'`)) throw new Error('D7: animation did not start');
  const end = await centre(page, '.desk .endbtn');
  if (!end) throw new Error('D7: no END TURN');
  await page.click(...end); await sleep(60);
  const after = await page.evaluate<{ step: number; date: string; busy: string; flight: number }>(`({step:Number(document.querySelector('.desk').dataset.step),date:document.querySelector('[data-hook="date"]').textContent,busy:document.querySelector('.desk').dataset.busy,flight:document.querySelectorAll('.motion-flight .plane').length})`);
  if (after.step !== before.step + 1 || after.date !== before.date || after.busy !== '0' || after.flight !== 0) throw new Error(`D7: skip also acted or left a flight: ${JSON.stringify({before,after})}`);
  // A stale timer must not apply the same step again after the fast-forward.
  await sleep(950);
  if (await page.evaluate<number>(`Number(document.querySelector('.desk').dataset.step)`) !== after.step) throw new Error('D7: a stale timer replayed the action');
  console.log(`D7 ${page.name} at ${delay}ms: click fast-forwards exactly one play; END TURN not executed`);
  }
}
