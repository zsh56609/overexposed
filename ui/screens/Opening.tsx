// The manager choice (round R1, Part B; README §8, mockups/screens.html "Choose your manager", shot 13), dealt onto
// the desk since round R3: the title became the desk itself (ui/desk/Title.tsx). Every label is the mockup's,
// approved; every manager line comes from content.

import { useLayoutEffect, useRef } from 'react';
import type { Action, GameState } from '../../core/index.ts';
import { t } from '../i18n.ts';
import { motionMode } from '../motion.ts';
import type { Legal } from '../preview.ts';
import type { BeatKind } from '../timeline.ts';
import { useStampedChoice } from './common.tsx';

/**
 * The signed card flies into the phone and fades there (round R3, B3): the manager lives in it now. Measured on
 * the stage, so its scale never enters into it; reduced motion only fades it.
 */
function flyToPhone(card: HTMLElement): Animation | null {
  const phone = document.querySelector('.desk .phone');
  const stage = document.querySelector('.stage');
  if (!phone || !stage) return null;
  if (motionMode() !== 'full') return card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
  const k = stage.getBoundingClientRect().width / 1280;
  const a = card.getBoundingClientRect();
  const b = phone.getBoundingClientRect();
  const dx = (b.x + b.width / 2 - (a.x + a.width / 2)) / k;
  const dy = (b.y + b.height / 2 - (a.y + a.height / 2)) / k;
  return card.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(-10deg) scale(.18)`, opacity: 0.9, offset: 0.8 },
      { transform: `translate(${dx}px, ${dy}px) rotate(-10deg) scale(.1)`, opacity: 0 },
    ],
    { duration: 600, easing: 'cubic-bezier(.45, 0, .25, 1)', fill: 'forwards' },
  );
}

/**
 * Before month 1 (round 2b): two business cards dealt onto the desk — Dex black and gold, Mags cream — each with
 * who they are, their perk's name and rule, and how they text. A click stamps SIGNED, then the first month begins.
 */
export function ManagerScreen({ s, legal, act, beats = [], chosen: signed = null }: { s: GameState; legal: Legal; act: (a: Action) => void; beats?: readonly BeatKind[]; chosen?: string | null }) {
  const [stamped, choose] = useStampedChoice<string>((managerId) => act({ type: 'CHOOSE_MANAGER', managerId }));
  const chosen = stamped ?? signed;
  const away = beats.includes('signAway');
  const flying = beats.includes('toPhone');
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!flying || !chosen) return;
    const card = root.current?.querySelector<HTMLElement>(`.biz.m-${chosen}`);
    const flight = card ? flyToPhone(card) : null;
    return () => flight?.cancel();
  }, [flying, chosen]);
  const m = s.content.managers;
  if (!m) return null;
  return (
    <div ref={root} className={`scr manager-choice${chosen ? ' done' : ''}${away ? ' away' : ''}`} data-screen="manager">
      <div className="mgHead">
        <small>{t(m.choice.kickerKey)}</small>
        <h2>{t(m.choice.titleKey)}</h2>
        <p>{t(m.choice.subtitleKey)}</p>
      </div>
      <div className="mgCards">
        {m.managers.map((mg) => (
          <div key={mg.id} className={`biz m-${mg.id}${chosen === mg.id ? ' chosen' : away ? ' gone' : ''}`}>
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
