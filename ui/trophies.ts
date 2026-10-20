// The awards' trophies (round R8c, B1): the author's seven drawings, docs/design/visual/ref/r8c-trophies/, unchanged,
// as strings — a gold record, a gramophone, a microphone, a star, a film reel, a laurel, a press camera. Code, never
// image files in the build (AGENTS.md §6). This module is its own chunk: ui/trophyLoad.ts imports it once the title has
// painted, so the main bundle does not grow by it. Validate holds the strings equal to the reference files, their ids
// unique.

import type { TrophyId } from '../core/index.ts';

export const TROPHIES: Readonly<Record<TrophyId, string>> = {
  gold_record: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
<!-- Overexposed, R8c trophy "gold_record": drawn in code, flat colour. -->
<defs><radialGradient id="gr-disc" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fbe7a1"/><stop offset=".45" stop-color="#efc95f"/><stop offset="1" stop-color="#a8792a"/></radialGradient></defs>
<ellipse cx="60" cy="147" rx="44" ry="3" fill="#000" opacity=".35"/><path d="M20 128 L100 128 L100 146 L20 146 Z" fill="#1b1816"/><path d="M20 128 L100 128 L96 125 L24 125 Z" fill="#3a332d"/><path d="M88 128 L100 128 L100 146 L88 146 Z" fill="#100e0c"/><path d="M30 114 L90 114 L90 125 L30 125 Z" fill="#24201d"/><path d="M30 114 L90 114 L87 111.5 L33 111.5 Z" fill="#433b34"/><path d="M81 114 L90 114 L90 125 L81 125 Z" fill="#141210"/><rect x="38" y="131" width="44" height="10" rx="1" fill="#d7a63c"/><rect x="38" y="131" width="44" height="2" fill="#fbe7a1" opacity=".7"/><g stroke="#7c5719" stroke-width="1" stroke-linecap="round"><path d="M44 135.5 L76 135.5"/><path d="M50 138.5 L70 138.5"/></g>
<path d="M44 114 L50 98 L54 98 L50 114 Z" fill="#a8792a"/><path d="M76 114 L70 98 L66 98 L70 114 Z" fill="#d7a63c"/>
<circle cx="60" cy="60" r="44" fill="#a8792a"/>
<circle cx="60" cy="60" r="42.5" fill="url(#gr-disc)"/>
<circle cx="60" cy="60" r="18" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<circle cx="60" cy="60" r="21" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<circle cx="60" cy="60" r="24" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<circle cx="60" cy="60" r="27" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<circle cx="60" cy="60" r="30" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<circle cx="60" cy="60" r="33" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<circle cx="60" cy="60" r="36" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<circle cx="60" cy="60" r="39" fill="none" stroke="#7c5719" stroke-width=".6" opacity=".35"/>
<path d="M60 60 L22 34 A44 44 0 0 1 44 20 Z" fill="#fff" opacity=".22"/><path d="M60 60 L98 86 A44 44 0 0 1 80 99 Z" fill="#fff" opacity=".12"/>
<circle cx="60" cy="60" r="14" fill="#b8282c"/><circle cx="60" cy="60" r="14" fill="none" stroke="#8c1c20" stroke-width="1"/>
<path d="M51 55 L69 55 M53 64 L67 64" stroke="#f4d9a8" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
<circle cx="60" cy="60" r="2.4" fill="#1b1816"/>
</svg>
`,
  gramophone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
<!-- Overexposed, R8c trophy "gramophone": drawn in code, flat colour. -->
<defs><linearGradient id="gm-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a1"/><stop offset=".35" stop-color="#efc95f"/><stop offset=".7" stop-color="#d7a63c"/><stop offset="1" stop-color="#a8792a"/></linearGradient><radialGradient id="gm-in" gradientUnits="userSpaceOnUse" cx="58.1" cy="38.2" r="29.7"><stop offset="0" stop-color="#120c05"/><stop offset=".45" stop-color="#2b1d0b"/><stop offset=".8" stop-color="#4f3713"/><stop offset="1" stop-color="#7d5a1f"/></radialGradient><linearGradient id="gm-lip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d6"/><stop offset=".3" stop-color="#fbe7a1"/><stop offset=".65" stop-color="#efc95f"/><stop offset="1" stop-color="#d7a63c"/></linearGradient></defs>
<ellipse cx="60" cy="147" rx="44" ry="3" fill="#000" opacity=".35"/><path d="M20 128 L100 128 L100 146 L20 146 Z" fill="#1b1816"/><path d="M20 128 L100 128 L96 125 L24 125 Z" fill="#3a332d"/><path d="M88 128 L100 128 L100 146 L88 146 Z" fill="#100e0c"/><path d="M30 114 L90 114 L90 125 L30 125 Z" fill="#24201d"/><path d="M30 114 L90 114 L87 111.5 L33 111.5 Z" fill="#433b34"/><path d="M81 114 L90 114 L90 125 L81 125 Z" fill="#141210"/><rect x="38" y="131" width="44" height="10" rx="1" fill="#d7a63c"/><rect x="38" y="131" width="44" height="2" fill="#fbe7a1" opacity=".7"/><g stroke="#7c5719" stroke-width="1" stroke-linecap="round"><path d="M44 135.5 L76 135.5"/><path d="M50 138.5 L70 138.5"/></g>
<path d="M30.0 83.6 L90.0 83.6 L90.0 91.9 L30.0 91.9 Z" fill="#9c5f35"/><path d="M30.0 91.9 L90.0 91.9 L90.0 115.4 L30.0 115.4 Z" fill="#7a4626"/>
<path d="M83.0 91.9 L90.0 91.9 L90.0 115.4 L83.0 115.4 Z" fill="#5c331b" opacity=".75"/>
<rect x="35.0" y="95.9" width="43.0" height="15.6" rx="1.5" fill="none" stroke="#d7a63c" stroke-width="1.2"/>
<path d="M31.0 92.7 L89.0 92.7" stroke="#b57446" stroke-width="1"/>
<ellipse cx="55.0" cy="88.8" rx="20.5" ry="6.0" fill="#3a2414"/>
<ellipse cx="55.0" cy="87.8" rx="19.5" ry="5.4" fill="#1b1816"/>
<ellipse cx="55.0" cy="87.8" rx="15.5" ry="4.27" fill="none" stroke="#3a3430" stroke-width=".5"/>
<ellipse cx="55.0" cy="87.8" rx="12.5" ry="3.45" fill="none" stroke="#3a3430" stroke-width=".5"/>
<ellipse cx="55.0" cy="87.8" rx="9.5" ry="2.62" fill="none" stroke="#3a3430" stroke-width=".5"/>
<ellipse cx="55.0" cy="87.8" rx="5.6" ry="1.54" fill="#b8282c"/>
<path d="M39.0 86.2 Q49.0 83.2 61.0 83.8" fill="none" stroke="#fff" stroke-width=".9" opacity=".35"/>
<path d="M26.0 43.3 L26.0 43.3 L25.8 41.0 Z M28.7 54.0 L28.8 54.4 L28.6 53.3 Z M29.3 55.8 L29.5 56.1 L29.2 55.6 Z M30.2 57.6 L30.6 58.0 L30.2 57.6 Z M30.7 58.2 L30.8 58.2 L30.7 58.2 Z M33.5 59.4 L35.9 59.5 L33.2 59.4 Z M38.9 60.7 L35.9 59.5 L35.9 59.5 Z M40.2 60.6 L40.6 60.4 L40.2 60.6 Z M40.8 60.3 L40.8 60.3 L40.8 60.3 Z M42.1 59.2 L42.5 58.7 L41.8 59.4 Z M43.4 57.4 L45.6 53.8 L43.1 57.8 Z M48.7 50.0 L48.7 50.0 L45.6 53.8 Z M49.5 48.7 L52.0 47.8 L55.8 47.1 L59.4 46.9 L63.0 47.1 L66.2 47.8 L69.1 48.8 L71.7 50.2 L73.3 51.3 L74.6 52.5 L75.8 53.8 L76.8 55.3 L77.6 56.9 L78.2 58.7 L78.6 60.5 L78.8 62.6 L78.6 66.0 L79.4 66.3 L81.1 66.6 L82.6 66.8 L83.4 66.7 L83.8 62.6 L83.8 60.0 L83.6 57.5 L83.1 55.1 L82.3 52.8 L81.4 50.5 L80.2 48.3 L78.9 46.2 L77.3 44.2 L73.7 40.2 L69.6 36.4 L59.0 27.3 L55.4 23.9 L53.6 22.0 L53.5 21.5 L53.9 23.3 L54.1 25.7 L54.1 27.1 L53.8 29.8 L52.4 36.3 L51.4 43.0 L50.8 45.6 L49.9 48.0 L48.7 50.0 Z M51.6 41.6 L51.6 41.6 L51.6 41.6 Z M51.3 13.1 L52.1 17.4 L52.1 17.4 Z M50.8 10.9 L50.8 10.9 L50.8 10.9 Z M49.9 9.3 L49.4 8.8 L49.4 8.8 Z M47.6 8.1 L47.0 8.1 L47.8 8.2 Z M31.3 18.3 L33.0 16.4 L33.5 15.7 Z M33.5 15.7 L34.5 14.2 L35.5 12.4 Z M41.0 10.3 L41.5 10.5 L40.9 10.2 Z M41.5 10.5 L42.1 10.7 L42.6 10.7 L42.1 10.7 Z M43.1 10.7 L43.3 10.7 L42.6 10.7 Z M47.6 15.7 L48.0 18.0 L48.2 18.9 Z M48.2 18.9 L48.5 19.7 L49.4 22.2 Z M49.0 33.1 L48.6 34.5 L48.4 35.6 Z M48.4 35.6 L48.1 37.9 L47.9 39.4 Z M44.7 48.4 L43.0 50.3 L42.5 51.0 Z M42.5 51.0 L41.5 52.5 L40.5 54.3 Z M36.0 57.0 L35.0 56.4 L34.5 56.2 Z M34.5 56.2 L33.9 56.0 L33.4 56.0 L33.9 56.0 Z M33.4 56.0 L32.3 56.0 L31.7 56.1 Z M28.4 51.0 L28.0 48.7 L27.8 47.8 Z M27.8 47.8 L27.2 46.1 L26.6 44.5 Z M27.0 33.6 L27.4 32.2 L27.6 31.1 Z M27.6 31.1 L27.9 28.8 L28.1 27.3 Z M27.5 31.1 L27.7 29.9 L27.9 28.6 Z M26.2 37.2 L26.2 37.2 L27.5 31.1 Z M83.1 66.8 L83.1 66.8 L83.1 66.8 Z M79.0 66.2 L79.0 66.2 L79.0 66.2 Z M78.9 66.1 L78.9 66.1 L78.9 66.1 Z M78.9 66.1 L78.9 66.1 L78.9 66.1 Z" fill="url(#gm-body)" fill-rule="evenodd"/>
<path d="M78.8 50.7 L78.1 49.8 L77.5 49.0 L76.8 48.2 L76.1 47.5 L75.3 46.7 L74.5 46.0 L73.6 45.3 L72.8 44.7 L71.9 44.0 L70.9 43.4 L70.0 42.8 L69.0 42.3 L68.0 41.7 L66.9 41.2 L65.9 40.7 L64.8 40.2 L63.8 39.7 L62.7 39.3 L61.6 38.9 L60.5 38.5 L59.4 38.1 L58.3 37.8 L57.2 37.5 L56.2 37.2 L55.1 36.9 L54.1 36.6 L53.0 36.4 L52.0 36.2 L51.1 36.0 L50.1 35.9 L49.3 35.7" fill="none" stroke="#a8792a" stroke-width=".6" opacity=".75"/>
<path d="M80.2 49.0 L79.5 48.0 L78.9 47.0 L78.1 46.1 L77.4 45.2 L76.6 44.2 L75.8 43.3 L74.9 42.5 L74.0 41.6 L73.1 40.7 L72.1 39.9 L71.1 39.0 L70.1 38.2 L69.1 37.4 L68.0 36.5 L67.0 35.7 L65.9 34.9 L64.8 34.0 L63.6 33.2 L62.5 32.3 L61.4 31.5 L60.2 30.6 L59.1 29.7 L57.9 28.7 L56.8 27.8 L55.7 26.8 L54.5 25.8 L53.4 24.8 L52.3 23.7 L51.3 22.5 L50.2 21.4 L49.2 20.2" fill="none" stroke="#a8792a" stroke-width=".6" opacity=".75"/>
<path d="M74.8 52.6 L74.2 52.0 L73.5 51.4 L72.7 50.8 L71.9 50.3 L71.1 49.8 L70.2 49.3 L69.3 48.9 L68.3 48.5 L67.3 48.1 L66.3 47.8 L65.2 47.5 L64.0 47.3 L62.9 47.1 L61.6 47.0 L60.4 46.9 L59.1 46.8 L57.8 46.8 L56.4 46.9 L55.0 47.1 L53.6 47.2 L52.1 47.5 L50.6 47.9 L49.1 48.3 L47.5 48.8 L45.9 49.3 L44.3 50.0" fill="none" stroke="#a8792a" stroke-width=".6" opacity=".75"/>
<path d="M76.5 52.2 L75.9 51.5 L75.3 50.8 L74.5 50.2 L73.8 49.6 L73.0 49.0 L72.2 48.5 L71.3 48.0 L70.4 47.5 L69.5 47.1 L68.5 46.7 L67.5 46.3 L66.5 46.0 L65.4 45.7 L64.3 45.5 L63.2 45.3 L62.0 45.2 L60.9 45.1 L59.7 45.0 L58.5 45.0 L57.3 45.1 L56.0 45.2 L54.8 45.3 L53.6 45.6 L52.3 45.9 L51.0 46.2 L49.8 46.7 L48.5 47.2 L47.3 47.8 L46.1 48.5 L44.9 49.2 L43.7 50.0" fill="none" stroke="#a8792a" stroke-width=".6" opacity=".75"/>
<path d="M80.0 58.4 L79.7 57.4 L79.3 56.0 L78.7 54.2 L77.9 52.5 L77.0 50.8 L75.9 49.1 L74.6 47.5 L73.2 45.8 L71.7 44.2 L70.0 42.7 L68.2 41.2 L66.2 39.7 L64.2 38.2 L62.2 36.8 L60.1 35.3 L58.0 33.8 L56.0 32.2 L54.1 30.5 L53.2 29.7" fill="none" stroke="#fbe7a1" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
<path d="M80.0 58.4 L79.7 57.4 L79.3 56.0 L78.7 54.2 L77.9 52.5 L77.0 50.8 L75.9 49.1 L74.6 47.5 L73.2 45.8 L71.7 44.2 L70.0 42.7 L68.2 41.2 L66.2 39.7 L64.2 38.2 L62.2 36.8 L60.1 35.3 L58.0 33.8 L56.0 32.2 L54.1 30.5 L53.2 29.7" fill="none" stroke="#fff6d6" stroke-width=".7" stroke-linecap="round" opacity=".9"/>
<path d="M46.7 45.0 L47.1 43.9 L47.4 42.7 L47.6 41.5 L47.8 40.3 L48.0 39.0 L48.1 37.9 L48.2 36.7 L48.4 35.6 L48.6 34.5 L48.9 33.4 L49.2 32.2 L49.5 31.0 L49.7 29.8 L49.9 28.6 L50.1 27.4 L50.1 26.2 L50.0 25.1 L49.9 24.0 L49.7 23.1 L49.4 22.2 L49.1 21.3 L48.8 20.6 L48.5 19.7 L48.2 18.9 L48.0 18.0 L47.9 17.1 L47.7 16.0 L47.5 15.0 L47.3 14.0 L47.1 13.1 L46.8 12.2 L46.4 11.6 L45.9 11.1 L45.4 10.8 L44.8 10.7 L44.3 10.6 L43.7 10.7 L43.1 10.7 L42.6 10.7 L42.1 10.7 L41.5 10.5 L41.0 10.3 L40.5 10.0 L40.0 9.7 L39.5 9.5 L38.9 9.4 L38.3 9.5 L37.7 9.7 L37.1 10.2 L36.6 10.8 L36.0 11.6 L35.5 12.4 L35.0 13.3 L34.5 14.2 L34.0 15.0 L33.5 15.7 L33.0 16.4 L32.5 17.0 L31.9 17.6 L31.3 18.3 L30.8 19.0 L30.2 19.8 L29.7 20.7 L29.3 21.7 L28.9 22.8 L28.6 24.0 L28.4 25.2 L28.2 26.4 L28.0 27.7 L27.9 28.8 L27.8 30.0 L27.6 31.1 L27.4 32.2 L27.1 33.3 L26.8 34.5 L26.5 35.7 L26.3 36.9 L26.1 38.1 L25.9 39.3 L25.9 40.5 L26.0 41.6 L26.1 42.7 L26.3 43.6 L26.6 44.5 L26.9 45.3 L27.2 46.1 L27.5 47.0 L27.8 47.8 L28.0 48.7 L28.1 49.6 L28.3 50.7 L28.5 51.7 L28.7 52.7 L28.9 53.6 L29.2 54.5 L29.6 55.1 L30.1 55.6 L30.6 55.9 L31.2 56.0 L31.7 56.1 L32.3 56.0 L32.9 56.0 L33.4 56.0 L33.9 56.0 L34.5 56.2 L35.0 56.4 L35.5 56.7 L36.0 57.0 L36.5 57.2 L37.1 57.3 L37.7 57.2 L38.3 57.0 L38.9 56.5 L39.4 55.9 L40.0 55.1 L40.5 54.3 L41.0 53.4 L41.5 52.5 L42.0 51.7 L42.5 51.0 L43.0 50.3 L43.5 49.7 L44.1 49.1 L44.7 48.4 L45.2 47.7 L45.8 46.9 L46.3 46.0 Z" fill="url(#gm-in)"/>
<path d="M48.4 35.6 Q51.2 35.7 53.7 37.0" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M48.2 18.9 Q52.2 23.6 53.6 29.5" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M42.1 10.7 Q48.3 17.2 50.9 25.8" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M33.5 15.7 Q41.7 20.3 47.0 28.1" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M27.6 31.1 Q36.4 31.0 44.3 35.0" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M27.8 47.8 Q35.5 43.1 44.4 42.5" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M33.9 56.0 Q39.4 49.5 47.2 46.2" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M42.5 51.0 Q45.9 46.4 51.1 43.9" fill="none" stroke="#0e0904" stroke-width=".7" opacity=".75"/>
<path d="M26.2 37.2 L25.8 39.8 L25.8 41.0 L26.0 43.3 L26.5 45.3 L27.7 48.8 L28.5 52.9 L29.0 55.0 L29.8 56.9 L30.2 57.6 L30.7 58.2 L31.6 58.8 L32.2 59.2 L32.8 59.3 L35.9 59.5 L38.9 60.7 L39.5 60.7 L40.2 60.6 L40.8 60.3 L41.5 59.8 L42.8 58.3 L45.6 53.8 L48.7 50.0 L49.9 48.0 L50.4 46.9 L50.8 45.6 L51.4 43.0 L52.4 36.3 L53.8 29.8 L54.1 27.1 L54.1 25.7 L53.9 23.3 L53.4 21.2 L52.1 17.4 L51.3 13.1 L50.8 10.9 L50.4 10.0 L50.0 9.3 L49.4 8.8 L48.9 8.4 L48.2 8.2 L45.1 8.0 L44.6 7.9 L44.0 7.6 L42.8 7.1 L42.2 6.9 L41.6 6.8 L39.9 7.2 L39.2 7.5 L38.5 8.0 L37.1 9.5 L35.9 11.2 L33.8 14.7 L31.5 17.4 L30.3 19.0 L29.3 21.1 L28.6 23.5 L28.2 26.1 L27.9 28.6 L27.7 29.9 L27.5 31.1 Z M38.2 9.5 L38.9 9.4 L39.5 9.5 L41.5 10.5 L42.1 10.7 L42.6 10.7 L44.8 10.7 L45.4 10.8 L45.9 11.1 L46.4 11.6 L46.8 12.2 L47.3 14.0 L48.2 18.9 L49.4 22.2 L49.9 24.0 L50.1 26.2 L49.9 28.6 L48.4 35.6 L47.6 41.5 L47.1 43.9 L46.7 45.0 L45.8 46.9 L44.7 48.4 L42.5 51.0 L40.5 54.3 L39.4 55.9 L38.9 56.5 L38.3 57.0 L37.7 57.2 L37.1 57.3 L36.0 57.0 L34.5 56.2 L33.9 56.0 L33.4 56.0 L31.7 56.1 L30.6 55.9 L30.1 55.6 L29.6 55.1 L29.2 54.5 L28.7 52.7 L27.8 47.8 L26.6 44.5 L26.1 42.7 L25.9 40.5 L26.1 38.1 L27.6 31.1 L28.4 25.2 L28.9 22.8 L29.3 21.7 L30.2 19.8 L31.3 18.3 L33.5 15.7 L35.5 12.4 L36.6 10.8 L37.1 10.2 L37.7 9.7 Z M28.0 27.4 L28.0 27.4 L28.0 27.4 Z M28.2 26.1 L28.2 26.1 L28.2 26.1 Z M43.4 7.4 L43.4 7.4 L43.4 7.4 Z M47.0 8.1 L47.0 8.1 L47.0 8.1 Z M51.6 41.6 L51.6 41.6 L51.6 41.6 Z M37.7 60.2 L37.7 60.2 L37.7 60.2 Z" fill="url(#gm-lip)" fill-rule="evenodd"/>
<path d="M46.7 45.0 L47.1 43.9 L47.4 42.7 L47.6 41.5 L47.8 40.3 L48.0 39.0 L48.1 37.9 L48.2 36.7 L48.4 35.6 L48.6 34.5 L48.9 33.4 L49.2 32.2 L49.5 31.0 L49.7 29.8 L49.9 28.6 L50.1 27.4 L50.1 26.2 L50.0 25.1 L49.9 24.0 L49.7 23.1 L49.4 22.2 L49.1 21.3 L48.8 20.6 L48.5 19.7 L48.2 18.9 L48.0 18.0 L47.9 17.1 L47.7 16.0 L47.5 15.0 L47.3 14.0 L47.1 13.1 L46.8 12.2 L46.4 11.6 L45.9 11.1 L45.4 10.8 L44.8 10.7 L44.3 10.6 L43.7 10.7 L43.1 10.7 L42.6 10.7 L42.1 10.7 L41.5 10.5 L41.0 10.3 L40.5 10.0 L40.0 9.7 L39.5 9.5 L38.9 9.4 L38.3 9.5 L37.7 9.7 L37.1 10.2 L36.6 10.8 L36.0 11.6 L35.5 12.4 L35.0 13.3 L34.5 14.2 L34.0 15.0 L33.5 15.7 L33.0 16.4 L32.5 17.0 L31.9 17.6 L31.3 18.3 L30.8 19.0 L30.2 19.8 L29.7 20.7 L29.3 21.7 L28.9 22.8 L28.6 24.0 L28.4 25.2 L28.2 26.4 L28.0 27.7 L27.9 28.8 L27.8 30.0 L27.6 31.1 L27.4 32.2 L27.1 33.3 L26.8 34.5 L26.5 35.7 L26.3 36.9 L26.1 38.1 L25.9 39.3 L25.9 40.5 L26.0 41.6 L26.1 42.7 L26.3 43.6 L26.6 44.5 L26.9 45.3 L27.2 46.1 L27.5 47.0 L27.8 47.8 L28.0 48.7 L28.1 49.6 L28.3 50.7 L28.5 51.7 L28.7 52.7 L28.9 53.6 L29.2 54.5 L29.6 55.1 L30.1 55.6 L30.6 55.9 L31.2 56.0 L31.7 56.1 L32.3 56.0 L32.9 56.0 L33.4 56.0 L33.9 56.0 L34.5 56.2 L35.0 56.4 L35.5 56.7 L36.0 57.0 L36.5 57.2 L37.1 57.3 L37.7 57.2 L38.3 57.0 L38.9 56.5 L39.4 55.9 L40.0 55.1 L40.5 54.3 L41.0 53.4 L41.5 52.5 L42.0 51.7 L42.5 51.0 L43.0 50.3 L43.5 49.7 L44.1 49.1 L44.7 48.4 L45.2 47.7 L45.8 46.9 L46.3 46.0 Z" fill="none" stroke="#3b2a12" stroke-width=".7" opacity=".8"/>
<path d="M81.0 66.3 L81.0 80.7 L69.0 83.2" fill="none" stroke="#a8792a" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M80.2 66.3 L80.2 80.3" stroke="#fbe7a1" stroke-width="1" opacity=".8"/>
<circle cx="66.0" cy="82.0" r="4.4" fill="#cfd5de"/><circle cx="66.0" cy="82.0" r="2.6" fill="#8a93a3"/><circle cx="64.8" cy="80.8" r=".9" fill="#fff" opacity=".8"/>
</svg>
`,
  microphone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
<!-- Overexposed, R8c trophy "microphone": drawn in code, flat colour. -->
<defs><linearGradient id="mic-body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bcc3cf"/><stop offset=".3" stop-color="#ffffff"/><stop offset=".7" stop-color="#bcc3cf"/><stop offset="1" stop-color="#5d6574"/></linearGradient></defs>
<ellipse cx="60" cy="147" rx="44" ry="3" fill="#000" opacity=".35"/><path d="M20 128 L100 128 L100 146 L20 146 Z" fill="#1b1816"/><path d="M20 128 L100 128 L96 125 L24 125 Z" fill="#3a332d"/><path d="M88 128 L100 128 L100 146 L88 146 Z" fill="#100e0c"/><path d="M30 114 L90 114 L90 125 L30 125 Z" fill="#24201d"/><path d="M30 114 L90 114 L87 111.5 L33 111.5 Z" fill="#433b34"/><path d="M81 114 L90 114 L90 125 L81 125 Z" fill="#141210"/><rect x="38" y="131" width="44" height="10" rx="1" fill="#d7a63c"/><rect x="38" y="131" width="44" height="2" fill="#fbe7a1" opacity=".7"/><g stroke="#7c5719" stroke-width="1" stroke-linecap="round"><path d="M44 135.5 L76 135.5"/><path d="M50 138.5 L70 138.5"/></g>
<rect x="57" y="78" width="6" height="36" fill="#d7a63c"/><rect x="57" y="78" width="2" height="36" fill="#fbe7a1" opacity=".7"/>
<rect x="52" y="108" width="16" height="6" rx="1.5" fill="#a8792a"/>
<path d="M36 50 C36 76 84 76 84 50" fill="none" stroke="#8a93a3" stroke-width="5"/>
<path d="M36 50 C36 74 58 76 60 76" fill="none" stroke="#e3e7ee" stroke-width="1.6" opacity=".9"/>
<rect x="56" y="72" width="8" height="8" rx="1" fill="#8a93a3"/>
<rect x="40" y="10" width="40" height="66" rx="20" fill="url(#mic-body)"/>
<path d="M48 18 L72 18" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 22 L76 22" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 26 L76 26" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 30 L76 30" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 34 L76 34" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 38 L76 38" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 42 L76 42" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 46 L76 46" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 50 L76 50" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 54 L76 54" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M44 58 L76 58" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M48 62 L72 62" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<path d="M48 66 L72 66" stroke="#8a93a3" stroke-width="1.2" opacity=".55"/>
<rect x="40" y="40" width="40" height="7" fill="#d7a63c"/><rect x="40" y="40" width="40" height="2" fill="#fbe7a1" opacity=".7"/>
<path d="M47 16 C44 26 44 54 47 66" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>
<circle cx="38" cy="50" r="4" fill="#bcc3cf"/><circle cx="82" cy="50" r="4" fill="#8a93a3"/>
</svg>
`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
<!-- Overexposed, R8c trophy "star": drawn in code, flat colour. -->
<defs></defs>
<ellipse cx="60" cy="147" rx="44" ry="3" fill="#000" opacity=".35"/><path d="M20 128 L100 128 L100 146 L20 146 Z" fill="#1b1816"/><path d="M20 128 L100 128 L96 125 L24 125 Z" fill="#3a332d"/><path d="M88 128 L100 128 L100 146 L88 146 Z" fill="#100e0c"/><path d="M30 114 L90 114 L90 125 L30 125 Z" fill="#24201d"/><path d="M30 114 L90 114 L87 111.5 L33 111.5 Z" fill="#433b34"/><path d="M81 114 L90 114 L90 125 L81 125 Z" fill="#141210"/><rect x="38" y="131" width="44" height="10" rx="1" fill="#d7a63c"/><rect x="38" y="131" width="44" height="2" fill="#fbe7a1" opacity=".7"/><g stroke="#7c5719" stroke-width="1" stroke-linecap="round"><path d="M44 135.5 L76 135.5"/><path d="M50 138.5 L70 138.5"/></g>
<path d="M53 114 L55 84 L65 84 L67 114 Z" fill="#d7a63c"/><path d="M53 114 L55 84 L58 84 L57 114 Z" fill="#fbe7a1" opacity=".6"/><path d="M63 84 L65 84 L67 114 L63 114 Z" fill="#a8792a"/>
<ellipse cx="60" cy="84" rx="7" ry="2" fill="#efc95f"/>
<path d="M60 48 L60.0 8.0 L70.0 34.2 Z" fill="#fbe7a1"/>
<path d="M60 48 L70.0 34.2 L98.0 35.6 Z" fill="#d7a63c"/>
<path d="M60 48 L98.0 35.6 L76.2 53.3 Z" fill="#a8792a"/>
<path d="M60 48 L76.2 53.3 L83.5 80.4 Z" fill="#a8792a"/>
<path d="M60 48 L83.5 80.4 L60.0 65.0 Z" fill="#a8792a"/>
<path d="M60 48 L60.0 65.0 L36.5 80.4 Z" fill="#a8792a"/>
<path d="M60 48 L36.5 80.4 L43.8 53.3 Z" fill="#d7a63c"/>
<path d="M60 48 L43.8 53.3 L22.0 35.6 Z" fill="#fbe7a1"/>
<path d="M60 48 L22.0 35.6 L50.0 34.2 Z" fill="#fbe7a1"/>
<path d="M60 48 L50.0 34.2 L60.0 8.0 Z" fill="#fbe7a1"/>
<path d="M60.0 8.0 L70.0 34.2 L98.0 35.6 L76.2 53.3 L83.5 80.4 L60.0 65.0 L36.5 80.4 L43.8 53.3 L22.0 35.6 L50.0 34.2 Z" fill="none" stroke="#7c5719" stroke-width=".8" opacity=".6"/>
<circle cx="49" cy="36" r="2.4" fill="#fff" opacity=".8"/>
</svg>
`,
  film_reel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
<!-- Overexposed, R8c trophy "film_reel": drawn in code, flat colour. -->
<defs><radialGradient id="reel" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e3e7ee"/><stop offset="1" stop-color="#bcc3cf"/></radialGradient></defs>
<ellipse cx="60" cy="147" rx="44" ry="3" fill="#000" opacity=".35"/><path d="M20 128 L100 128 L100 146 L20 146 Z" fill="#1b1816"/><path d="M20 128 L100 128 L96 125 L24 125 Z" fill="#3a332d"/><path d="M88 128 L100 128 L100 146 L88 146 Z" fill="#100e0c"/><path d="M30 114 L90 114 L90 125 L30 125 Z" fill="#24201d"/><path d="M30 114 L90 114 L87 111.5 L33 111.5 Z" fill="#433b34"/><path d="M81 114 L90 114 L90 125 L81 125 Z" fill="#141210"/><rect x="38" y="131" width="44" height="10" rx="1" fill="#d7a63c"/><rect x="38" y="131" width="44" height="2" fill="#fbe7a1" opacity=".7"/><g stroke="#7c5719" stroke-width="1" stroke-linecap="round"><path d="M44 135.5 L76 135.5"/><path d="M50 138.5 L70 138.5"/></g>
<path d="M86 62 C100 76 98 98 82 106 C70 112 52 110 40 114 L46 114 C56 112 72 114 84 110 C104 102 106 74 92 58 Z" fill="#26211c"/>
<rect x="92.0" y="62.0" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(-30 92.0 62.0)"/>
<rect x="89.6" y="68.2" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(-22 89.6 68.2)"/>
<rect x="86.8" y="74.5" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(-15 86.8 74.5)"/>
<rect x="83.2" y="80.8" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(-8 83.2 80.8)"/>
<rect x="78.6" y="87.0" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(0 78.6 87.0)"/>
<rect x="72.7" y="93.2" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(8 72.7 93.2)"/>
<rect x="65.6" y="99.5" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(15 65.6 99.5)"/>
<rect x="57.4" y="105.8" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(22 57.4 105.8)"/>
<rect x="48.2" y="112.0" width="2.6" height="2" fill="#e8dcc2" opacity=".75" transform="rotate(30 48.2 112.0)"/>
<path d="M50 114 L56 92 L64 92 L70 114 Z" fill="#8a93a3"/><path d="M50 114 L56 92 L58 92 L54 114 Z" fill="#e3e7ee"/>
<circle cx="58" cy="54" r="40" fill="#8a93a3"/><circle cx="58" cy="54" r="38" fill="url(#reel)"/>
<circle cx="58.0" cy="32.0" r="10" fill="#2a2622"/>
<path d="M51.0 27.0 a10 10 0 0 1 12 -3" fill="none" stroke="#5a544c" stroke-width="1.4"/>
<circle cx="78.9" cy="47.2" r="10" fill="#2a2622"/>
<path d="M71.9 42.2 a10 10 0 0 1 12 -3" fill="none" stroke="#5a544c" stroke-width="1.4"/>
<circle cx="70.9" cy="71.8" r="10" fill="#2a2622"/>
<path d="M63.9 66.8 a10 10 0 0 1 12 -3" fill="none" stroke="#5a544c" stroke-width="1.4"/>
<circle cx="45.1" cy="71.8" r="10" fill="#2a2622"/>
<path d="M38.1 66.8 a10 10 0 0 1 12 -3" fill="none" stroke="#5a544c" stroke-width="1.4"/>
<circle cx="37.1" cy="47.2" r="10" fill="#2a2622"/>
<path d="M30.1 42.2 a10 10 0 0 1 12 -3" fill="none" stroke="#5a544c" stroke-width="1.4"/>
<circle cx="58" cy="54" r="8" fill="#bcc3cf"/><circle cx="58" cy="54" r="3.5" fill="#2a2622"/>
<path d="M24 38 A38 38 0 0 1 46 18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
</svg>
`,
  laurel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
<!-- Overexposed, R8c trophy "laurel": drawn in code, flat colour. -->
<defs></defs>
<ellipse cx="60" cy="147" rx="44" ry="3" fill="#000" opacity=".35"/><path d="M20 128 L100 128 L100 146 L20 146 Z" fill="#1b1816"/><path d="M20 128 L100 128 L96 125 L24 125 Z" fill="#3a332d"/><path d="M88 128 L100 128 L100 146 L88 146 Z" fill="#100e0c"/><path d="M30 114 L90 114 L90 125 L30 125 Z" fill="#24201d"/><path d="M30 114 L90 114 L87 111.5 L33 111.5 Z" fill="#433b34"/><path d="M81 114 L90 114 L90 125 L81 125 Z" fill="#141210"/><rect x="38" y="131" width="44" height="10" rx="1" fill="#d7a63c"/><rect x="38" y="131" width="44" height="2" fill="#fbe7a1" opacity=".7"/><g stroke="#7c5719" stroke-width="1" stroke-linecap="round"><path d="M44 135.5 L76 135.5"/><path d="M50 138.5 L70 138.5"/></g>
<path d="M54 114 L56 98 L64 98 L66 114 Z" fill="#d7a63c"/><path d="M54 114 L56 98 L58 98 L57 114 Z" fill="#fbe7a1" opacity=".6"/>
<path d="M63.4 90.8 L63.4 86.8 L73.7 84.0 L82.5 78.1 L89.0 69.7 L92.5 59.7 L92.6 49.1 L89.4 39.0 L83.1 30.5 L74.5 24.3" fill="none" stroke="#a8792a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<ellipse cx="68.5" cy="90.0" rx="7.6" ry="3.2" transform="rotate(32 68.5 90.0)" fill="#d7a63c"/>
<ellipse cx="67.8" cy="82.7" rx="7.6" ry="3.2" transform="rotate(-44 67.8 82.7)" fill="#a8792a"/>
<ellipse cx="79.5" cy="85.4" rx="7.3" ry="3.1" transform="rotate(13 79.5 85.4)" fill="#d7a63c"/>
<ellipse cx="76.5" cy="78.7" rx="7.3" ry="3.1" transform="rotate(-63 76.5 78.7)" fill="#a8792a"/>
<ellipse cx="88.5" cy="77.6" rx="7.0" ry="2.9" transform="rotate(-5 88.5 77.6)" fill="#d7a63c"/>
<ellipse cx="83.4" cy="72.2" rx="7.0" ry="2.9" transform="rotate(-81 83.4 72.2)" fill="#a8792a"/>
<ellipse cx="94.5" cy="67.4" rx="6.7" ry="2.8" transform="rotate(-24 94.5 67.4)" fill="#d7a63c"/>
<ellipse cx="88.0" cy="63.8" rx="6.7" ry="2.8" transform="rotate(-100 88.0 63.8)" fill="#a8792a"/>
<ellipse cx="97.0" cy="55.7" rx="6.4" ry="2.7" transform="rotate(-42 97.0 55.7)" fill="#d7a63c"/>
<ellipse cx="89.7" cy="54.4" rx="6.4" ry="2.7" transform="rotate(-118 89.7 54.4)" fill="#a8792a"/>
<ellipse cx="95.6" cy="43.9" rx="6.1" ry="2.6" transform="rotate(-60 95.6 43.9)" fill="#d7a63c"/>
<ellipse cx="88.3" cy="45.0" rx="6.1" ry="2.6" transform="rotate(-136 88.3 45.0)" fill="#a8792a"/>
<ellipse cx="90.5" cy="33.1" rx="5.8" ry="2.4" transform="rotate(-79 90.5 33.1)" fill="#fbe7a1"/>
<ellipse cx="84.0" cy="36.5" rx="5.8" ry="2.4" transform="rotate(-155 84.0 36.5)" fill="#efc95f"/>
<ellipse cx="82.3" cy="24.5" rx="5.5" ry="2.3" transform="rotate(-98 82.3 24.5)" fill="#fbe7a1"/>
<ellipse cx="77.2" cy="29.8" rx="5.5" ry="2.3" transform="rotate(-174 77.2 29.8)" fill="#efc95f"/>
<ellipse cx="71.8" cy="18.9" rx="5.2" ry="2.2" transform="rotate(-116 71.8 18.9)" fill="#fbe7a1"/>
<ellipse cx="68.6" cy="25.6" rx="5.2" ry="2.2" transform="rotate(-192 68.6 25.6)" fill="#efc95f"/>
<ellipse cx="76.5" cy="20.3" rx="5" ry="2.4" transform="rotate(-70 76.5 20.3)" fill="#fbe7a1"/>
<path d="M56.6 90.8 L56.6 86.8 L46.3 84.0 L37.5 78.1 L31.0 69.7 L27.5 59.7 L27.4 49.1 L30.6 39.0 L36.9 30.5 L45.5 24.3" fill="none" stroke="#a8792a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<ellipse cx="52.2" cy="82.7" rx="7.6" ry="3.2" transform="rotate(-136 52.2 82.7)" fill="#d7a63c"/>
<ellipse cx="51.5" cy="90.0" rx="7.6" ry="3.2" transform="rotate(-212 51.5 90.0)" fill="#efc95f"/>
<ellipse cx="43.5" cy="78.7" rx="7.3" ry="3.1" transform="rotate(-118 43.5 78.7)" fill="#d7a63c"/>
<ellipse cx="40.5" cy="85.4" rx="7.3" ry="3.1" transform="rotate(-194 40.5 85.4)" fill="#efc95f"/>
<ellipse cx="36.6" cy="72.2" rx="7.0" ry="2.9" transform="rotate(-99 36.6 72.2)" fill="#d7a63c"/>
<ellipse cx="31.5" cy="77.6" rx="7.0" ry="2.9" transform="rotate(-175 31.5 77.6)" fill="#efc95f"/>
<ellipse cx="32.0" cy="63.8" rx="6.7" ry="2.8" transform="rotate(-81 32.0 63.8)" fill="#d7a63c"/>
<ellipse cx="25.5" cy="67.4" rx="6.7" ry="2.8" transform="rotate(-156 25.5 67.4)" fill="#efc95f"/>
<ellipse cx="30.3" cy="54.4" rx="6.4" ry="2.7" transform="rotate(-62 30.3 54.4)" fill="#d7a63c"/>
<ellipse cx="23.0" cy="55.7" rx="6.4" ry="2.7" transform="rotate(-138 23.0 55.7)" fill="#efc95f"/>
<ellipse cx="31.7" cy="45.0" rx="6.1" ry="2.6" transform="rotate(-44 31.7 45.0)" fill="#d7a63c"/>
<ellipse cx="24.4" cy="43.9" rx="6.1" ry="2.6" transform="rotate(-120 24.4 43.9)" fill="#efc95f"/>
<ellipse cx="36.0" cy="36.5" rx="5.8" ry="2.4" transform="rotate(-25 36.0 36.5)" fill="#efc95f"/>
<ellipse cx="29.5" cy="33.1" rx="5.8" ry="2.4" transform="rotate(-101 29.5 33.1)" fill="#fbe7a1"/>
<ellipse cx="42.8" cy="29.8" rx="5.5" ry="2.3" transform="rotate(-7 42.8 29.8)" fill="#efc95f"/>
<ellipse cx="37.7" cy="24.5" rx="5.5" ry="2.3" transform="rotate(-83 37.7 24.5)" fill="#fbe7a1"/>
<ellipse cx="51.4" cy="25.6" rx="5.2" ry="2.2" transform="rotate(12 51.4 25.6)" fill="#efc95f"/>
<ellipse cx="48.2" cy="18.9" rx="5.2" ry="2.2" transform="rotate(-64 48.2 18.9)" fill="#fbe7a1"/>
<ellipse cx="43.5" cy="20.3" rx="5" ry="2.4" transform="rotate(70 43.5 20.3)" fill="#fbe7a1"/>
<path d="M60 89 L47 104 L51.5 105 L54.5 100.5 L58 106 L60 91 Z" fill="#a8202a"/><path d="M60 89 L73 104 L68.5 105 L65.5 100.5 L62 106 L60 91 Z" fill="#c62f36"/>
<ellipse cx="60" cy="89" rx="6.5" ry="4.8" fill="#d9454b"/><path d="M56.5 88 L63.5 88" stroke="#f08a8c" stroke-width="1.2" stroke-linecap="round"/>
</svg>
`,
  press_camera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
<!-- Overexposed, R8c trophy "press_camera": drawn in code, flat colour. -->
<defs><pattern id="cam-leather" x="16" y="70" width="4" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".55" fill="#3a302a"/><circle cx="4" cy="6" r=".55" fill="#3a302a"/><circle cx="0" cy="6" r=".55" fill="#3a302a"/></pattern><linearGradient id="cam-plate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a1"/><stop offset=".45" stop-color="#efc95f"/><stop offset="1" stop-color="#a8792a"/></linearGradient><radialGradient id="cam-mount" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fbe7a1"/><stop offset=".5" stop-color="#efc95f"/><stop offset="1" stop-color="#a8792a"/></radialGradient><radialGradient id="cam-glass" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#4b5a8a"/><stop offset=".55" stop-color="#1d2440"/><stop offset="1" stop-color="#0a0c16"/></radialGradient><radialGradient id="cam-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff4cc" stop-opacity=".5"/><stop offset="1" stop-color="#fff4cc" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="60" cy="147" rx="44" ry="3" fill="#000" opacity=".35"/><path d="M20 128 L100 128 L100 146 L20 146 Z" fill="#1b1816"/><path d="M20 128 L100 128 L96 125 L24 125 Z" fill="#3a332d"/><path d="M88 128 L100 128 L100 146 L88 146 Z" fill="#100e0c"/><path d="M30 114 L90 114 L90 125 L30 125 Z" fill="#24201d"/><path d="M30 114 L90 114 L87 111.5 L33 111.5 Z" fill="#433b34"/><path d="M81 114 L90 114 L90 125 L81 125 Z" fill="#141210"/><rect x="38" y="131" width="44" height="10" rx="1" fill="#d7a63c"/><rect x="38" y="131" width="44" height="2" fill="#fbe7a1" opacity=".7"/><g stroke="#7c5719" stroke-width="1" stroke-linecap="round"><path d="M44 135.5 L76 135.5"/><path d="M50 138.5 L70 138.5"/></g>
<path d="M52 114 L54.5 104 L65.5 104 L68 114 Z" fill="#d7a63c"/><path d="M52 114 L54.5 104 L57.5 104 L56 114 Z" fill="#fbe7a1" opacity=".6"/><path d="M63 104 L65.5 104 L68 114 L64.5 114 Z" fill="#a8792a"/>
<circle cx="60" cy="33" r="31" fill="url(#cam-glow)"/>
<path d="M61.3 20.0 L60.0 2.0 L58.7 20.0 Z" fill="#fffbe8" opacity="0.9"/><path d="M66.2 21.5 L69.2 10.7 L63.8 20.5 Z" fill="#fffbe8" opacity="0.9"/><path d="M70.1 24.7 L81.9 11.1 L68.3 22.9 Z" fill="#fffbe8" opacity="0.9"/><path d="M72.5 29.2 L82.3 23.8 L71.5 26.8 Z" fill="#fffbe8" opacity="0.9"/><path d="M73.0 34.3 L91.0 33.0 L73.0 31.7 Z" fill="#fffbe8" opacity="0.9"/><path d="M71.5 39.2 L82.3 42.2 L72.5 36.8 Z" fill="#fffbe8" opacity="0.9"/><path d="M68.3 43.1 L81.9 54.9 L70.1 41.3 Z" fill="#fffbe8" opacity="0.9"/><path d="M63.8 45.5 L69.2 55.3 L66.2 44.5 Z" fill="#fffbe8" opacity="0.9"/><path d="M58.7 46.0 L60.0 64.0 L61.3 46.0 Z" fill="#fffbe8" opacity="0.9"/><path d="M53.8 44.5 L50.8 55.3 L56.2 45.5 Z" fill="#fffbe8" opacity="0.9"/><path d="M49.9 41.3 L38.1 54.9 L51.7 43.1 Z" fill="#fffbe8" opacity="0.9"/><path d="M47.5 36.8 L37.7 42.2 L48.5 39.2 Z" fill="#fffbe8" opacity="0.9"/><path d="M47.0 31.7 L29.0 33.0 L47.0 34.3 Z" fill="#fffbe8" opacity="0.9"/><path d="M48.5 26.8 L37.7 23.8 L47.5 29.2 Z" fill="#fffbe8" opacity="0.9"/><path d="M51.7 22.9 L38.1 11.1 L49.9 24.7 Z" fill="#fffbe8" opacity="0.9"/><path d="M56.2 20.5 L50.8 10.7 L53.8 21.5 Z" fill="#fffbe8" opacity="0.9"/>
<rect x="14" y="60" width="92" height="46" rx="7" fill="#7c5719"/>
<rect x="14" y="59" width="90" height="45" rx="7" fill="url(#cam-plate)"/>
<rect x="14" y="69" width="90" height="28" fill="#211b17"/><rect x="14" y="69" width="90" height="28" fill="url(#cam-leather)"/>
<path d="M20 60.5 L98 60.5" stroke="#fbe7a1" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>
<path d="M96 60 L104 60 Q105 60 105 66 L105 99 Q105 104 98 104 L96 104 Z" fill="#a8792a" opacity=".55"/>
<rect x="11" y="63" width="4" height="6" rx="1.5" fill="#a8792a"/><rect x="104" y="63" width="4" height="6" rx="1.5" fill="#7c5719"/>
<path d="M40 60 L47 47 L73 47 L80 60 Z" fill="#d7a63c"/>
<path d="M40 60 L47 47 L52 47 L47 60 Z" fill="#fbe7a1" opacity=".85"/><path d="M73 60 L68 47 L73 47 L80 60 Z" fill="#a8792a"/>
<rect x="54" y="51" width="12" height="4" rx="1" fill="#a8792a" opacity=".6"/>
<rect x="20" y="53" width="13" height="7" rx="1.5" fill="#d7a63c"/><rect x="20" y="53" width="4" height="7" rx="1" fill="#fbe7a1" opacity=".7"/><path d="M25 54 L25 59" stroke="#7c5719" stroke-width=".7" opacity=".7"/><path d="M27.5 54 L27.5 59" stroke="#7c5719" stroke-width=".7" opacity=".7"/><path d="M30 54 L30 59" stroke="#7c5719" stroke-width=".7" opacity=".7"/>
<rect x="86" y="54" width="9" height="6" rx="1.2" fill="#a8792a"/><ellipse cx="90.5" cy="54" rx="4.5" ry="1.6" fill="#c8323a"/>
<path d="M78 58 L96 55.5" stroke="#efc95f" stroke-width="2" stroke-linecap="round"/>
<circle cx="60" cy="83" r="20" fill="#7c5719"/><circle cx="59.5" cy="82.5" r="19" fill="url(#cam-mount)"/>
<circle cx="60" cy="83" r="15.5" fill="#161210"/>
<path d="M73.6 83.0 L75.4 83.0" stroke="#4a3f36" stroke-width=".8"/>
<path d="M73.4 85.4 L75.2 85.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M72.8 87.7 L74.5 88.3" stroke="#4a3f36" stroke-width=".8"/>
<path d="M71.8 89.8 L73.3 90.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M70.4 91.7 L71.8 92.9" stroke="#4a3f36" stroke-width=".8"/>
<path d="M68.7 93.4 L69.9 94.8" stroke="#4a3f36" stroke-width=".8"/>
<path d="M66.8 94.8 L67.7 96.3" stroke="#4a3f36" stroke-width=".8"/>
<path d="M64.7 95.8 L65.3 97.5" stroke="#4a3f36" stroke-width=".8"/>
<path d="M62.4 96.4 L62.7 98.2" stroke="#4a3f36" stroke-width=".8"/>
<path d="M60.0 96.6 L60.0 98.4" stroke="#4a3f36" stroke-width=".8"/>
<path d="M57.6 96.4 L57.3 98.2" stroke="#4a3f36" stroke-width=".8"/>
<path d="M55.3 95.8 L54.7 97.5" stroke="#4a3f36" stroke-width=".8"/>
<path d="M53.2 94.8 L52.3 96.3" stroke="#4a3f36" stroke-width=".8"/>
<path d="M51.3 93.4 L50.1 94.8" stroke="#4a3f36" stroke-width=".8"/>
<path d="M49.6 91.7 L48.2 92.9" stroke="#4a3f36" stroke-width=".8"/>
<path d="M48.2 89.8 L46.7 90.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M47.2 87.7 L45.5 88.3" stroke="#4a3f36" stroke-width=".8"/>
<path d="M46.6 85.4 L44.8 85.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M46.4 83.0 L44.6 83.0" stroke="#4a3f36" stroke-width=".8"/>
<path d="M46.6 80.6 L44.8 80.3" stroke="#4a3f36" stroke-width=".8"/>
<path d="M47.2 78.3 L45.5 77.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M48.2 76.2 L46.7 75.3" stroke="#4a3f36" stroke-width=".8"/>
<path d="M49.6 74.3 L48.2 73.1" stroke="#4a3f36" stroke-width=".8"/>
<path d="M51.3 72.6 L50.1 71.2" stroke="#4a3f36" stroke-width=".8"/>
<path d="M53.2 71.2 L52.3 69.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M55.3 70.2 L54.7 68.5" stroke="#4a3f36" stroke-width=".8"/>
<path d="M57.6 69.6 L57.3 67.8" stroke="#4a3f36" stroke-width=".8"/>
<path d="M60.0 69.4 L60.0 67.6" stroke="#4a3f36" stroke-width=".8"/>
<path d="M62.4 69.6 L62.7 67.8" stroke="#4a3f36" stroke-width=".8"/>
<path d="M64.7 70.2 L65.3 68.5" stroke="#4a3f36" stroke-width=".8"/>
<path d="M66.8 71.2 L67.7 69.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M68.7 72.6 L69.9 71.2" stroke="#4a3f36" stroke-width=".8"/>
<path d="M70.4 74.3 L71.8 73.1" stroke="#4a3f36" stroke-width=".8"/>
<path d="M71.8 76.2 L73.3 75.3" stroke="#4a3f36" stroke-width=".8"/>
<path d="M72.8 78.3 L74.5 77.7" stroke="#4a3f36" stroke-width=".8"/>
<path d="M73.4 80.6 L75.2 80.3" stroke="#4a3f36" stroke-width=".8"/>
<circle cx="60" cy="83" r="12" fill="#5d6574"/><circle cx="60" cy="83" r="10.5" fill="url(#cam-glass)"/>
<circle cx="60" cy="83" r="6.5" fill="none" stroke="#6a4ea8" stroke-width="1" opacity=".55"/>
<path d="M52.5 78 A9 9 0 0 1 59 73.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>
<circle cx="64.5" cy="87.5" r="1.6" fill="#9fd8ff" opacity=".8"/>
<rect x="54" y="43" width="12" height="4.5" fill="#8a93a3"/>
<path d="M45 44 L46 27 L74 27 L75 44 Z" fill="#26201c"/><path d="M45 44 L46 27 L49 27 L48.5 44 Z" fill="#3e352f"/>
<rect x="48.5" y="29.5" width="23" height="11.5" rx="1.2" fill="#ffffff"/>
<g stroke="#e9f2ff" stroke-width=".7"><path d="M48.5 32.5 L71.5 32.5"/><path d="M48.5 35.2 L71.5 35.2"/><path d="M48.5 38 L71.5 38"/></g>
<path d="M60.0 22.0 L60.6 33.5 L63.5 31.5 L61.5 34.4 L73.0 35.0 L61.5 35.6 L63.5 38.5 L60.6 36.5 L60.0 48.0 L59.4 36.5 L56.5 38.5 L58.5 35.6 L47.0 35.0 L58.5 34.4 L56.5 31.5 L59.4 33.5 Z" fill="#fffdf2"/>
</svg>
`,
};

const urls = new Map<TrophyId, string>();

/** A trophy as an image's source: its SVG in a data URI, made once. */
export function trophyDataUrl(id: TrophyId): string {
  let url = urls.get(id);
  if (url === undefined) urls.set(id, (url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(TROPHIES[id])}`));
  return url;
}
