// D7 must be checked with motion on, independently of the static hit/overflow audits.
import type { Page } from './browser.ts';
import { cardPoint, centre, loadStates, reach } from './desk-replay.ts';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export async function checkD7(page: Page, url: string): Promise<void> {
  // 60ms: the card is in flight, within its hold — a click only fast-forwards (decision 7). 1100ms: the card is set
  // down and its tails still play, but hold no input (round R1, Part A) — END TURN acts at once, the tails settled.
  for (const delay of [60, 1100]) {
  const state = loadStates().s02;
  if (!state || await reach(page, url, state) !== 'ok') throw new Error('D7: cannot reach its fixture');
  const before = await page.evaluate<{ step: number; date: string }>(`({step:Number(document.querySelector('.desk').dataset.step),date:document.querySelector('[data-hook="date"]').textContent})`);
  await page.evaluate(`document.documentElement.dataset.motion = 'full'`);
  const idx = await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].findIndex(c=>c.getAttribute('aria-disabled')==='false')`);
  const point = await cardPoint(page, idx);
  if (!point) throw new Error('D7: no playable card');
  await page.click(...point); await sleep(delay);
  const holding = await page.evaluate<boolean>(`document.querySelector('.desk').dataset.busy==='1'`);
  if (delay === 60 && !holding) throw new Error('D7: animation did not start');
  if (delay > 60 && holding) throw new Error('D7: the card still holds input after it was set down');
  const end = await centre(page, '.desk .endbtn');
  if (!end) throw new Error('D7: no END TURN');
  if (delay > 60) {
    const tails = await page.evaluate<number>(`document.querySelectorAll('.motion-delta, .motion-writing').length`);
    await page.click(...end); await sleep(60);
    const acted = await page.evaluate<{ step: number; beat: string; tails: number }>(`({step:Number(document.querySelector('.desk').dataset.step),beat:document.querySelector('.desk').dataset.beat,tails:document.querySelectorAll('.motion-delta, .motion-writing').length})`);
    if (acted.beat === 'idle' || acted.tails !== 0) throw new Error(`D7: END TURN after the card was set down did not act at once: ${JSON.stringify({ tails, acted })}`);
    await page.click(...end); await sleep(120); // the month end itself still only fast-forwards
    const settled = await page.evaluate<number>(`Number(document.querySelector('.desk')?.dataset.step ?? -1)`);
    if (settled !== before.step + 2) throw new Error(`D7: the play and END TURN did not both apply once: ${JSON.stringify({ before, settled })}`);
    console.log(`D7 ${page.name} at ${delay}ms: the card is down, its ${tails} tail(s) settled, END TURN acted at once`);
    continue;
  }
  await page.click(...end); await sleep(60);
  const after = await page.evaluate<{ step: number; date: string; busy: string; flight: number }>(`({step:Number(document.querySelector('.desk').dataset.step),date:document.querySelector('[data-hook="date"]').textContent,busy:document.querySelector('.desk').dataset.busy,flight:document.querySelectorAll('.motion-flight .plane').length})`);
  if (after.step !== before.step + 1 || after.date !== before.date || after.busy !== '0' || after.flight !== 0) throw new Error(`D7: skip also acted or left a flight: ${JSON.stringify({before,after})}`);
  // A stale timer must not apply the same step again after the fast-forward.
  await sleep(950);
  if (await page.evaluate<number>(`Number(document.querySelector('.desk').dataset.step)`) !== after.step) throw new Error('D7: a stale timer replayed the action');
  console.log(`D7 ${page.name} at ${delay}ms: click fast-forwards exactly one play; END TURN not executed`);
  }
}
