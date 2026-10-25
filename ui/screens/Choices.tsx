// The offers and the season's doors (round R1, Parts C and D; README §9, mockups/vanity.html › Screen, shots 15–17):
// in the dressing room, over the dimmed desk, the stat bar still in view. Every label is the mockup's; every card,
// gate and ending word comes from content and every number from /core — the pass odds and the last door's ending
// and awards from the reducer's own preview (ui/preview.ts). No rule is computed here.

import type { KeyboardEvent } from 'react';
import { freeRerollAvailable, getGate, getManager, rerollCost, type Action, type ClauseReport, type ContentIndex, type GameState, type SeasonId } from '../../core/index.ts';
import { doorUrl } from '../desk/halftone.ts';
import { CardPicture } from '../desk/Hand.tsx';
import { Icon } from '../desk/Icons.tsx';
import { effectChips, offerCardModel, requirementChip, type HandWords, type ValueChip } from '../desk/model.ts';
import { t } from '../i18n.ts';
import { previewGate, type GatePreview, type Legal } from '../preview.ts';
import { awardName, calendarLabel, endingPair, gateFlavor, gateName, money, offerLabels, seasonName } from '../text.ts';
import { useArrivalSound } from '../sound/arrival.ts';
import { cue, cues } from '../sound/sound.ts';
import { flyToDeck, Header, prose, useStampedChoice } from './common.tsx';

/** Enter and Space take a focused card or door, as a click does. */
const onKeys = (go: () => void) => (e: KeyboardEvent) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  go();
};

/** A value chip, as on a card: icon and figure in the resource's colour; a card added leads with its sign. */
function Chip({ chip }: { chip: ValueChip }) {
  return (
    <span className={`r-${chip.kind}`}>
      {chip.lead}
      {chip.icon && <Icon id={chip.icon} />}
      {chip.text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// The offers (the draft)

interface OffersProps {
  readonly s: GameState;
  readonly legal: Legal;
  readonly act: (a: Action) => void;
  readonly lane: string | null;
  readonly season: SeasonId;
  readonly words: HandWords;
}

/**
 * "Take one." The offered cards wear the hand's faces at 1.1×, four (Dex's) at full size; Dex's extra card has its
 * paper-clipped tag. A click takes a card — the TAKEN stamp, the others fade. Below, the tickets: one more card, or
 * a new offer, greyed out when the money is not there, and the money there is. Nothing previews a card's story:
 * /core has no query for the line an offered card would print.
 */
export function OffersScreen({ s, legal, act, lane, season, words }: OffersProps) {
  // The card taken flies to Deck & Discard as its pick goes (round R4, A3e).
  const [chosen, choose] = useStampedChoice<string>((cardId) => {
    flyToDeck(document.querySelector(`.offers .lift[data-card="${cardId}"]`));
    act({ type: 'DRAFT_PICK', cardId });
  });
  // The offers rising (round R4, B2): three deals, 70 ms apart.
  useArrivalSound(() => cues('deal', 3, 70));
  const draft = s.draft;
  if (!draft) return null;
  const c = s.content;
  const labels = offerLabels(s);
  const freeKey = freeRerollAvailable(s) ? getManager(c, s.manager)?.perk.freeRerollKey : undefined;
  return (
    <div className={`scr offers draft${chosen ? ' done' : ''}`} data-screen="draft" data-picks={draft.picksLeft}>
      <Header top={40} kicker={t('ui.offers.kicker', { date: calendarLabel(c, s.turn) })} title={t('ui.offers.title')} line={t('ui.offers.line')} />
      <div className="drow faces">
        {draft.offer.map((id) => {
          const card = offerCardModel(s, id, lane);
          const take = () => {
            if (legal.picks.has(id)) choose(id);
          };
          return (
            <div key={id} className={`dslot${labels.has(id) ? ' extra' : ''}${chosen === id ? ' taken' : ''}`}>
              {labels.has(id) && <span className="dtag">{labels.get(id)}</span>}
              <div className="lift take" role="button" tabIndex={0} data-card={id} aria-label={card.name} aria-disabled={!legal.picks.has(id)} onClick={take} onKeyDown={onKeys(take)}>
                <CardPicture card={card} words={words} season={season} />
              </div>
              <span className="stampT" aria-hidden="true">
                {t('ui.offers.taken')}
              </span>
            </div>
          );
        })}
      </div>
      <div className="row tickets">
        <button
          className="tkt extra"
          disabled={!legal.extraPick || chosen !== null}
          onClick={() => {
            cue('button');
            act({ type: 'DRAFT_EXTRA_PICK' });
          }}
        >
          {t('ui.offers.extra')}
          <em>{money(c.rules.draft.extraPickCost)}</em>
        </button>
        <button
          className="tkt reroll"
          disabled={!legal.reroll || chosen !== null}
          onClick={() => {
            cue('button');
            act({ type: 'DRAFT_REROLL' });
          }}
        >
          {freeKey ? (
            t(freeKey)
          ) : (
            <>
              {t('ui.offers.reroll')}
              <em>{money(rerollCost(s))}</em>
            </>
          )}
        </button>
        <span className="have">{t('ui.offers.have', { money: money(s.resources.capital) })}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The season's doors (the gates)

/**
 * One requirement: ✓ or ✗, the stat's icon and the threshold in its colour — never the stat's name — then what the
 * player has. A requirement without a stat ("Signed to a label") is plain text. The chip is the mirror's doors card's
 * too (round R9b, A3: model.ts requirementChip).
 */
function Requirement({ clause, lane }: { clause: ClauseReport; lane: string | null }) {
  const mark = <i>{clause.met ? '✓' : '✗'}</i>;
  const chip = requirementChip(clause, lane);
  if (chip.icon && chip.cls) {
    return (
      <div className={`rq ${clause.met ? 'ok' : 'no'}`}>
        {mark}
        <Icon id={chip.icon} className={chip.cls} />
        <span className={chip.cls}>{chip.text}</span>
        <span className="n">{chip.have}</span>
      </div>
    );
  }
  return (
    <div className={`rq ${clause.met ? 'ok' : 'no'}`}>
      {mark}
      <span>{chip.text}</span>
    </div>
  );
}

function Invitation({ c, s, p, lane, last, sameEnding, chosen, take, legal }: { c: ContentIndex; s: GameState; p: GatePreview; lane: string | null; last: boolean; sameEnding: boolean; chosen: string | null; take: (id: string) => void; legal: Legal }) {
  const id = p.gateId;
  const gate = getGate(c, id);
  const flavor = gateFlavor(s, id);
  const go = () => {
    if (legal.gates.has(id)) take(id);
  };
  return (
    <div className={`inv take${chosen === id ? ' chosen' : ''}`} role="button" tabIndex={0} data-gate={id} aria-label={gateName(c, id)} aria-disabled={!legal.gates.has(id)} onClick={go} onKeyDown={onKeys(go)}>
      <span className={`odds ${p.passes ? 'y' : 'n'}`}>{t(p.passes ? 'ui.doors.likely' : 'ui.doors.unlikely')}</span>
      {/* The door's photograph (round R8a, D1): its scene and drawing from content, the papers' drawing printed in the
          scene's ink (round R8d, B3), drawn ahead by the warm-up. */}
      {gate?.photo && <div className="ivp" aria-hidden="true" style={{ backgroundImage: `url("${doorUrl(gate.photo.scene, c.rules.seasons?.[s.act - 1] ?? 'spring', gate.photo.drawing)}")` }} />}
      <div className="ivk">{t('ui.doors.invited')}</div>
      <div className="ivt">{gateName(c, id)}</div>
      <div className={prose(flavor, 'ivf')}>{flavor}</div>
      {p.clauses.length > 0 && <div className="sec">{t('ui.doors.requires')}</div>}
      {p.clauses.map((clause, i) => (
        <Requirement key={i} clause={clause} lane={lane} />
      ))}
      <div className="sec">{t('ui.doors.branches')}</div>
      <div className="oc">
        {effectChips(c, gate?.onPass ?? [], lane).map((chip, i) => (
          <Chip key={`p${i}`} chip={chip} />
        ))}
        <em>{t('ui.doors.or')}</em>
        {effectChips(c, gate?.onFail ?? [], lane).map((chip, i) => (
          <Chip key={`f${i}`} chip={chip} />
        ))}
      </div>
      {last && !sameEnding && p.majorId !== null && p.endingId !== null && <div className="ends">{t('ui.gate.leadsTo', { ending: endingPair(c, p.majorId, p.endingId) })}</div>}
      {/* At most three names, then how many more (round R8c, A3): a year wins up to eight. */}
      {last && p.awardIds && (
        <div className="night">
          <b>{t('ui.doors.night')}</b>
          {[...p.awardIds.slice(0, 3).map((a) => awardName(c, a)), ...(p.awardIds.length > 3 ? [t('ui.doors.nightMore', { n: p.awardIds.length - 3 })] : [])].join(' · ')}
        </div>
      )}
      <span className="acc" aria-hidden="true">
        {t('ui.doors.accepted')}
      </span>
    </div>
  );
}

/**
 * "Two doors. Pick one." Two invitations: what each asks, what each brings, pass or fail, and the odds from the
 * reducer's own preview. The last door of the year adds the ending either way — or each one's — and the awards each
 * choice wins on the night. A click accepts: the ACCEPTED stamp, the other fades.
 */
export function DoorsScreen({ s, legal, act, lane }: { s: GameState; legal: Legal; act: (a: Action) => void; lane: string | null }) {
  const [chosen, choose] = useStampedChoice<string>((gateId) => act({ type: 'CHOOSE_GATE', gateId }));
  // The doors laid out (round R4, B2).
  useArrivalSound(() => cue('door'));
  const c = s.content;
  const previews = s.gateOffer.map((id) => previewGate(s, id));
  // The year's last door: choosing ends the year (decision 11).
  const last = previews.some((p) => p.endingId !== null);
  const first = previews[0];
  const sameEnding = !!first && first.endingId !== null && previews.every((p) => p.endingId === first.endingId);
  const season = seasonName(c, s.act);
  const kicker = last ? t('ui.doors.lastKicker', { season }) : t('ui.doors.kicker', { season: season.toLocaleLowerCase('en') });
  const line = last
    ? sameEnding && first?.majorId && first.endingId
      ? t('ui.gate.eitherWay', { ending: endingPair(c, first.majorId, first.endingId) })
      : null
    : t('ui.doors.line', { season: seasonName(c, s.act + 1).toLocaleLowerCase('en') });
  return (
    <div className={`scr doors gates${chosen ? ' done' : ''}`} data-screen="doors">
      <Header top={34} kicker={kicker} title={t(last ? 'ui.doors.lastTitle' : 'ui.doors.title')} line={line} />
      <div className="grow">
        {previews.map((p) => (
          <Invitation key={p.gateId} c={c} s={s} p={p} lane={lane} last={last} sameEnding={sameEnding} chosen={chosen} take={choose} legal={legal} />
        ))}
      </div>
    </div>
  );
}
