// Round R11a, part A: the static inventory — what content exists, by type and by when it can appear. Counted from the
// content files and the English strings; nothing here is played. Read-only: returns plain data for survey.ts to write.

import { onceItem } from '../../core/index.ts';
import { variantGroups, type RawContent, type VariantGroup } from '../../validate/validate.ts';

type Obj = Record<string, any>;

/** A condition as a short string: "hype>=15 & flags all[told_all]". */
export function conditionText(c: Obj | undefined): string {
  if (!c) return '-';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(c)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && ('min' in v || 'max' in v) && !('all' in v) && !('any' in v) && !('not' in v)) {
      parts.push(`${k}${v.min !== undefined ? `>=${v.min}` : ''}${v.max !== undefined ? `<=${v.max}` : ''}`);
    } else if (k === 'flags' || (v && typeof v === 'object' && ('all' in v || 'any' in v || 'not' in v))) {
      const t = v as Obj;
      const bits = ['all', 'any', 'not'].filter((x) => t[x]?.length).map((x) => `${x}[${t[x].join(',')}]`);
      parts.push(`${k} ${bits.join(' ')}`);
    } else parts.push(`${k}=${JSON.stringify(v)}`);
  }
  return parts.length ? parts.join(' & ') : '-';
}

const lanesOf = ['music', 'screen', 'celebrity', 'neutral'] as const;

export function buildInventory(raw: RawContent, i18n: Obj) {
  const rules = raw.rules as Obj;
  const cards = raw.cards as Obj[];
  const events = (raw.events as Obj).events as Obj[];
  const gates = raw.gates as Obj[];
  const endings = raw.endings as Obj;
  const awards = raw.awards as Obj[];
  const press = raw.press as Obj;
  const managers = (raw.managers as Obj).managers as Obj[];
  const acts = rules.acts as number;
  const perAct = rules.turnsPerAct as number;
  const months = acts * perAct;
  const seasonOf = (m: number) => (rules.seasons as string[])[Math.ceil(m / perAct) - 1] as string;

  // ---- Cards
  const draftable = cards.filter((c) => c.kind !== 'scandal');
  const startingDeck = (rules.startingDeck as Obj[]).map((s) => ({ id: s.cardId as string, count: s.count as number }));
  const byAct = Array.from({ length: acts }, (_, i) => {
    const act = i + 1;
    const pool = draftable.filter((c) => (c.actMin ?? 1) <= act);
    const lane: Record<string, number> = {};
    for (const l of lanesOf) lane[l] = pool.filter((c) => c.lane === l).length;
    return {
      act,
      season: (rules.seasons as string[])[i] as string,
      pool: pool.length,
      newThisAct: draftable.filter((c) => (c.actMin ?? 1) === act).map((c) => c.id as string),
      byLane: lane,
      actions: pool.filter((c) => c.kind === 'action').length,
      opportunities: pool.filter((c) => c.kind === 'opportunity').length,
      scandalPool: cards.filter((c) => c.kind === 'scandal' && (c.actMin ?? 1) <= act).map((c) => c.id as string),
      // Offers per act: draft.atTurns months of the act × offerSize cards (rerolls and extra picks come on top).
      offerSlots: (rules.draft.atTurns as number[]).length * (rules.draft.offerSize as number),
    };
  });
  const cardList = cards.map((c) => ({
    id: c.id as string,
    kind: c.kind as string,
    lane: (c.lane ?? null) as string | null,
    actMin: (c.actMin ?? 1) as number,
    tags: (c.tags ?? []) as string[],
    requires: conditionText(c.requires),
    headlineVariants: (c.headlineKeys ?? []).length as number,
    laneHeadlineVariants: Object.fromEntries(Object.entries((c.laneText ?? {}) as Obj).map(([l, v]) => [l, ((v as Obj).headlineKeys ?? []).length])),
    inHandVariants: (c.inHandKeys ?? []).length as number,
  }));

  // ---- Events
  const eventMonths = (rules.events.months as number[]);
  const eventList = events.map((e) => {
    const w = e.when as Obj;
    return {
      id: e.id as string,
      category: e.category as string,
      form: e.form as string,
      chain: e.chain ? `${e.chain.id}:${e.chain.role}` : null,
      from: w.months.from as number,
      to: (w.months.to ?? months) as number,
      condition: conditionText(w.condition),
      weight: (w.weight ?? 1) as number,
      lane: (w.lane ?? null) as string | null,
      rival: (w.rival ?? null) as string[] | null,
      first: w.first === true,
      messages: (e.messageKeys as string[]).length,
      unmetMessages: (e.unmetMessageKeys ?? []).length as number,
      choices: (e.choices as unknown[]).length,
      photo: e.photo !== undefined,
    };
  });
  const chains = new Map<string, { opener: string[]; followUps: string[] }>();
  for (const e of eventList) {
    if (!e.chain) continue;
    const [id, role] = e.chain.split(':') as [string, string];
    const c = chains.get(id) ?? { opener: [], followUps: [] };
    (role === 'opener' ? c.opener : c.followUps).push(e.id);
    chains.set(id, c);
  }
  const byMonth = eventMonths.map((m) => {
    const inWindow = eventList.filter((e) => m >= e.from && m <= e.to);
    return {
      month: m,
      season: seasonOf(m),
      inWindow: inWindow.length,
      openersAndOneOffs: inWindow.filter((e) => !e.chain?.endsWith(':followUp')).length,
      followUps: inWindow.filter((e) => e.chain?.endsWith(':followUp')).length,
      noCondition: inWindow.filter((e) => e.condition === '-' && !e.chain?.endsWith(':followUp')).length,
      ids: inWindow.map((e) => e.id),
    };
  });
  const bySeason = (rules.seasons as string[]).map((season, i) => {
    const set = new Set<string>();
    for (const m of eventMonths) if (Math.ceil(m / perAct) === i + 1) for (const e of eventList) if (m >= e.from && m <= e.to) set.add(e.id);
    return { season, events: set.size };
  });

  // ---- Press: scandals' headlines, world stories, sagas, rival
  const papers = (press.papers as Obj[]).map((p) => {
    const world = (p.world as Obj[]) ?? [];
    return {
      id: p.id as string,
      world: world.length,
      worldAlways: world.filter((s) => s.act === undefined).length,
      worldByAct: Array.from({ length: acts }, (_, i) => world.filter((s) => s.act === i + 1).length),
      spillover: (p.spilloverKeys ?? []).length as number,
      filler: (p.fillerKeys ?? []).length as number,
      sagas: ((p.sagas as Obj[]) ?? []).length,
      sagaBeats: ((p.sagas as Obj[]) ?? []).reduce((n, s) => n + (s.beats as unknown[]).length, 0),
    };
  });
  const rival = (press.rival.arcs as Obj[]).map((a) => ({ id: a.id as string, major: a.major as string, beats: (a.beats as unknown[]).length, award: (a.award ?? null) as string | null }));

  // ---- Doors, endings, awards
  const doors = Array.from({ length: acts }, (_, i) => ({
    act: i + 1,
    season: (rules.seasons as string[])[i] as string,
    offeredPerSeason: rules.gatesOffered as number,
    gates: gates.filter((g) => g.act === i + 1).map((g) => ({ id: g.id as string, requires: conditionText(g.requires), flavorVariants: (g.flavorKeys ?? []).length as number })),
  }));
  const majors = (endings.majors as Obj[]).map((m) => ({ id: m.id as string, on: m.on as Obj }));
  const minors = (endings.minors as Obj[]).map((m) => ({
    id: m.id as string,
    major: m.major as string,
    fallback: m.fallback === true,
    condition: m.fallback ? '(fallback)' : conditionText(m.conditions),
    textVariants: (m.textKeys ?? []).length as number,
  }));
  const awardList = awards.map((a) => ({ id: a.id as string, fallback: a.fallback === true, condition: a.fallback ? '(only when no other is won)' : conditionText(a.conditions) }));

  // ---- Managers: lines, sign-offs, month-end lines, last words, notes
  const noteKeys = Object.keys(i18n).filter((k) => k.startsWith('notes.'));
  const managerList = managers.map((m) => {
    const lines = Object.entries((m.lines ?? {}) as Obj).map(([key, v]) => ({ key, variants: (v as unknown[]).length }));
    const signoffs = (m.signoffs ?? {}) as Obj;
    const notes = noteKeys.filter((k) => k.endsWith(`.${m.id}`) || k.endsWith(`.${m.id}.touch`));
    return {
      id: m.id as string,
      name: (i18n[m.nameKey] ?? m.id) as string,
      lineGroups: lines.length,
      lineVariants: lines.reduce((n, l) => n + l.variants, 0),
      singleVariantLineGroups: lines.filter((l) => l.variants === 1).map((l) => l.key),
      signoffEasy: (signoffs.easy ?? []).length as number,
      signoffHard: (signoffs.hard ?? []).length as number,
      monthEndLines: (m.perk?.monthEndKeys ?? []).length as number,
      lastWords: Object.keys((m.lastWord ?? {}) as Obj).length,
      noteKeys: notes.length,
      noteTopics: [...new Set(notes.map((k) => k.split('.')[1] as string))],
    };
  });

  // ---- One-time text groups (and every other line group) by number of variants
  const groups = variantGroups(raw);
  const histogram = (gs: readonly VariantGroup[]) => ({ one: gs.filter((g) => g.keys.length === 1).length, two: gs.filter((g) => g.keys.length === 2).length, threePlus: gs.filter((g) => g.keys.length >= 3).length, zero: gs.filter((g) => g.keys.length === 0).length });
  const once = groups.filter((g) => g.kind === 'once');
  const byKind: Record<string, ReturnType<typeof histogram> & { groups: number; variants: number }> = {};
  for (const kind of [...new Set(groups.map((g) => g.kind))].sort()) {
    const gs = groups.filter((g) => g.kind === kind);
    byKind[kind] = { groups: gs.length, variants: gs.reduce((n, g) => n + g.keys.length, 0), ...histogram(gs) };
  }

  // The printed answers of events (a line group of their own, core/lines.ts take): one group per answer that prints.
  const eventPress = events.flatMap((e) => ((e.choices as Obj[]) ?? []).flatMap((c, i) => (c.press ? [{ id: `event:${e.id as string}:${i}`, variants: (c.press.lineKeys as string[]).length }] : [])));
  return {
    rules: { acts, turnsPerAct: perAct, months, eventMonths, offerSize: rules.draft.offerSize as number, draftTurns: rules.draft.atTurns as number[], maxChains: rules.events.maxChains as number, gatesOffered: rules.gatesOffered as number },
    cards: { total: cards.length, draftable: draftable.length, scandals: cards.filter((c) => c.kind === 'scandal').length, startingDeck, startingDeckSize: startingDeck.reduce((n, s) => n + s.count, 0), byAct, list: cardList },
    events: {
      total: eventList.length,
      chains: chains.size,
      chainSteps: eventList.filter((e) => e.chain).length,
      standalone: eventList.filter((e) => !e.chain).length,
      chainList: [...chains].map(([id, c]) => ({ id, opener: c.opener, followUps: c.followUps, steps: c.opener.length + c.followUps.length })),
      byMonth,
      bySeason,
      list: eventList,
    },
    press: { papers, rival, scandalCards: cards.filter((c) => c.kind === 'scandal').length },
    doors,
    endings: { majors, minors, majorCount: majors.length, minorCount: minors.length },
    awards: { total: awardList.length, withoutFallback: awardList.filter((a) => !a.fallback).length, list: awardList },
    managers: managerList,
    oneTimeTexts: {
      total: once.length,
      ...histogram(once),
      singleVariant: once.filter((g) => g.keys.length === 1).map((g) => ({ id: g.id, owner: g.owner, variants: g.keys.length })),
      twoVariants: once.filter((g) => g.keys.length === 2).length,
      groups: once.map((g) => ({ id: g.id, variants: g.keys.length })),
    },
    lineGroupsByKind: byKind,
    eventPress: { groups: eventPress.length, single: eventPress.filter((g) => g.variants === 1).length, list: eventPress },
    singleVariantAll: groups.filter((g) => g.keys.length === 1).map((g) => ({ id: g.id, kind: g.kind, owner: g.owner })),
    onceItemExamples: [onceItem.opening, onceItem.opener(2), onceItem.gate('gate_audition'), onceItem.ending('star')],
  };
}

export type Inventory = ReturnType<typeof buildInventory>;
