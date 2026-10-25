// The stat bar (round V1a; README §1): hype · craft · heat · next scandal · money · the bulbs, then Deck & discard,
// Settings and the date, across the top 46px. Since round R9b (B1) every cell is two rows, centred in it: a label with
// its icon over a big value and its small word. Five cells of 114px from x=16; the bulbs' cell fixed at 586–694 so its
// bulbs centre on x=640; Deck & discard 694–874 and Settings 874–988, each the button it is; the date to 1266. Every word
// and number is the adapter's (./model.ts); a tooltip on every cell — hover, long-press on touch, or keyboard focus.
// Values change plainly: V1b rolls them.

import { memo, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';
import type { SeasonId } from '../../core/index.ts';
import { isPlaceholder, type CountWords } from '../text.ts';
import { Icon, keyboardFocus, SeasonMark } from './Icons.tsx';
import type { StatBarModel, StatCellModel } from './model.ts';

type TipId = StatCellModel['id'] | 'actions' | 'when' | 'held';

/**
 * Where the tooltip stands: under its cell, kept on the stage (the mockup's 1280 − 252). Measured to the stat bar, so a
 * control inside a group stands under itself too.
 */
const tipLeft = (el: HTMLElement): number => {
  let x = 0;
  for (let a: HTMLElement | null = el; a && !a.classList.contains('stats'); a = a.offsetParent instanceof HTMLElement ? a.offsetParent : null) x += a.offsetLeft;
  return Math.min(x, 1280 - 252);
};

/** The countdown's levels, on its cell since round R9b (B1): calm, warn (amber), close (red), over (the count in a red tag). */
const LEVEL: Record<string, string> = { calm: '', amber: ' warn', red: ' close', crossed: ' over' };

/** A count set big among its small words: "<7> to draw". */
function Count({ count }: { count: CountWords }) {
  return (
    <>
      {count.lead && <i className="w">{count.lead}</i>}
      <b className="n">{count.n}</b>
      {count.tail && <i className="w">{count.tail}</i>}
    </>
  );
}

export const StatBar = memo(function StatBar({ stats, season, onDeck, onSettings }: { stats: StatBarModel; season: SeasonId; onDeck: () => void; onSettings: () => void }) {
  const [tip, setTip] = useState<{ id: TipId; left: number } | null>(null);
  // The last tooltip shown stays in the DOM while it fades out.
  const [last, setLast] = useState<{ id: TipId; left: number } | null>(null);
  const press = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip]);
  useEffect(() => () => window.clearTimeout(press.current), []);

  const show = (id: TipId, el: HTMLElement) => {
    const at = { id, left: tipLeft(el) };
    setTip(at);
    setLast(at);
  };
  const bind = (id: TipId) => ({
    tabIndex: 0,
    'data-tip': id,
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') show(id, e.currentTarget);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') setTip(null);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') return;
      const el = e.currentTarget;
      window.clearTimeout(press.current);
      press.current = window.setTimeout(() => show(id, el), 450);
    },
    onPointerUp: () => window.clearTimeout(press.current),
    onPointerCancel: () => window.clearTimeout(press.current),
    // Keyboard focus only: a tap also focuses the cell, and on touch the tooltip is a long-press.
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (keyboardFocus(e.currentTarget)) show(id, e.currentTarget);
    },
    onBlur: () => setTip(null),
  });

  const text = (id: TipId): { header: string; line: string } => {
    if (id === 'actions') return { header: stats.actions.tipHeader, line: stats.actions.tipLine };
    if (id === 'when') return { header: stats.when.tipHeader, line: stats.when.tipLine };
    if (id === 'held') return { header: stats.held.tipHeader, line: stats.held.tipLine };
    const cell = stats.cells.find((c) => c.id === id);
    return { header: cell?.tipHeader ?? '', line: cell?.tipLine ?? '' };
  };
  const shown = tip ?? last;
  const words = shown ? text(shown.id) : null;

  return (
    <>
      <div className="stats" data-hook="stats">
        {stats.cells.map((cell) => (
          <div key={cell.id} className={`cell ${cell.id}${cell.id === 'next' ? (LEVEL[cell.level ?? 'calm'] ?? '') : ''}`} {...bind(cell.id)}>
            <span className="hd">
              <Icon id={cell.icon} className={cell.icon === 'clap' ? 'clap' : undefined} />
              <span>{cell.label}</span>
            </span>
            {cell.id === 'next' ? (
              <span className="val" data-hook="countdown">
                {cell.lead && <i className="w">{cell.lead}</i>}
                <b className="n">{cell.number}</b>
                {cell.word && <i className="w">{cell.word}</i>}
              </span>
            ) : cell.number !== null ? (
              <span className="val">
                <b className="n" data-hook={`number-${cell.id}`} data-final={cell.number}>
                  {cell.number}
                </b>
                <i className="w" data-hook={`value-${cell.id}`} data-final={cell.word}>
                  {cell.word}
                </i>
              </span>
            ) : (
              <span className="val">
                <b className="w" data-hook={`value-${cell.id}`} data-final={cell.word}>
                  {cell.word}
                </b>
              </span>
            )}
          </div>
        ))}
        <div className="cell slotcell" {...bind('actions')}>
          <span className="slotbulbs" data-hook="bulbs">
            {Array.from({ length: stats.actions.total }, (_, i) => (
              // Actions are used from the left: the leftmost lit bulb goes dark first (README §9).
              <i key={i} className={i < stats.actions.total - stats.actions.left ? 'used' : undefined} />
            ))}
          </span>
        </div>
        {/* Deck & discard, the whole cell its button: the cards still to draw and played; the scandals held, from the
            first one (round R3, D1), a red newspaper chip after the counts, its tooltip on the cell. */}
        <button className="cell deckbtn" onClick={onDeck} {...(stats.held.n > 0 ? bind('held') : {})}>
          <span className="hd">
            <Icon id="cards" />
            <span>{stats.deck.label}</span>
          </span>
          <span className="val">
            <Count count={stats.deck.toDraw} />
            <i className="dot" aria-hidden="true" />
            <Count count={stats.deck.played} />
            <span className={`held${stats.held.n > 0 ? '' : ' none'}`} data-hook="held">
              <Icon id="paper" />
              <b data-hook="held-n" data-final={stats.held.n}>
                {stats.held.n}
              </b>
            </span>
          </span>
        </button>
        {/* House rules (round R1, G3), the whole cell its button. */}
        <button className="cell setbtn" onClick={onSettings} aria-label={stats.settings}>
          <span className="hd">
            <span>{stats.settings}</span>
          </span>
          <span className="val">
            <Icon id="gear" />
          </span>
        </button>
        <div className="cell when" {...bind('when')}>
          <span className="strip">
            {stats.when.marks.map((m, i) => (
              <SeasonMark key={i} season={season} className={m === 'next' ? undefined : m} />
            ))}
          </span>
          <b data-hook="date">{stats.when.date}</b>
        </div>
      </div>
      <div className={`tip${tip ? ' on' : ''}`} role="tooltip" style={{ left: shown?.left ?? 0 }} aria-hidden={tip ? undefined : true}>
        <b>{words?.header}</b>
        <span className={words && isPlaceholder(words.line) ? 'placeholder' : undefined}>{words?.line}</span>
      </div>
    </>
  );
});
