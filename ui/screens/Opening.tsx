// The manager choice (round R1, Part B; README §8, mockups/screens.html "Choose your manager", shot 13), dealt onto
// the desk since round R3: the title became the desk itself (ui/desk/Title.tsx). Every label is the mockup's,
// approved; every manager line comes from content.

import type { Action, GameState } from '../../core/index.ts';
import { t } from '../i18n.ts';
import type { Legal } from '../preview.ts';
import { useStampedChoice } from './common.tsx';

/**
 * Before month 1 (round 2b): two business cards dealt onto the desk — Dex black and gold, Mags cream — each with
 * who they are, their perk's name and rule, and how they text. A click stamps SIGNED, then the first month begins.
 */
export function ManagerScreen({ s, legal, act }: { s: GameState; legal: Legal; act: (a: Action) => void }) {
  const [chosen, choose] = useStampedChoice<string>((managerId) => act({ type: 'CHOOSE_MANAGER', managerId }));
  const m = s.content.managers;
  if (!m) return null;
  return (
    <div className={`scr manager-choice${chosen ? ' done' : ''}`} data-screen="manager">
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
