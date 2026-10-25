// The desk's icons (round V1a; README §1, §6): one set of SVG symbols, drawn once per page and used by
// reference, as the mockup (v18) draws them. Their colour is the element's `color`: the stat bar's icon
// colours never change (tokens.css).

import type { IconId } from './model.ts';
import type { SeasonId } from '../../core/index.ts';

export function IconDefs() {
  return (
    <svg className="icondefs" width="0" height="0" aria-hidden="true">
      <defs>
        <symbol id="i-star" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.8 5.8 21.4l1.6-7L2 9.7l7.1-.6z" />
        </symbol>
        <symbol id="i-note" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9 3v11.3A3.5 3.5 0 1 0 11 17V8h8V3z" />
        </symbol>
        <symbol id="i-cash" viewBox="0 0 24 24">
          <rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="5.5" cy="12" r="1" fill="currentColor" />
          <circle cx="18.5" cy="12" r="1" fill="currentColor" />
        </symbol>
        <symbol id="i-clap" viewBox="0 0 24 24">
          <rect x="3" y="10" width="18" height="11" rx="1.5" fill="currentColor" />
          <path d="M3 9 L20 5.5 L21 8.5 L3.8 12 Z" fill="currentColor" />
          <path d="M7 8.3 L9.5 11 M12 7.2 L14.5 10 M17 6.2 L19.2 9" stroke="#15120E" strokeWidth="1.4" />
        </symbol>
        <symbol id="i-cards" viewBox="0 0 24 24">
          <rect x="3.5" y="6" width="11" height="15" rx="1.6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8.5 4.2 L19 3 a1.6 1.6 0 0 1 1.8 1.4 L22 16.6 a1.6 1.6 0 0 1-1.4 1.8 L17 18.8" fill="none" stroke="currentColor" strokeWidth="2" />
        </symbol>
        {/* The scandal (round R9b, B4): the scandal card itself, tilted, its ✕ cut out — one even-odd path and no mask,
            so the sprite can be mounted twice. */}
        <symbol id="i-paper" viewBox="0 0 24 24">
          <path transform="rotate(-9 12 12)" fill="currentColor" fillRule="evenodd" d="M7.8 3.2 H16.2 A1.8 1.8 0 0 1 18 5 V19 A1.8 1.8 0 0 1 16.2 20.8 H7.8 A1.8 1.8 0 0 1 6 19 V5 A1.8 1.8 0 0 1 7.8 3.2 Z M13.48 8.82 L15.18 10.52 L13.70 12.00 L15.18 13.48 L13.48 15.18 L12.00 13.70 L10.52 15.18 L8.82 13.48 L10.30 12.00 L8.82 10.52 L10.52 8.82 L12.00 10.30 Z" />
        </symbol>
        <symbol id="i-gear" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" strokeWidth="3.4" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="10.3" y="1.8" width="3.4" height="4.6" rx=".5" fill="currentColor" transform={`rotate(${a} 12 12)`} />
          ))}
        </symbol>
        <symbol id="i-bulb" viewBox="0 0 24 24">
          <circle cx="12" cy="10" r="6.6" fill="currentColor" />
          <rect x="8.8" y="17.4" width="6.4" height="2.1" rx=".9" fill="currentColor" />
          <rect x="9.6" y="20.3" width="4.8" height="1.9" rx=".9" fill="currentColor" />
        </symbol>
        <symbol id="i-flame" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2c1.2 3.6 5.5 5.3 5.5 10.6A5.5 5.5 0 0 1 6.5 12.6c0-2.8 1.6-4.3 2.4-6.2.9 2 1.6 3 2.9 3.4C12.2 7 11 5.2 12 2z" />
        </symbol>
        <symbol id="s-spring" viewBox="0 0 24 24">
          <path d="M12 22V11" stroke="currentColor" strokeWidth="2.2" fill="none" />
          <path d="M12 13C12 8 8 5 3 5c0 5 4 8 9 8z" fill="currentColor" />
          <path d="M12 11c0-4 3-7 8-7 0 4-3 7-8 7z" fill="currentColor" />
        </symbol>
        <symbol id="s-summer" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
          </g>
        </symbol>
        <symbol id="s-autumn" viewBox="0 0 24 24">
          <path d="M20 3C9 3 4 9 4 16c0 1.5.3 3 .8 4.2C6 13 11 9 17 7c-5 3-9 7-11 13.5C7 21 8.5 21 10 21c7 0 10-6 10-18z" fill="currentColor" />
        </symbol>
        <symbol id="s-winter" viewBox="0 0 24 24">
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" />
            <path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

/** When a pointer last went down anywhere on the page: a focus that follows it within a moment is the pointer's. */
let lastPointerDown = Number.NEGATIVE_INFINITY;
if (typeof document !== 'undefined') document.addEventListener('pointerdown', () => (lastPointerDown = performance.now()), true);

/**
 * Whether an element's focus came from the keyboard (Tab), not from a pointer: a tap or a click also focuses a
 * cell or a card, and on touch a tooltip is a long-press. Read from the last pointer press rather than
 * `:focus-visible`, which older Safari does not know and a window in the background never shows.
 */
export function keyboardFocus(_el: Element): boolean {
  return performance.now() - lastPointerDown > 600;
}

/** One icon by reference; `className` sets its size and colour. */
export function Icon({ id, className }: { id: IconId; className?: string }) {
  return (
    <svg className={className ? `ic ${className}` : 'ic'} aria-hidden="true">
      <use href={`#i-${id}`} />
    </svg>
  );
}

/** A season's mark (README §1): its sprout, sun, leaf or snowflake. */
export function SeasonMark({ season, className }: { season: SeasonId; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#s-${season}`} />
    </svg>
  );
}
