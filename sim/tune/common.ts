// Shared by the tuning tools in sim/tune (npm run tune:*): the command line, the year ends of the sim's runs, and a
// patch run on a copy of the content. The tools measure what a number in content would do before it is set —
// docs/decisions.md records what they found. They change no run and print ids and numbers only.

import type { Content, GameState } from '../../core/index.ts';
import { managersToRun, runOne, runSeeds } from '../batch.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from '../personas.ts';

/** The value of --name=value, or undefined. */
export const flag = (name: string): string | undefined => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
/** Every value of a repeatable option (--patch=a --patch=b). */
export const flags = (name: string): string[] => process.argv.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3));
const num = (name: string, fallback: number): number => Number(flag(name) ?? fallback);

export const RUNS = num('runs', 1000);
export const SEED = num('seed', 20260929);
export const MANAGER = flag('manager');
export { managersToRun };

/** A persona as the sim's reports label it: * marks a probe, left out of "players". */
export const label = (p: PersonaId | 'players'): string => (p !== 'players' && isProbe(p) ? `${p}*` : p);
export const GROUPS: (PersonaId | 'players')[] = [...PERSONA_IDS, 'players'];

export interface YearEnd {
  readonly persona: PersonaId;
  readonly probe: boolean;
  readonly seed: number;
  readonly final: GameState;
}

/** The runs of a group: one persona's, or every player-like persona's pooled (equal runs each, so equal weight). */
export const ofGroup = (ends: readonly YearEnd[], g: PersonaId | 'players'): YearEnd[] => ends.filter((e) => (g === 'players' ? !e.probe : e.persona === g));

/** Every finished year of the sim's personas on the batch's seeds under one manager; `look` sees each state on the way. */
export function yearEnds(content: Content, manager: string | undefined, look?: (s: GameState, persona: PersonaId, seed: number) => void): YearEnd[] {
  const out: YearEnd[] = [];
  for (const persona of PERSONA_IDS) {
    for (const seed of runSeeds(SEED, RUNS)) {
      let last: GameState | null = null;
      runOne(
        content,
        persona,
        seed,
        (s) => {
          last = s;
          look?.(s, persona, seed);
        },
        manager === undefined ? {} : { manager },
      );
      const f = last as GameState | null;
      if (f && f.phase === 'ended') out.push({ persona, probe: isProbe(persona), seed, final: f });
    }
  }
  return out;
}

/** The value at quantile q (nearest rank below). */
export const quantile = (xs: readonly number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[Math.floor(q * (s.length - 1))] as number) : Number.NaN;
};
export const pct = (n: number, d: number): string => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);

type Json = Record<string, unknown> & { id?: string };
/**
 * Runs `body` — a JS function body — on a deep copy of `raw` content, with the content's parts by name (cards, gates,
 * endings, awards, rules, press, managers, scripts) and finders card(id), gate(id), major(id), minor(id), award(id),
 * axis(id). Returns the patched copy.
 */
export function patchContent<T extends object>(raw: T, body: string): T {
  const c = structuredClone(raw) as unknown as Record<string, unknown>;
  const list = (x: unknown): Json[] => (Array.isArray(x) ? (x as Json[]) : []);
  const endings = (c.endings ?? {}) as Record<string, unknown>;
  const find = (xs: Json[], kind: string) => (id: string) => {
    const x = xs.find((y) => y.id === id);
    if (!x) throw new Error(`patch: no ${kind} ${id}`);
    return x;
  };
  const parts = ['cards', 'gates', 'endings', 'awards', 'rules', 'press', 'managers', 'scripts'] as const;
  const finders = {
    card: find(list(c.cards), 'card'),
    gate: find(list(c.gates), 'gate'),
    major: find(list(endings.majors), 'major'),
    minor: find(list(endings.minors), 'minor'),
    award: find(list(c.awards), 'award'),
    axis: find(list(endings.axes), 'axis'),
  };
  new Function(...parts, ...Object.keys(finders), body)(...parts.map((p) => c[p]), ...Object.values(finders));
  return c as unknown as T;
}
