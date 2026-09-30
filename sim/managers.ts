// npm run sim:managers -- [--runs=1000] [--seed=20260929]
//
// The two managers side by side (round 2b): every persona plays the same seeds under each manager, and the
// report shows per persona the major and minor endings, the scandals, the picks of Dex's extra card and the
// heat relieved (Mags) — so it can say whether either perk is strictly better — then how often each message
// trigger fires, how many messages a month brings, and any trigger that never fires. Ids and numbers only.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { managerMessages, type GameState, type HistoryStep } from '../core/index.ts';
import { managersToRun, runOne, runSeeds, type RunRecord } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from './personas.ts';
import { ROOT } from '../validate/load.ts';
import { messageLineKeys } from '../validate/validate.ts';

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 20260929);

const content = loadContent();
const managers = managersToRun(content, undefined).filter((m): m is string => m !== undefined);
const majors = content.endings.majors.map((m) => m.id);
const minors = content.endings.minors.map((m) => m.id);
const lineKeys = messageLineKeys(majors, content.rules.lanes ?? [], (content.rules.fameBands ?? []).map((b) => b.id));
const months = content.rules.acts * content.rules.turnsPerAct;
const seeds = runSeeds(SEED, RUNS);
const players = PERSONA_IDS.filter((p) => !isProbe(p));

interface Tally {
  runs: number;
  major: Record<string, number>;
  minor: Record<string, number>;
  scandalsHeld: number;
  crystallised: number;
  freeRerolls: number;
  managerCardPicks: number;
  rerolls: number;
  heatRelieved: number;
  /** Per trigger line key: the times it fired (before the monthly cap), was shown, and the runs it fired in. */
  fired: Record<string, number>;
  shown: Record<string, number>;
  firedRuns: Record<string, number>;
  /** Months by how many messages they brought (0, 1, 2), and months where more triggers fired than shown. */
  perMonth: number[];
  capped: number;
}
const tally = (): Tally => ({ runs: 0, major: {}, minor: {}, scandalsHeld: 0, crystallised: 0, freeRerolls: 0, managerCardPicks: 0, rerolls: 0, heatRelieved: 0, fired: {}, shown: {}, firedRuns: {}, perMonth: [], capped: 0 });
const add = (r: Record<string, number>, k: string, n = 1) => (r[k] = (r[k] ?? 0) + n);

const results = new Map<string, Map<PersonaId | 'players', Tally>>();
const t0 = performance.now();
for (const manager of managers) {
  const byPersona = new Map<PersonaId | 'players', Tally>([['players', tally()]]);
  for (const persona of PERSONA_IDS) {
    const t = tally();
    for (const seed of seeds) {
      const history: HistoryStep[] = [];
      let before: GameState | null = null;
      const record: RunRecord = runOne(
        content,
        persona,
        seed,
        (state) => {
          history.push({ before, after: state, events: state.events });
          before = state;
        },
        { manager },
      );
      const messages = managerMessages(history);
      for (const target of isProbe(persona) ? [t] : [t, byPersona.get('players') as Tally]) {
        target.runs++;
        add(target.major, record.majorId ?? 'none');
        add(target.minor, record.endingId ?? 'none');
        target.scandalsHeld += record.scandalsAtEnd;
        target.crystallised += record.scandalsCrystallised;
        target.freeRerolls += record.freeRerolls;
        target.managerCardPicks += record.managerCardPicks;
        target.rerolls += record.rerolls;
        target.heatRelieved += record.heatRelieved;
        const firedThisRun = new Set<string>();
        for (const month of messages) {
          for (const key of month.fired) {
            add(target.fired, key);
            firedThisRun.add(key);
          }
          for (const m of month.messages) add(target.shown, m.lineKey);
          target.perMonth[month.messages.length] = (target.perMonth[month.messages.length] ?? 0) + 1;
          if (month.fired.length > month.messages.length) target.capped++;
        }
        for (const key of firedThisRun) add(target.firedRuns, key);
      }
    }
    byPersona.set(persona, t);
  }
  results.set(manager, byPersona);
}

const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const per = (n: number, d: number) => (d === 0 ? '-' : (n / d).toFixed(2));
const pad = (s: string, n: number) => s.padEnd(n);
const lines: string[] = [];
const rows = [...PERSONA_IDS, 'players'] as const;
const label = (p: string) => (p === 'players' ? 'players' : isProbe(p as PersonaId) ? `${p}*` : p);
const get = (m: string, p: PersonaId | 'players') => results.get(m)?.get(p) as Tally;
lines.push(`MANAGERS  seed=${SEED}  ${RUNS} runs x ${PERSONA_IDS.length} personas x ${managers.length} managers  (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
lines.push('every persona plays the same seeds under each manager; * = probe, not in "players"', '');

lines.push("SIDE BY SIDE  (major endings; scandals held at year end and crystallised per run; rerolls, free rerolls, picks of the manager's extra card and heat relieved per run)");
lines.push(pad('persona', 14) + pad('manager', 10) + majors.map((m) => m.padStart(13)).join('') + 'held'.padStart(7) + 'cryst.'.padStart(8) + 'rerolls'.padStart(9) + 'free'.padStart(7) + 'extra'.padStart(7) + 'relief'.padStart(8));
for (const p of rows) {
  for (const m of managers) {
    const t = get(m, p);
    lines.push(
      pad(label(p), 14) + pad(m, 10) + majors.map((id) => pct(t.major[id] ?? 0, t.runs).padStart(13)).join('') +
        per(t.scandalsHeld, t.runs).padStart(7) + per(t.crystallised, t.runs).padStart(8) + per(t.rerolls, t.runs).padStart(9) + per(t.freeRerolls, t.runs).padStart(7) + per(t.managerCardPicks, t.runs).padStart(7) + per(t.heatRelieved, t.runs).padStart(8),
    );
  }
}
lines.push('');
lines.push('MINOR ENDINGS  (share of runs, per persona and manager)');
const short = (id: string) => id.slice(0, 10);
lines.push(pad('persona', 14) + pad('manager', 10) + minors.map((id) => short(id).padStart(11)).join(''));
for (const p of rows) {
  for (const m of managers) {
    const t = get(m, p);
    lines.push(pad(label(p), 14) + pad(m, 10) + minors.map((id) => pct(t.minor[id] ?? 0, t.runs).padStart(11)).join(''));
  }
}
lines.push('');

// Strictly better: one manager at least as good for every player-like persona on every count — more of the
// best major (famous and clean), less of the worst (famous nowhere, damaged), fewer scandals — and better on one.
const [a, b] = managers as [string, string];
const verdicts: string[] = [];
if (managers.length === 2) {
  lines.push(`STRICTLY BETTER?  (${b} minus ${a}, player-like personas; the best major is ${majors[0]}, the worst ${majors.at(-1)})`);
  lines.push(pad('persona', 14) + `Δ ${majors[0]}`.padStart(18) + `Δ ${majors.at(-1)}`.padStart(14) + 'Δ held'.padStart(9) + '  better for the player');
  let bWins = 0;
  let aWins = 0;
  for (const p of [...players, 'players'] as const) {
    const ta = get(a, p);
    const tb = get(b, p);
    const best = (tb.major[majors[0] as string] ?? 0) / tb.runs - (ta.major[majors[0] as string] ?? 0) / ta.runs;
    const worst = (tb.major[majors.at(-1) as string] ?? 0) / tb.runs - (ta.major[majors.at(-1) as string] ?? 0) / ta.runs;
    const held = tb.scandalsHeld / tb.runs - ta.scandalsHeld / ta.runs;
    const bBetter = [best > 0.005, worst < -0.005, held < -0.05].filter(Boolean).length;
    const aBetter = [best < -0.005, worst > 0.005, held > 0.05].filter(Boolean).length;
    const call = bBetter > 0 && aBetter === 0 ? b : aBetter > 0 && bBetter === 0 ? a : 'mixed';
    if (p !== 'players') {
      if (call === b) bWins++;
      if (call === a) aWins++;
    }
    lines.push(pad(label(p), 14) + `${(best * 100).toFixed(1)} pts`.padStart(18) + `${(worst * 100).toFixed(1)} pts`.padStart(14) + held.toFixed(2).padStart(9) + `  ${call}`);
  }
  const verdict =
    bWins === players.length ? `${b} is strictly better: better or equal for every player-like persona` : aWins === players.length ? `${a} is strictly better: better or equal for every player-like persona` : `neither is strictly better (${b} better for ${bWins}, ${a} for ${aWins} of ${players.length} player-like personas)`;
  verdicts.push(verdict);
  lines.push(`verdict: ${verdict}`, '');
}

lines.push('MESSAGE TRIGGERS  (player-like, pooled: fired per run before the monthly cap / shown per run / runs where it fires)');
lines.push(pad('trigger', 24) + managers.map((m) => pad(`  ${m}`, 30)).join(''));
const never: Record<string, string[]> = {};
for (const key of lineKeys) {
  const cells = managers.map((m) => {
    const t = get(m, 'players');
    if (!(t.fired[key] ?? 0)) (never[m] ??= []).push(key);
    return pad(`  ${per(t.fired[key] ?? 0, t.runs)} / ${per(t.shown[key] ?? 0, t.runs)} / ${pct(t.firedRuns[key] ?? 0, t.runs)}`, 30);
  });
  lines.push(pad(key, 24) + cells.join(''));
}
lines.push('');
lines.push('MESSAGES PER MONTH  (player-like, pooled: months opened, by messages they brought; months where more triggers fired than the cap shows)');
for (const m of managers) {
  const t = get(m, 'players');
  const total = t.perMonth.reduce((n, x) => n + (x ?? 0), 0);
  const mean = t.perMonth.reduce((n, x, i) => n + i * (x ?? 0), 0) / Math.max(1, total);
  lines.push(`  ${pad(m, 10)} ${[0, 1, 2].map((n) => `${n}: ${pct(t.perMonth[n] ?? 0, total)}`).join('  ')}   mean ${mean.toFixed(2)} a month, ${(mean * months).toFixed(1)} a run   capped: ${pct(t.capped, total)} of months`);
}
for (const m of managers) lines.push(`  never fires under ${m}: ${(never[m] ?? []).join(', ') || 'none'}`);
console.log(lines.join('\n'));

mkdirSync(join(ROOT, 'sim/out'), { recursive: true });
writeFileSync(
  join(ROOT, 'sim/out/managers.json'),
  JSON.stringify({ seed: SEED, runs: RUNS, verdicts, results: Object.fromEntries([...results].map(([m, byP]) => [m, Object.fromEntries(byP)])) }, null, 2),
);
