// The stat bar (round V1a; README §1): hype · craft · heat · next scandal · money · actions, then the season
// marks and the date, across the top 46px. Five equal cells of 114px from x=16; the actions cell fixed at
// 586–694 so its bulbs centre on x=640. Every word and number is the adapter's (./model.ts); a tooltip on
// every cell — hover, long-press on touch, or keyboard focus. Values change plainly: V1b rolls them.

import { memo, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';
import type { SeasonId } from '../../core/index.ts';
import { isPlaceholder } from '../text.ts';
import { Icon, keyboardFocus, SeasonMark } from './Icons.tsx';
import type { StatBarModel, StatCellModel } from './model.ts';

type TipId = StatCellModel['id'] | 'actions' | 'when';

/** Where the tooltip stands: under its cell, kept on the stage (the mockup's 1280 − 252). */
const tipLeft = (el: HTMLElement): number => Math.min(el.offsetLeft, 1280 - 252);

const PILL: Record<string, string> = { calm: '', amber: ' warn', red: ' close', crossed: ' over' };

export const StatBar = memo(function StatBar({ stats, season, onDeck }: { stats: StatBarModel; season: SeasonId; onDeck: () => void }) {
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
    const cell = stats.cells.find((c) => c.id === id);
    return { header: cell?.tipHeader ?? '', line: cell?.tipLine ?? '' };
  };
  const shown = tip ?? last;
  const words = shown ? text(shown.id) : null;

  return (
    <>
      <div className="stats" data-hook="stats">
        {stats.cells.map((cell) => (
          <div key={cell.id} className={`cell ${cell.id}`} {...bind(cell.id)}>
            {cell.id === 'next' ? (
              <span className={`pill${PILL[cell.level ?? 'calm'] ?? ''}`} data-hook="countdown">
                <Icon id={cell.icon} />
                <em>{cell.word}</em>
              </span>
            ) : (
              <>
                <Icon id={cell.icon} className={cell.icon === 'clap' ? 'clap' : undefined} />
                <span className="w" data-hook={`value-${cell.id}`} data-final={cell.word}>
                  {cell.word}
                </span>
                {cell.number !== null && (
                  <span className="n" data-hook={`number-${cell.id}`} data-final={cell.number}>
                    {cell.number}
                  </span>
                )}
              </>
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
        <button className="deckbtn" onClick={onDeck}>
          <Icon id="cards" />
          <span>{stats.deck}</span>
        </button>
        <div className="when" {...bind('when')}>
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
