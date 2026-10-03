import type { Page } from './browser.ts';
const sleep = (ms: number) => new Promise(r => { setTimeout(r, ms).unref(); });
/** A lost execution context must fail with its last state, not leave one 20-minute evaluation hanging. */
export async function auditStep<T>(page: Page, label: string, expression: string, limit = 30_000): Promise<T> {
  await page.evaluate(`window.__auditProgress={stage:${JSON.stringify(label)},started:Date.now()}`, 5000);
  let done = false;
  const job = page.evaluate<T>(expression, limit).finally(() => { done = true; });
  // Attach rejection handling immediately, including while a progress read is pending.
  job.catch(() => {});
  let last = '', changed = Date.now();
  try {
    while (!done) {
      await Promise.race([job.then(() => {}, () => {}), sleep(10_000)]);
      if (done) break;
      const state = await page.evaluate<string>(`JSON.stringify({progress:window.__auditProgress??null,url:location.href,ready:document.readyState,phase:document.querySelector('.manager-choice,.draft,.gates,.ending,.hand')?.className,step:document.querySelector('.desk')?.dataset.step,busy:document.querySelector('.desk')?.dataset.busy})`, 5000);
      console.log(`progress ${page.name} ${label}: ${state}`);
      if (!JSON.parse(state).progress) throw new Error(`${label}: audit context was replaced (reload/navigation)`);
      if (state !== last) { changed = Date.now(); last = state; }
      else if (Date.now()-changed > 60_000) throw new Error(`${label}: no progress for 60s; last=${last}`);
    }
    return await job;
  } catch(error) {
    console.error(`audit failure ${page.name} ${label}; last=${last || 'before first progress sample'}`);
    for(const line of page.diagnostics.slice(-50)) console.error(`browser: ${line}`);
    throw error;
  }
}
