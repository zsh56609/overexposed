// Round R11a, part A as text: the static inventory (inventory.ts), counted from the content files and en.json.

const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

export function renderInventory(inv: any): string {
  const o: string[] = [];
  const h = (t: string) => o.push(`\n## ${t}\n`);
  h('A1. Cards');
  o.push(`Cards in content: ${inv.cards.total} (${inv.cards.draftable} draftable, ${inv.cards.scandals} scandal). Starting deck: ${inv.cards.startingDeckSize} cards — ${inv.cards.startingDeck.map((s: any) => `${s.id}${s.count > 1 ? ` ×${s.count}` : ''}`).join(', ')}.\n`);
  o.push('The offer pool by season (a draft offers 3 cards at the start of months 1 and 2 of each season = 6 shown per season, 8 drafts a year; rerolls and extra picks come on top; once a lane is established an offer holds at least one card of it). A card joins the pool in the season of its `actMin`.\n');
  o.push(table(['season', 'pool', 'music', 'screen', 'celebrity', 'neutral', 'actions', 'opportunities', 'new this season', 'scandal cards in play'], inv.cards.byAct.map((a: any) => [`${a.act} ${a.season}`, a.pool, a.byLane.music, a.byLane.screen, a.byLane.celebrity, a.byLane.neutral, a.actions, a.opportunities, a.newThisAct.join(', ') || '-', a.scandalPool.length])));
  o.push('\nEvery card:\n');
  o.push(table(['card', 'kind', 'lane', 'from season', 'tags', 'requires', 'headline variants', 'lane-text variants', 'in-hand variants'], inv.cards.list.map((c: any) => [c.id, c.kind, c.lane ?? '-', c.actMin, c.tags.join('/'), c.requires, c.headlineVariants, Object.entries(c.laneHeadlineVariants).map(([l, n]) => `${l} ${n}`).join(', ') || '-', c.inHandVariants || '-'])));
  h('A2. Events between months (texts, letters, phone threads)');
  o.push(`${inv.events.total} events: ${inv.events.standalone} one-offs and ${inv.events.chainSteps} chain steps in ${inv.events.chains} chains (${inv.events.chainList.map((c: any) => `${c.id}: ${c.steps} steps`).join(', ')}). Event months: ${inv.rules.eventMonths.join(', ')} (one event or none a month); at most ${inv.rules.maxChains} chains open at once; an event comes at most once a year. A lane (music, screen, celebrity) doubles an event's weight; it is not a gate.\n`);
  o.push(table(['event month', 'season', 'events with the month in their window', 'openers + one-offs', 'follow-ups', 'of those with no condition'], inv.events.byMonth.map((m: any) => [m.month, m.season, m.inWindow, m.openersAndOneOffs, m.followUps, m.noCondition])));
  o.push(`\nBy season (events with at least one of the season's event months in their window): ${inv.events.bySeason.map((s: any) => `${s.season} ${s.events}`).join(', ')}.\n`);
  o.push(table(['event', 'category', 'form', 'chain', 'months', 'condition', 'weight', 'lane', 'rival arc', 'first-marked', 'messages', 'replies'], inv.events.list.map((e: any) => [e.id, e.category, e.form, e.chain ?? '-', `${e.from}-${e.to}`, e.condition, e.weight, e.lane ?? '-', e.rival?.join('/') ?? '-', e.first ? 'yes' : '-', e.messages + (e.unmetMessages ? `+${e.unmetMessages}` : ''), e.choices])));
  o.push(`\nChains: ${inv.events.chainList.map((c: any) => `**${c.id}** opener ${c.opener.join('/')} → ${c.followUps.join(', ')}`).join('; ')}.`);
  h('A3. Scandals and newspaper headlines');
  o.push(`Scandal cards: ${inv.press.scandalCards} (${inv.cards.list.filter((c: any) => c.kind === 'scandal').map((c: any) => `${c.id} from season ${c.actMin}`).join(', ')}).\n`);
  o.push(table(['paper', 'world stories', 'any season', 'by season 1/2/3/4', 'frenzy spill-overs', 'fame filler', 'sagas (beats)'], inv.press.papers.map((p: any) => [p.id, p.world, p.worldAlways, p.worldByAct.join('/'), p.spillover, p.filler, `${p.sagas} (${p.sagaBeats})`])));
  o.push(`\nRival arcs (one is fixed by the seed each year): ${inv.press.rival.map((r: any) => `${r.id} (${r.major}, ${r.beats} beats${r.award ? `, award ${r.award}` : ''})`).join(', ')}.`);
  h('A4. Doors, endings, awards');
  o.push(table(['season', 'doors that exist', 'offered', 'door: requirement'], inv.doors.map((d: any) => [d.act, d.gates.length, d.offeredPerSeason, d.gates.map((g: any) => `${g.id}: ${g.requires}`).join('; ')])));
  o.push(`\nEndings: ${inv.endings.majorCount} major (${inv.endings.majors.map((m: any) => m.id).join(', ')}) and ${inv.endings.minorCount} minor.\n`);
  o.push(table(['minor ending', 'major', 'condition', 'text variants'], inv.endings.minors.map((m: any) => [m.id, m.major, m.condition, m.textVariants])));
  o.push(`\nAwards: ${inv.awards.total} (${inv.awards.withoutFallback} with conditions, one fallback); up to 8 can be won in a year.\n`);
  o.push(table(['award', 'conditions'], inv.awards.list.map((a: any) => [a.id, a.condition])));
  h('A5. Manager lines and notes, per manager');
  o.push(table(['manager', 'line groups (triggers)', 'line variants', 'single-variant line groups', 'sign-offs easy/hard', 'month-end lines', 'last words', 'note keys'], inv.managers.map((m: any) => [`${m.name} (${m.id})`, m.lineGroups, m.lineVariants, m.singleVariantLineGroups.join(', ') || 'none', `${m.signoffEasy}/${m.signoffHard}`, m.monthEndLines || '-', m.lastWords, m.noteKeys])));
  o.push(`\nThe notes are shown by the UI to a new player (notes on) and are not played by the sim; counted from en.json (keys include the touch variants and the sign-off key): ${inv.managers.map((m: any) => `${m.id}: ${m.noteTopics.join(', ')}`).join(' · ')}.`);
  h('A6. One-time text groups (shown once a run), by number of variants');
  o.push(`${inv.oneTimeTexts.total} groups (the opening, the season cards after spring's, one per door, one per minor ending): 1 variant: **${inv.oneTimeTexts.one}**, 2 variants: **${inv.oneTimeTexts.two}**, 3 or more: **${inv.oneTimeTexts.threePlus}**, none: ${inv.oneTimeTexts.zero}. Groups with a single variant: ${inv.oneTimeTexts.singleVariant.length ? inv.oneTimeTexts.singleVariant.map((g: any) => g.id).join(', ') : 'none'}.\n`);
  o.push('Every kind of line group, by variants:\n');
  o.push(table(['kind', 'groups', 'variants', '1 variant', '2', '3+'], Object.entries(inv.lineGroupsByKind).map(([k, v]: [string, any]) => [k, v.groups, v.variants, v.one, v.two, v.threePlus])));
  o.push(`\nGroups of any kind with a single variant (${inv.singleVariantAll.length}): ${inv.singleVariantAll.map((g: any) => g.id).join(', ') || 'none'}.`);
  o.push(`\nEvents' printed answers (a line group each): ${inv.eventPress.groups} groups, ${inv.eventPress.single} with a single variant: ${inv.eventPress.list.filter((g: any) => g.variants === 1).map((g: any) => g.id).join(', ') || 'none'}.`);
  return o.join('\n');
}
