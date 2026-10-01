// npm run tune:lanes -- [--plays=2,3,4,5] [--leads=1,2,3] [--runs=1000] [--seed=20260929] [--manager=<id>]
// When does a career lane settle? For each candidate rule — the leading lane has at least N plays and is L ahead of
// the next — over the player-like runs: the share whose lane settles by the year's end, the month it first does
// (p25 / median / p75), by months 5 and 6, how often it later reads early again or changes lane, and each persona's
// median month. rules.laneEstablished was chosen this way (docs/decisions.md, phase 2a Part B: settle around
// mid-summer, rarely change). Candidates are tested on the lane plays at each month end, without the hysteresis the
// rule then keeps (core/lanes.ts). Each manager in turn unless --manager names one.

import { lanePlays, type GameState } from '../../core/index.ts';
import { loadContent } from '../content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from '../personas.ts';
import { flag, MANAGER, managersToRun, pct, quantile, RUNS, SEED, yearEnds } from './common.ts';

const content = loadContent();
const LANES = content.rules.lanes ?? [];
const list = (name: string, fallback: string) => (flag(name) ?? fallback).split(',').map(Number);
const PLAYS = list('plays', '2,3,4,5');
const LEADS = list('leads', '1,2,3');
const players = PERSONA_IDS.filter((p) => !isProbe(p));

/** The lane that leads with at least n plays and l ahead of the next, or null. */
const settled = (plays: Readonly<Record<string, number>>, n: number, l: number): string | null => {
  const sorted = LANES.map((lane) => [lane, plays[lane] ?? 0] as const).sort((a, b) => b[1] - a[1] || LANES.indexOf(a[0]) - LANES.indexOf(b[0]));
  const [top, second] = sorted;
  return top && top[1] >= n && top[1] - (second?.[1] ?? 0) >= l ? top[0] : null;
};

for (const [i, manager] of managersToRun(content, MANAGER).entries()) {
  if (i > 0) console.log('\n');
  // Per player-like run: the lane plays at each month end.
  const runs = new Map<string, { persona: PersonaId; ends: { turn: number; plays: Readonly<Record<string, number>> }[] }>();
  yearEnds(content, manager, (s: GameState, persona, seed) => {
    if (isProbe(persona)) return;
    const end = s.events.find((e) => e.type === 'turnEnd');
    if (end?.type !== 'turnEnd') return;
    const key = `${persona} ${seed}`;
    if (!runs.has(key)) runs.set(key, { persona, ends: [] });
    runs.get(key)?.ends.push({ turn: end.turn, plays: { ...lanePlays(s) } });
  });
  const all = [...runs.values()];
  console.log(`LANES  seed=${SEED}  manager=${manager ?? 'none'}  ${RUNS} runs x ${players.length} player-like personas; in content: ${JSON.stringify(content.rules.laneEstablished)}`);
  console.log('N L | settled by year end | first month p25 / median / p75 | by month 5 / 6 | reads early again | changes lane | median month by persona');
  for (const n of PLAYS) {
    for (const l of LEADS) {
      const firsts: number[] = [];
      let ever = 0;
      let unsettle = 0;
      let change = 0;
      const byPersona: Record<string, number[]> = {};
      for (const r of all) {
        let first: number | null = null;
        let lane: string | null = null;
        let un = false;
        let ch = false;
        for (const e of r.ends) {
          const now = settled(e.plays, n, l);
          if (first === null) {
            if (now !== null) {
              first = e.turn;
              lane = now;
            }
          } else if (now === null) un = true;
          else if (now !== lane) {
            ch = true;
            lane = now;
          }
        }
        if (first !== null) {
          ever++;
          firsts.push(first);
          (byPersona[r.persona] ??= []).push(first);
        }
        if (un) unsettle++;
        if (ch) change++;
      }
      const by = (m: number) => pct(firsts.filter((f) => f <= m).length, all.length);
      console.log(
        `${n} ${l} | ${pct(ever, all.length).padStart(6)} | ${[0.25, 0.5, 0.75].map((q) => quantile(firsts, q)).join(' / ')} | ${by(5)} / ${by(6)} | ${pct(unsettle, all.length).padStart(6)} | ${pct(change, all.length).padStart(6)} | ` +
          players.map((p) => `${p} ${quantile(byPersona[p] ?? [], 0.5)}`).join(', '),
      );
    }
  }
}
