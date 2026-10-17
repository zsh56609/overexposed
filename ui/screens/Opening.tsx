// The title and the manager choice (round R1, Part B; README §8, mockups/screens.html "Title" and "Choose your
// manager", shots 12 and 13). Every label is the mockup's, approved; every manager line and the opening come from
// content. The run's seed is never shown (?seed= still replays one).

import type { Action, GameState } from '../../core/index.ts';
import { content } from '../content.ts';
import { t } from '../i18n.ts';
import type { Legal } from '../preview.ts';
import { openingText } from '../text.ts';
import { FoundDots, prose, useStampedChoice } from './common.tsx';

/** The itch cover's fan of cards, drawn in code (the mockup's five: one red, a scandal). Decoration only. */
const FAN: readonly (readonly [number, number, number, boolean])[] = [
  [-22, 40, 470, false],
  [-11, 150, 452, false],
  [0, 262, 444, false],
  [11, 372, 452, true],
  [22, 478, 470, false],
];

/** The title's small links (round R1, Part G), each to its panel. */
const LINKS = ['scrapbook', 'settings', 'credits'] as const;
type TitleLink = (typeof LINKS)[number];

export function TitleScreen({ seed, found, onBegin, open }: { seed: number; found: ReadonlySet<string>; onBegin: () => void; open: (panel: TitleLink) => void }) {
  const opening = openingText(content, seed);
  const label: Record<TitleLink, string> = { scrapbook: t('ui.title.scrapbook'), settings: t('ui.title.settings'), credits: t('ui.title.credits') };
  return (
    <div className="scr title-screen" data-screen="title">
      <div className="tband">
        <h1>{t('ui.title.name')}</h1>
        <div className="rule" />
        <div className="sub">{t('ui.title.tagline')}</div>
      </div>
      <div className="tred" />
      {/* The opening's first paragraph names the season ("Spring."): set as the mockup's season label. */}
      <div className="premise">
        {opening.split('\n\n').map((para, i) => (
          <p key={i} className={prose(para, i === 0 ? 'season' : '')}>
            {para}
          </p>
        ))}
      </div>
      <button className="begin big" onClick={onBegin}>
        {t('ui.title.begin')}
      </button>
      <FoundDots minors={content.endings.minors} found={found} />
      <nav className="links">
        {LINKS.map((link) => (
          <button key={link} className={`link ${link}-open`} onClick={() => open(link)}>
            {label[link]}
          </button>
        ))}
      </nav>
      <div className="fan" aria-hidden="true" data-deco="1">
        {FAN.map(([rot, left, top, red], i) => (
          <div key={i} className={`tc${red ? ' red' : ''}`} style={{ left, top, transform: `rotate(${rot}deg)`, animationDelay: `${0.1 + i * 0.09}s` }}>
            <div className="ph" />
            <div className="bar" />
            <div className="bar s" />
            <div className="ln" />
            <div className="ln s" />
            <div className="ln" />
            {red && <div className="x">✕</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The mirror's bulbs over the vanity, as the mockup sets them: ten along the top, three down each side. */
const BULBS: readonly (readonly [number, number])[] = [
  ...Array.from({ length: 10 }, (_, i) => [14 + i * 56, 5] as const),
  ...[1, 2, 3].flatMap((i) => [[5, 5 + i * 60] as const, [540, 5 + i * 60] as const]),
];

/**
 * Before month 1 (round 2b): two business cards lying on the vanity under the mirror — Dex black and gold, Mags
 * cream — each with who they are, their perk's name and rule, and how they text. A click stamps SIGNED, then the
 * first month begins.
 */
export function ManagerScreen({ s, legal, act }: { s: GameState; legal: Legal; act: (a: Action) => void }) {
  const [chosen, choose] = useStampedChoice<string>((managerId) => act({ type: 'CHOOSE_MANAGER', managerId }));
  const m = s.content.managers;
  if (!m) return null;
  return (
    <div className={`scr manager-choice${chosen ? ' done' : ''}`} data-screen="manager">
      <div className="mgMirror" aria-hidden="true" data-deco="1">
        <div className="gl" />
        {BULBS.map(([left, top], i) => (
          <i key={i} className="mgBulb" style={{ left, top }} />
        ))}
      </div>
      <div className="mgDesk" aria-hidden="true" data-deco="1">
        <div className="top" />
      </div>
      <div className="mgHead">
        <small>{t(m.choice.kickerKey)}</small>
        <h2>{t(m.choice.titleKey)}</h2>
        <p>{t(m.choice.subtitleKey)}</p>
      </div>
      <div className="mgCards">
        {m.managers.map((mg) => (
          <div key={mg.id} className={`biz m-${mg.id}${chosen === mg.id ? ' chosen' : ''}`}>
            <button className="bcard choose" data-manager={mg.id} disabled={!legal.managers.has(mg.id)} onClick={() => choose(mg.id)}>
              <span className="nm">{t(mg.nameKey)}</span>
              <span className="role">{t(mg.roleKey)}</span>
              <span className="q">{t(mg.quoteKey)}</span>
              <span className="desc">{t(mg.descriptionKey)}</span>
              <span className="perk">
                <b>{t(mg.perk.nameKey)}</b>
                {t(mg.perk.effectKey)}
              </span>
              <span className="tag">{t(mg.tagKey)}</span>
            </button>
            <span className="stamp" aria-hidden="true">
              {t('ui.manager.signed')}
            </span>
            <div className="sample">
              <small>{t(mg.sample.labelKey)}</small>
              <div className="bub">{t(mg.sample.key)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mgFoot">{t('ui.manager.footer')}</div>
    </div>
  );
}
