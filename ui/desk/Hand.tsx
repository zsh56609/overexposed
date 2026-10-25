// The hand (round V1a; README §6): fanned, overlapping, near the camera; the paper tells the lane. Hover lifts a
// card (13px), straightens it to 60% of its tilt and scales it 1.012 after 70ms. Every card keeps its anchors —
// name at 18px, values at 70px, the italic flavour line at 108px — and a card costing more than one action
// shows that many bulbs. A click plays a card; a scandal shakes and says it can't be played; so does a card
// when the month has no actions left. Playing is plain until V1b animates it. END TURN at the bottom right.
// Words and numbers are the adapter's (./model.ts).

import { memo, useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent, type MouseEvent } from 'react';
import type { SeasonId } from '../../core/index.ts';
import { isPlaceholder } from '../text.ts';
import { hover } from '../sound/sound.ts';
import { photoUrl } from './halftone.ts';
import { Icon, keyboardFocus } from './Icons.tsx';
import type { EndTurnModel, FaceLine, HandCardModel, HandWords, ValueChip } from './model.ts';
import { CARD_W, HAND_TOP, MAX_LIFT, fan, fanSpacing } from './fan.ts';

/** Where a preview attaches: an element's box on the stage (App's Floating reads it). */
export interface DeskAnchor {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly areaWidth: number;
  readonly areaHeight: number;
}
export type HandFocus = { readonly kind: 'card'; readonly uid: number; readonly anchor: DeskAnchor } | { readonly kind: 'end'; readonly anchor: DeskAnchor } | null;

/** The fan (the mockup's layoutHand; ./fan.ts), kept clear of END TURN when draws swell the hand. */
export { fan, fanSpacing };
const HOVER_LIFT = 13;
const STAGE = { areaWidth: 1280, areaHeight: 720 };
/** A preview stands above the highest a hovered card reaches, so it never hides the other cards' names. */
const cardAnchor = (left: number): DeskAnchor => ({ left, top: HAND_TOP - MAX_LIFT - HOVER_LIFT, width: CARD_W, ...STAGE });
const END_ANCHOR: DeskAnchor = { left: 1280 - 22 - 212, top: 636, width: 212, ...STAGE };

const FACE: Record<HandCardModel['face'], string> = {
  flyer: 'f-flyer',
  score: 'f-score',
  script: 'f-script',
  revision: 'f-script f-revision',
  callsheet: 'f-callsheet',
  headshot: 'f-headshot',
  gloss: 'f-gloss',
  gold: 'f-gold',
  pass: 'f-pass',
  notebook: 'f-notebook',
  scandal: 'f-scandal',
};

const ph = (text: string | null, base: string): string => (text !== null && isPlaceholder(text) ? `${base} placeholder` : base);

/** Replays a CSS animation on an element: the shake of a card that can't be played. */
function shake(el: HTMLElement) {
  el.classList.remove('nope');
  void el.offsetWidth;
  el.classList.add('nope');
}

interface HandProps {
  readonly hiddenCards?: readonly number[];
  readonly busy: boolean;
  readonly cards: readonly HandCardModel[];
  readonly words: HandWords;
  readonly endTurn: EndTurnModel;
  readonly season: SeasonId;
  readonly play: (uid: number) => void;
  readonly end: () => void;
  readonly focus: (f: HandFocus) => void;
  readonly toast: (text: string) => void;
}

const Card = memo(function Card({ card, pos, words, season, onPlay, focus, toast, busy, hidden }: { card: HandCardModel; pos: { left: number; rot: number; lift: number; z: number }; words: HandWords; season: SeasonId; onPlay: (uid: number) => void; focus: HandProps['focus']; toast: HandProps['toast']; busy: boolean; hidden:boolean }) {
  const press = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  useEffect(() => { window.clearTimeout(press.current); return () => window.clearTimeout(press.current); }, [busy]);
  const anchor = cardAnchor(pos.left);
  const activate = (el: HTMLElement) => {
    if (card.playable) {
      focus(null);
      onPlay(card.uid);
      return;
    }
    shake(el);
    if (card.why === 'scandal') toast(words.scandal);
    else if (card.why === 'actions') toast(words.noActions);
    else focus({ kind: 'card', uid: card.uid, anchor }); // a card you can't play yet shows why
  };
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (longPressed.current) {
      longPressed.current = false; // a long-press previews; it never plays
      return;
    }
    activate(e.currentTarget);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(e.currentTarget);
    }
  };
  const headshot = card.face === 'headshot' ? { backgroundImage: `url(${photoUrl('headshot', season, 0)})` } : null;
  return (
    <div
      className={`card ${FACE[card.face]}${card.playable ? '' : ' off'}`}
      role="button"
      tabIndex={0}
      aria-disabled={!card.playable}
      aria-label={card.name}
      data-uid={card.uid}
      data-card={card.cardId}
      style={{ visibility:hidden?'hidden':undefined, left: pos.left, zIndex: pos.z, ['--rot' as string]: `${pos.rot}deg`, ['--lift' as string]: `${pos.lift}px`, ...headshot }}
      onPointerEnter={(e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'mouse') return;
        if (!busy) hover(); // once per card entered, mouse only (round R4, B2)
        focus({ kind: 'card', uid: card.uid, anchor });
      }}
      onPointerLeave={(e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse') focus(null);
      }}
      // A card that came under a resting pointer during a hold previews at the pointer's next move (round R1).
      onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && !busy) focus({ kind: 'card', uid: card.uid, anchor });
      }}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' || busy) return;
        longPressed.current = false;
        window.clearTimeout(press.current);
        press.current = window.setTimeout(() => {
          longPressed.current = true;
          focus({ kind: 'card', uid: card.uid, anchor });
        }, 450);
      }}
      onPointerUp={() => window.clearTimeout(press.current)}
      onPointerCancel={() => window.clearTimeout(press.current)}
      onFocus={(e) => {
        if (keyboardFocus(e.currentTarget)) focus({ kind: 'card', uid: card.uid, anchor });
      }}
      onBlur={() => focus(null)}
      onClick={onClick}
      onKeyDown={onKey}
    >
      <CardInk card={card} words={words} />
    </div>
  );
});

export const Hand = memo(function Hand({ cards, words, endTurn, season, play, end, focus, toast, busy, hiddenCards=[] }: HandProps) {
  const places = fan(cards.length);
  const onEnd = useCallback(() => {
    focus(null);
    end();
  }, [focus, end]);
  return (
    <>
      {/* The strip each card shows: the text keeps inside it when draws swell the hand. */}
      <div className={`hand${fanSpacing(cards.length) < 120 ? ' tight' : ''}`} data-hook="hand" style={{ ['--strip' as string]: `${fanSpacing(cards.length)}px` }}>
        {cards.map((card, i) => {
          const at = places[i] ?? { left: 0, rot: 0, lift: 0 };
          return <Card key={card.uid} card={card} pos={{ ...at, z: 10 + i }} words={words} season={season} onPlay={play} focus={focus} toast={toast} busy={busy} hidden={hiddenCards.includes(card.uid)} />;
        })}
      </div>
      <button
        className={`endbtn end ticket${endTurn.printing ? ' printing' : ''}`}
        data-hook="endturn"
        disabled={!endTurn.legal}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') focus({ kind: 'end', anchor: END_ANCHOR });
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') focus(null);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' && !busy) focus({ kind: 'end', anchor: END_ANCHOR });
        }}
        onFocus={(e) => {
          if (keyboardFocus(e.currentTarget)) focus({ kind: 'end', anchor: END_ANCHOR });
        }}
        onBlur={() => focus(null)}
        onClick={onEnd}
      >
        <b>{endTurn.title}</b>
        <span>{endTurn.sub}</span>
      </button>
    </>
  );
});

/** A value on a face: icon and number in the resource's colour, or its words; a card added leads with its sign. */
export function Value({ v }: { v: ValueChip }) {
  return (
    <span className={`r-${v.kind}`}>
      {v.lead}
      {v.icon && <Icon id={v.icon} />}
      {v.text}
    </span>
  );
}

/** The exact same printed face for hand, flight, scandal flip and settled pile. */
export function CardInk({card,words}: {card:HandCardModel;words:HandWords}) { return <>
      {card.face === 'notebook' && <span className="holes" />}
      {card.face === 'callsheet' && <span className="cs">{words.callsheet}</span>}
      {card.face === 'revision' && <span className="revtag">{words.revision}</span>}
      {card.face === 'pass' && (
        <>
          <span className="hole" />
          <span className="pass">{words.pass}</span>
        </>
      )}
      {card.cost > 1 && (
        <span className="cost2">
          {Array.from({ length: card.cost }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      )}
      {card.opportunity && <span className="opp">{words.opportunity}</span>}
      {card.scandal && <span className="x">{words.cross}</span>}
      <div className={ph(card.name, 'name')}>{card.name}</div>
      {/* One order on every face (round R1, H1): name, the body's lines, then the flavour, last. */}
      <div className="body">
        <div className="fx">
          <FaceLines lines={card.lines} />
        </div>
        {card.flavour && <div className={ph(card.flavour, 'fl')}>{card.flavour}</div>}
      </div>
  </>; }

/** A face's body lines (round R1, H1–H2), the same wherever they are shown: a card, a preview, an event's reply. */
export function FaceLines({ lines }: { lines: readonly FaceLine[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className={`ln${line.arrow ? ' br' : ''}${line.label ? ' lbl' : ''}`}>
          {/* The head — words, the condition in icons, the arrow — then what the line gives, wrapping beside it. */}
          {(line.label || line.cond.length > 0 || line.arrow) && (
            <span className="hd">
              {line.label && <span className="lb">{line.label}</span>}
              {line.cond.map((v, k) => (
                <Value key={k} v={v} />
              ))}
              {line.arrow && <span className="ar">→</span>}
            </span>
          )}
          {line.chips.length > 0 && (
            <span className="ch">
              {line.chips.map((v, k) => (
                <Value key={k} v={v} />
              ))}
            </span>
          )}
        </div>
      ))}
    </>
  );
}
export function CardPicture({card,words,season}: {card:HandCardModel;words:HandWords;season:SeasonId}) {
  return <div className={`card ${FACE[card.face]}`} data-card={card.cardId} style={{left:0,top:0,transform:'none',['--strip' as string]:'150px',...(card.face==='headshot'?{backgroundImage:`url(${photoUrl('headshot',season,0)})`}:{})}}><CardInk card={card} words={words}/></div>;
}
