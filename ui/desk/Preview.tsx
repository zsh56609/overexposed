// The hover and long-press previews (decisions 2, 21), dressed for the desk; their results shown as the card faces
// show them since round R2 (0.3): an icon and a number in the resource's colour ("★ +3", "+$1,000"), the action
// bulb for actions, the newspaper for scandal cards, and heat as "🔥 2 → 6 · 1 TO GO". Words only where no number
// is involved: the story, a card added or removed, a flag, a line crossed, why a card can't be played.

import { getCard, getManager, type ContentIndex } from '../../core/index.ts';
import { t } from '../i18n.ts';
import type { EndTurnPreview, Outcome, PlayPreview } from '../preview.ts';
import { blockerText, cardFlavor, cardName, heatText, isPlaceholder, lineText, mastheadName, money } from '../text.ts';
import { FaceLines, Value } from './Hand.tsx';
import { Icon } from './Icons.tsx';
import { actionChip, clauseChip, craftLane, faceLines, outcomeChips, type ValueChip } from './model.ts';

const prose = (text: string, base = ''): string => `${base}${isPlaceholder(text) ? ' placeholder' : ''}`.trim();

/** A row of chips, then any results that are words. */
function Results({ chips, words }: { chips: readonly ValueChip[]; words: readonly string[] }) {
  return (
    <>
      {chips.length > 0 && (
        <p className="vals">
          {chips.map((v, i) => (
            <Value key={i} v={v} />
          ))}
        </p>
      )}
      {words.map((w, i) => (
        <p key={i}>{w}</p>
      ))}
    </>
  );
}

/**
 * A card's flavour line (round R8a, E1): it left the face in the hand, and the preview shows it — last, in the face's
 * italic, whether or not the card can be played. A scandal has none here: its in-hand line stays on its face.
 */
function Flavour({ c, cardId }: { c: ContentIndex; cardId: string }) {
  const text = getCard(c, cardId)?.kind === 'scandal' ? null : cardFlavor(c, cardId);
  return text ? <p className={prose(text, 'fl')}>{text}</p> : null;
}

/** Heat before and after, and the line it stands at: "🔥 2 → 6 · 1 TO GO". */
function HeatLine({ before, after, line }: { before: number; after: number; line: string }) {
  return (
    <p className="vals">
      <span className="r-heat">
        <Icon id="flame" />
        {t('ui.preview.heatShort', { before, after, line })}
      </span>
    </p>
  );
}

/** The headline a card would print, in its register: the preview's first line (decision 21). */
function PreviewHeadline({ c, p }: { c: ContentIndex; p: PlayPreview }) {
  const text = lineText(c, p.headline, p.cardId, p.press?.subjectKey ?? null);
  return (
    <p className={prose(text, `preview-headline${p.register ? ` reg-${p.register}` : ''}`)}>
      {p.press?.paper && <span className="paper-label">{mastheadName(c, p.press.paper)}</span>}
      {text}
    </p>
  );
}

export function PlayPreviewView({ c, p, lane, slots }: { c: ContentIndex; p: PlayPreview; lane: string | null; slots: number }) {
  // The card's own craft (round R4, A8): its needs and its results show the craft it builds, not the career's.
  const own = craftLane(c, p.cardId, lane);
  if (!p.ok || !p.outcome || !p.lineAfter) {
    const scandal = getCard(c, p.cardId)?.kind === 'scandal';
    const text = scandal ? lineText(c, p.inHand, p.cardId) : '';
    // A scandal's rules, as its face words them (when drawn, at month end); any other card, why it waits.
    const rules = faceLines(c, p.cardId, lane).filter((line) => line.label !== null && line.chips.length > 0);
    return (
      <div className="preview blocked">
        {/* A scandal prints nothing when held: its in-hand line and rules. Any other card: the story it would print. */}
        {scandal ? <p className={prose(text, 'preview-headline in-hand')}>{text}</p> : <PreviewHeadline c={c} p={p} />}
        <p className="muted">{t('ui.preview.unplayable', { card: cardName(c, p.cardId) })}</p>
        {p.blockers.map((b, i) => {
          if (b.code === 'slots')
            return (
              <p key={i} className="vals">
                <span className="lb">{t('ui.face.needs')}</span>
                <Value v={{ ...actionChip(b.cost), text: String(b.cost) }} />
                <span className="n">{t('ui.doors.have', { n: b.slots })}</span>
              </p>
            );
          if (b.code === 'requires')
            return b.clauses.map((clause, k) => {
              const chip = clauseChip(clause, own);
              if (!chip) return <p key={`${i}.${k}`}>{blockerText({ code: 'requires', clauses: [clause] })}</p>;
              return (
                <p key={`${i}.${k}`} className="vals">
                  <span className="lb">{t('ui.face.needs')}</span>
                  <Value v={chip} />
                  {'value' in clause && <span className="n">{t('ui.doors.have', { n: clause.key === 'capital' ? money(clause.value) : clause.value })}</span>}
                </p>
              );
            });
          return <p key={i}>{blockerText(b)}</p>;
        })}
        {scandal && rules.length > 0 && (
          <div className="rules">
            <FaceLines lines={rules} />
          </div>
        )}
        <Flavour c={c} cardId={p.cardId} />
      </div>
    );
  }
  // Story first, then the numbers, then the heat and any line crossing: a light warning only (decision 3).
  const crossing = Math.sign(p.linesCrossed);
  const results = outcomeChips(c, p.outcome, own, { slots: (p.slotsAfter ?? slots) - slots });
  return (
    <div className="preview">
      <PreviewHeadline c={c} p={p} />
      <Results {...results} />
      <HeatLine before={p.heatBefore} after={p.heatAfter ?? p.heatBefore} line={heatText(p.lineAfter)} />
      {crossing !== 0 && <p className="warn">{t(crossing === 1 ? 'ui.preview.crosses' : 'ui.preview.cools')}</p>}
      <Flavour c={c} cardId={p.cardId} />
    </div>
  );
}

/** What a month end's own effects and the manager's relief do, as chips. */
const results = (c: ContentIndex, o: Outcome, lane: string | null) => outcomeChips(c, o, lane, { heat: true });

export function EndTurnPreviewView({ c, p, lane }: { c: ContentIndex; p: EndTurnPreview; lane: string | null }) {
  const own = results(c, p.outcome, lane);
  // Every scandal card month end adds, from any cause, each with its cause (decision 2).
  return (
    <div className={`preview${p.scandalCards.length ? ' danger' : ''}`}>
      <h3>{t('ui.preview.endTitle')}</h3>
      {p.scandalCards.length === 0 ? (
        <p>{t('ui.preview.endNone')}</p>
      ) : (
        <>
          <p className="alarm">{t('ui.preview.endList')}</p>
          {/* Each scandal by the headline it would print (decision 21), then the card and its cause. */}
          <ul className="scandal-list">
            {p.scandalCards.map((sc, i) => {
              const card = cardName(c, sc.cardId);
              const headline = lineText(c, sc.line, sc.cardId, sc.press.subjectKey);
              const line =
                sc.cause.kind === 'crystallised'
                  ? sc.cause.cardId === null
                    ? t('ui.preview.endUnblamed', { card })
                    : t('ui.preview.endBlamed', { card, cause: cardName(c, sc.cause.cardId) })
                  : sc.cause.byCardId === null
                    ? t('ui.preview.endAddedUnknown', { card })
                    : sc.cause.byCardId === sc.cardId
                      ? t('ui.preview.endCopySelf', { card })
                      : t('ui.preview.endAdded', { card, source: cardName(c, sc.cause.byCardId) });
              return (
                <li key={i}>
                  <span className={prose(headline, 'lead')}>
                    {sc.press.paper && <span className="paper-label">{mastheadName(c, sc.press.paper)}</span>}
                    {headline}
                  </span>
                  <span className="muted cause">{line}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {/* The month end's own effects; its scandal cards are listed with their causes above. */}
      <Results chips={own.chips.filter((v) => v.kind !== 'scandal')} words={own.words} />
      {/* The manager's month-end relief, after the check (round 2b): named by the perk. */}
      {p.perk && (
        <p className="vals perk">
          <span className="lb">{t(getManager(c, p.perk.manager)?.perk.nameKey ?? `manager.${p.perk.manager}.perk.name`)}</span>
          {results(c, p.perk.outcome, lane).chips.map((v, i) => (
            <Value key={i} v={v} />
          ))}
        </p>
      )}
      {p.carries && (
        <p className="vals">
          <span className="r-heat">
            <Icon id="flame" />
            {p.heatAfter}
          </span>
          <span className="n">{t('ui.preview.endCarryShort')}</span>
        </p>
      )}
    </div>
  );
}
