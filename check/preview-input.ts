import assert from 'node:assert/strict';
import type { Page } from './browser.ts';
import { cardPoint, centre, loadStates, reach } from './desk-replay.ts';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const visible = (page: Page) => page.evaluate<boolean>(`!!document.querySelector('.floating')`);
const busy = (page: Page) => page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.busy==='1'`);
async function card(page: Page, id: string) {
  const i = await page.evaluate<number>(`[...document.querySelectorAll('.hand .card')].findIndex(c=>c.dataset.card===${JSON.stringify(id)})`);
  assert.ok(i >= 0, `missing ${id}`); return (await cardPoint(page, i, 40, 120))!;
}
async function idle(page: Page) {
  const start = Date.now();
  while (await busy(page)) { assert.ok(Date.now()-start<15000,'presentation did not finish'); await sleep(40); }
}
export async function checkPreviewInput(page: Page, url: string) {
  for (const path of ['stationary', 'moving', 'keyboard', 'touch']) {
    if (path==='touch' && page.name==='webkit') { console.log('SKIP preview touch WebKit: trusted held touch unavailable'); continue; }
    assert.equal(await reach(page,url,loadStates().s02!), 'ok');
    if(path==='keyboard' && !await page.evaluate<boolean>('document.hasFocus()')) { console.log(`SKIP preview keyboard ${page.name}: headless window has no focus`); continue; }
    await page.evaluate(`document.documentElement.dataset.motion='full'`);
    const before = await page.evaluate<string>(`document.querySelector('[data-hook="date"]').textContent`);
    await page.click(...await card(page,'open_mic'));
    await sleep(180);
    assert.equal(await visible(page),false,`${path}: busy preview under stationary pointer`);
    if (path==='moving') {
      await page.move(...await card(page,'lay_low')); await sleep(200);
      assert.equal(await visible(page),false,'busy card hover');
      await page.move(...(await centre(page,'.endbtn'))!); await sleep(200);
      assert.equal(await visible(page),false,'busy END TURN hover');
    } else if (path==='keyboard') {
      for(let i=0;i<12;i++) { await page.key('Tab'); assert.equal(await visible(page),false,'busy keyboard preview'); }
    } else if (path==='touch') {
      await page.press(...await card(page,'lay_low'),700);
      assert.equal(await visible(page),false,'busy held-touch preview');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-hook="date"]').textContent`),before,'touch skip also ended month');
    }
    if(await busy(page)) { await sleep(900); assert.equal(await visible(page),false,'preview during publication/tails'); }
    await idle(page);
    await page.move(10,100); await page.move(...await card(page,'lay_low')); await sleep(100);
    assert.equal(await visible(page),true,'idle card preview not restored');
    await page.move(10,100); await page.move(...(await centre(page,'.endbtn'))!); await sleep(100);
    assert.equal(await visible(page),true,'idle END TURN preview not restored');
    await page.move(10,100);
    if(path==='touch') {
      await page.press(...await card(page,'lay_low'),600); await sleep(100);
      assert.equal(await visible(page),true,'idle long-press preview not restored');
    }
    if(path==='keyboard' && await page.evaluate<boolean>('document.hasFocus()')) {
      let found=false;
      for(let i=0;i<50&&!found;i++) { await page.key('Tab'); found=await page.evaluate<boolean>(`!!document.activeElement?.closest('.hand .card,.endbtn')`); }
      assert.equal(found,true,'could not focus preview control'); await sleep(100);
      assert.equal(await visible(page),true,'idle keyboard preview not restored');
    }
    console.log(`preview input ${page.name}: ${path} suppressed while busy, restored when idle`);
  }
}
