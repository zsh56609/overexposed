// The faces (round R8a): the author's ten portraits, docs/design/visual/ref/r8a-avatars/, unchanged, as strings — the
// people who text the player and the two managers, in colour, with brows and a nose but no eyes or mouth, each drawn
// at 100×100 to be shown in a circle. Mum's is a sunflower (her own photo is her garden: the player's family stays
// unpictured); the photographer's is the phone's grey placeholder (the number was never saved); Alex's profile is
// against a dusk sky, redrawn in round R8d (from afar the sun behind his head read as part of it); Dex's and Mags's
// wear their business cards' colours. They are code, never image files in the build (AGENTS.md §6, as the favicon
// is inlined): each is shown as an image from a data URI (ui/Face.tsx). Validate holds them equal to the reference
// files, and their ids unique across the ten.

import type { AvatarId } from '../core/index.ts';

export const AVATARS: Readonly<Record<AvatarId, string>> = {
  mum: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Mum">
<!-- Overexposed, R8a avatar "mum": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#8cc8ec"/>
<circle cx="18" cy="20" r="22" fill="#a9d8f3" opacity=".6"/>
<path d="M51 62 C52 74 50 86 53 101" fill="none" stroke="#3f8f3a" stroke-width="5" stroke-linecap="round"/>
<path d="M52 82 C60 72 72 72 78 76 C70 84 60 86 52 82 Z" fill="#4fa046"/>
<path d="M52.5 82 C61 77 69 76 76 76.5" fill="none" stroke="#3a8034" stroke-width="1.2"/>
<path d="M51 88 C44 80 33 80 27 84 C35 91 45 92 51 88 Z" fill="#46963f"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(11.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(33.75 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(56.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(78.75 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(101.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(123.75 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(146.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(168.75 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(191.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(213.75 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(236.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(258.75 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(281.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(303.75 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(326.25 50 43)"/>
<ellipse cx="50" cy="22" rx="6.2" ry="13" fill="#f2a91c" transform="rotate(348.75 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(0.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(22.5 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(45.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(67.5 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(90.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(112.5 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(135.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(157.5 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(180.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(202.5 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(225.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(247.5 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(270.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(292.5 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(315.0 50 43)"/>
<ellipse cx="50" cy="23" rx="6.6" ry="13.4" fill="#ffc82c" transform="rotate(337.5 50 43)"/>
<circle cx="50" cy="43" r="14" fill="#6b3d18"/>
<circle cx="50" cy="43" r="9.5" fill="#4c2a10"/>
<circle cx="61.30" cy="45.61" r="1.05" fill="#8a5326"/>
<circle cx="57.61" cy="51.75" r="1.05" fill="#8a5326"/>
<circle cx="51.01" cy="54.56" r="1.05" fill="#8a5326"/>
<circle cx="44.03" cy="52.94" r="1.05" fill="#8a5326"/>
<circle cx="39.32" cy="47.53" r="1.05" fill="#8a5326"/>
<circle cx="38.70" cy="40.39" r="1.05" fill="#8a5326"/>
<circle cx="42.39" cy="34.25" r="1.05" fill="#8a5326"/>
<circle cx="48.99" cy="31.44" r="1.05" fill="#8a5326"/>
<circle cx="55.97" cy="33.06" r="1.05" fill="#8a5326"/>
<circle cx="60.68" cy="38.47" r="1.05" fill="#8a5326"/>
<circle cx="55.57" cy="45.72" r="1.05" fill="#8a5326"/>
<circle cx="51.35" cy="49.05" r="1.05" fill="#8a5326"/>
<circle cx="46.11" cy="47.83" r="1.05" fill="#8a5326"/>
<circle cx="43.80" cy="42.97" r="1.05" fill="#8a5326"/>
<circle cx="46.16" cy="38.13" r="1.05" fill="#8a5326"/>
<circle cx="51.41" cy="36.96" r="1.05" fill="#8a5326"/>
<circle cx="55.60" cy="40.34" r="1.05" fill="#8a5326"/>
</svg>
`,
  sam: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Sam">
<!-- Overexposed, R8a avatar "sam": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#ff8a5b"/>
<circle cx="82" cy="18" r="30" fill="#ff9d70" opacity=".7"/>
<circle cx="31" cy="50" r="8.5" fill="#a64e1f"/>
<circle cx="69" cy="50" r="8.5" fill="#a64e1f"/>
<circle cx="30" cy="40" r="9" fill="#a64e1f"/>
<circle cx="70" cy="40" r="9" fill="#a64e1f"/>
<circle cx="34" cy="30" r="9.5" fill="#a64e1f"/>
<circle cx="66" cy="30" r="9.5" fill="#a64e1f"/>
<circle cx="42" cy="23" r="10" fill="#a64e1f"/>
<circle cx="58" cy="23" r="10" fill="#a64e1f"/>
<circle cx="50" cy="20" r="10.5" fill="#a64e1f"/>
<path d="M42.5 56 L42.5 74 Q50 80 57.5 74 L57.5 56 Z" fill="#e6b08a"/>
<defs><clipPath id="sam-tee"><path d="M12 100 C12 88 22 79 37 76 Q50 81 63 76 C78 79 88 88 88 100 Z"/></clipPath></defs>
<path d="M12.0 100 C12.0 88 22.0 79 37 76 Q50 81 63 76 C78.0 79 88.0 88 88.0 100 Z" fill="#f7f1e3"/>
<g clip-path="url(#sam-tee)" fill="#2e4370"><rect x="0" y="80" width="100" height="3.6"/><rect x="0" y="87.4" width="100" height="3.6"/><rect x="0" y="94.8" width="100" height="3.6"/></g>
<path d="M41 76.5 Q50 83 59 76.5" fill="none" stroke="#2e4370" stroke-width="2.4"/>
<ellipse cx="33.6" cy="46" rx="3.8" ry="5.4" fill="#f6caa6"/><ellipse cx="66.4" cy="46" rx="3.8" ry="5.4" fill="#f6caa6"/><path d="M33 43.6 Q31.6 46 33.2 48.4" fill="none" stroke="#dc9f7c" stroke-width="1.3" stroke-linecap="round"/><path d="M67 43.6 Q68.4 46 66.8 48.4" fill="none" stroke="#dc9f7c" stroke-width="1.3" stroke-linecap="round"/>
<path d="M33.5 43 C33.5 29 40.5 22.5 50 22.5 C59.5 22.5 66.5 29 66.5 43 C66.5 56 59.5 64.5 50 64.5 C40.5 64.5 33.5 56 33.5 43 Z" fill="#f6caa6"/>
<circle cx="36.5" cy="31" r="6.8" fill="#c8622b"/>
<circle cx="44" cy="26.5" r="7.2" fill="#c8622b"/>
<circle cx="52" cy="25.5" r="7.4" fill="#c8622b"/>
<circle cx="60" cy="28" r="6.8" fill="#c8622b"/>
<circle cx="65" cy="34.5" r="5.6" fill="#c8622b"/>
<circle cx="34.5" cy="37.6" r="4.8" fill="#c8622b"/>
<circle cx="40.6" cy="32.8" r="5" fill="#c8622b"/>
<path d="M38 29 Q41 25.5 45 26.6 M49 23.6 Q53 21.8 56.6 24 M60.5 27.6 Q63.6 28.4 64.6 31.6" fill="none" stroke="#a64e1f" stroke-width="1.5" stroke-linecap="round"/>
<g fill="#f2967a" opacity="0.5"><ellipse cx="40.5" cy="52.5" rx="4.2" ry="2.6"/><ellipse cx="59.5" cy="52.5" rx="4.2" ry="2.6"/></g>
<g fill="#9a4219" stroke="#9a4219" stroke-width=".7" stroke-linejoin="round"><path d="M40.00 40.15 Q43.40 34.65 47.80 36.75 L47.80 39.65 Q43.40 36.55 40.00 41.05 Z"/><path d="M60.00 40.15 Q56.60 34.65 52.20 36.75 L52.20 39.65 Q56.60 36.55 60.00 41.05 Z"/></g>
<path d="M50.6 46 Q48.8 50.8 50 52 Q51 52.6 52.2 51.8" fill="none" stroke="#d48e6c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  alex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Alex">
<!-- Overexposed, R8a avatar "alex", redrawn in round R8d (no sun behind him, the sky in its colours): drawn in code, flat colour; brows and nose only. -->
<defs><linearGradient id="alex-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4c90"/><stop offset=".52" stop-color="#7a5698"/><stop offset=".74" stop-color="#c46c86"/><stop offset="1" stop-color="#ee9c66"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#alex-sky)"/>
<path d="M45.4 61 L44.6 80 L61.6 80 L60.4 56 Z" fill="#bd875e"/>
<path d="M14 100 C16 86 30 78 44 76 L52 82 L64 75 C78 77 88 87 88 100 Z" fill="#30405c"/>
<path d="M44 76 L52 86 L49 76.5 Z M64 75 L54 86 L58 74.8 Z" fill="#46597c"/>
<path d="M45 27 C40.5 29.5 38.6 34.5 38.8 39.4 L38.2 42.2 C37.4 44.4 35.6 47.6 34.4 50.4 C34 51.4 34.6 52.2 35.8 52.4 L37.8 52.8 C37.6 54.2 37.8 55.4 38.4 56.2 C37.8 57.2 38.2 58.2 39.2 58.8 C38.8 60.4 39.6 62.2 41.6 63.2 C44.6 64.6 49 64.4 53 63 L58 59.8 C63 55.8 66 49.8 66 42.8 C66 31.8 59 24.8 51 24.8 C49 24.8 47 25.8 45 27 Z" fill="#d39d72"/>
<path d="M39.6 33.8 C41.4 35.2 45 35.8 49.6 35.8 C53.6 36 56.4 37.6 57.8 40.2 C60.4 43.4 61.6 48.4 61 53.6 C60.6 57.4 59.6 60.4 58.8 62.6 C61.6 64.8 66 65 69.4 63.4 C71.6 57 72.8 48.6 72.4 40.4 C72 30.6 66.6 22.6 58.6 20.2 C51.4 18.2 44 20.4 40.4 25.6 C38.8 28.2 38.6 31.6 39.6 33.8 Z" fill="#2b1f19"/>
<path d="M43 26.6 C48.6 22.8 58.4 22.6 64.6 27.8 M60.6 44 C62.4 49.4 62.4 55.4 60.8 60.6" fill="none" stroke="#46352b" stroke-width="1.5" stroke-linecap="round"/>
<ellipse cx="59" cy="46.8" rx="3.9" ry="5.6" fill="#d39d72"/>
<path d="M59.6 44.4 Q57.4 46.8 59.4 49.2" fill="none" stroke="#bd875e" stroke-width="1.3" stroke-linecap="round"/>
<path d="M39.4 39.6 Q41.6 36.8 45.6 37.6 L45.4 39.6 Q42.4 39 39.8 40.4 Z" fill="#2b1f19" stroke="#2b1f19" stroke-width=".6" stroke-linejoin="round"/>
<path d="M38.6 43.6 Q37.6 46 36.6 47.8" fill="none" stroke="#bd875e" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>
</svg>
`,
  juno: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Juno Vale">
<!-- Overexposed, R8a avatar "juno": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#e64f8c"/>
<circle cx="50" cy="44" r="40" fill="#ee6aa0" opacity=".7"/>
<path d="M17 16 Q18.68 20.32 23 22 Q18.68 23.68 17 28 Q15.32 23.68 11 22 Q15.32 20.32 17 16 Z" fill="#fff" opacity="0.9"/>
<path d="M84 25.6 Q85.23 28.77 88.4 30 Q85.23 31.23 84 34.4 Q82.77 31.23 79.6 30 Q82.77 28.77 84 25.6 Z" fill="#fff" opacity="0.8"/>
<path d="M80 76.6 Q80.95 79.05 83.4 80 Q80.95 80.95 80 83.4 Q79.05 80.95 76.6 80 Q79.05 79.05 80 76.6 Z" fill="#fff" opacity="0.7"/>
<path d="M22 67 Q22.84 69.16 25 70 Q22.84 70.84 22 73 Q21.16 70.84 19 70 Q21.16 69.16 22 67 Z" fill="#fff" opacity="0.6"/>
<path d="M28 44 C28 26 38 17 50 17 C62 17 72 26 72 44 L72.5 62 C66 64.5 60 64.5 55 63 L45 63 C40 64.5 34 64.5 27.5 62 Z" fill="#d8c287"/>
<path d="M42.5 56 L42.5 74 Q50 80 57.5 74 L57.5 56 Z" fill="#77462b"/>
<path d="M14 100 C14 90 22 84 34 82 Q50 86 66 82 C78 84 86 90 86 100 Z" fill="#1d1824"/>
<path d="M37 82 L39 72 M63 82 L61 72" stroke="#1d1824" stroke-width="2.2"/>
<path d="M36 76 C40 79 60 79 64 76 L66 82 Q50 86 34 82 Z" fill="#77462b"/>
<g fill="#c9c3d6"><circle cx="26" cy="92" r="1.1"/><circle cx="33" cy="88" r="1.1"/><circle cx="40" cy="94" r="1.1"/><circle cx="47" cy="90" r="1.1"/><circle cx="55" cy="93" r="1.1"/><circle cx="62" cy="89" r="1.1"/><circle cx="69" cy="94" r="1.1"/><circle cx="74" cy="90" r="1.1"/><circle cx="30" cy="97" r="1.1"/><circle cx="51" cy="97" r="1.1"/><circle cx="64" cy="97" r="1.1"/></g>
<path d="M33.5 43 C33.5 29 40.5 22.5 50 22.5 C59.5 22.5 66.5 29 66.5 43 C66.5 56 59.5 64.5 50 64.5 C40.5 64.5 33.5 56 33.5 43 Z" fill="#8d5737"/>
<g fill="none" stroke="#f3c24d" stroke-width="2.2"><circle cx="31.2" cy="63.6" r="5"/><circle cx="68.8" cy="63.6" r="5"/></g>
<path d="M29 46 C29 30 38 20.5 50 20.5 C62 20.5 71 30 71 46 L71.5 61 C68 62.2 65.6 62 63.6 61 C64.6 52 65.2 44 63.6 37.4 L36.4 37.4 C34.8 44 35.4 52 36.4 61 C34.4 62 32 62.2 28.5 61 Z" fill="#f2e2b0"/>
<path d="M33.6 38.2 L66.4 38.2 L66 33 C62 28 57 26 50 26 C43 26 38 28 34 33 Z" fill="#f2e2b0"/>
<path d="M35 38 L65 38" stroke="#d8c287" stroke-width="1.4"/>
<path d="M44 26.6 C46 24.6 54 24.6 56 26.6" fill="none" stroke="#fff6dc" stroke-width="2" stroke-linecap="round" opacity=".8"/>
<g fill="#2e1a10" stroke="#2e1a10" stroke-width=".7" stroke-linejoin="round"><path d="M39.60 42.45 Q42.60 36.60 47.80 38.95 L47.80 41.65 Q42.60 38.40 39.60 43.35 Z"/><path d="M60.40 42.45 Q57.40 36.60 52.20 38.95 L52.20 41.65 Q57.40 38.40 60.40 43.35 Z"/></g>
<path d="M51 43.6 Q48.4 50.2 49.6 52 Q50.8 53 52.6 52" fill="none" stroke="#5e3520" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  lio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Lio">
<!-- Overexposed, R8a avatar "lio": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#36296a"/>
<circle cx="80" cy="24" r="26" fill="#4ad3e6" opacity=".22"/>
<circle cx="18" cy="76" r="22" fill="#e04fa4" opacity=".18"/>
<path d="M42.5 56 L42.5 74 Q50 80 57.5 74 L57.5 56 Z" fill="#dcab80"/>
<path d="M12.0 100 C12.0 88 22.0 78 37 75 Q50 80 63 75 C78.0 78 88.0 88 88.0 100 Z" fill="#24232c"/>
<path d="M36 76 C40 84 60 84 64 76" fill="none" stroke="#33323d" stroke-width="5"/>
<path d="M44 82 L43 95 M56 82 L57 95" stroke="#d9d9e2" stroke-width="1.6" stroke-linecap="round"/>
<ellipse cx="33.6" cy="46" rx="3.8" ry="5.4" fill="#efc49c"/><ellipse cx="66.4" cy="46" rx="3.8" ry="5.4" fill="#efc49c"/><path d="M33 43.6 Q31.6 46 33.2 48.4" fill="none" stroke="#d39e75" stroke-width="1.3" stroke-linecap="round"/><path d="M67 43.6 Q68.4 46 66.8 48.4" fill="none" stroke="#d39e75" stroke-width="1.3" stroke-linecap="round"/>
<path d="M33.5 43 C33.5 29 40.5 22.5 50 22.5 C59.5 22.5 66.5 29 66.5 43 C66.5 56 59.5 64.5 50 64.5 C40.5 64.5 33.5 56 33.5 43 Z" fill="#efc49c"/>
<path d="M32.6 44 C31 28 39 19.5 50.5 19.5 C62 19.5 69.5 27 68.4 42 L66.6 41 C65.6 36 63.6 33 61 31.4 C56 36 46 38.6 36.4 38.4 C35 40 34.4 42 34.2 45 Z" fill="#18171d"/>
<path d="M61 31.4 C58 36.4 52 40 44.6 40.6 C49.6 37.6 53 34.4 55.4 30.4 Z" fill="#18171d"/>
<path d="M41 25.6 C46 22.8 55 22.6 60 25.4" fill="none" stroke="#3a3946" stroke-width="1.6" stroke-linecap="round"/>
<path d="M28 74 C28 62 72 62 72 74" fill="none" stroke="#2c2c35" stroke-width="3.4"/>
<g><rect x="25" y="68" width="13" height="15" rx="6" fill="#2f2f39"/><rect x="62" y="68" width="13" height="15" rx="6" fill="#2f2f39"/><rect x="27.5" y="70.5" width="8" height="10" rx="4" fill="#4ad3e6"/><rect x="64.5" y="70.5" width="8" height="10" rx="4" fill="#4ad3e6"/></g>
<g fill="#18171d" stroke="#18171d" stroke-width=".7" stroke-linejoin="round"><path d="M40.00 41.55 Q43.80 39.25 47.80 39.75 L47.80 42.65 Q43.80 41.15 40.00 42.45 Z"/><path d="M60.00 41.55 Q56.20 39.25 52.20 39.75 L52.20 42.65 Q56.20 41.15 60.00 42.45 Z"/></g>
<path d="M50.6 46 Q48.8 50.8 50 52 Q51 52.6 52.2 51.8" fill="none" stroke="#c88f68" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  priya: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Priya">
<!-- Overexposed, R8a avatar "priya": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#2a9a8c"/>
<circle cx="80" cy="18" r="28" fill="#36ab9c" opacity=".8"/>
<g transform="rotate(-28 24 40)"><rect x="19.4" y="40" width="7.6" height="44" fill="#3a2418"/><path d="M17.6 20 C17 15 21 12 23.2 12 C25.4 12 29.4 15 28.8 20 L28 41 L18.4 41 Z" fill="#7a4a2a"/><g fill="#e9e4da"><circle cx="16.4" cy="21" r="1.7"/><circle cx="16.6" cy="28" r="1.7"/><circle cx="16.8" cy="35" r="1.7"/><circle cx="30" cy="21" r="1.7"/><circle cx="29.8" cy="28" r="1.7"/><circle cx="29.6" cy="35" r="1.7"/></g><rect x="19.4" y="40" width="7.6" height="1.6" fill="#efe6d2"/></g>
<path d="M30.6 44 C28.6 28 38.4 18 50 18 C61.6 18 71.4 28 69.4 44 C68.6 56 73 66 76.4 78 C70 82 62 82 58 78 L42 78 C38 82 30 82 23.6 78 C27 66 31.4 56 30.6 44 Z" fill="#2a1913"/>
<path d="M42.5 56 L42.5 74 Q50 80 57.5 74 L57.5 56 Z" fill="#9e6441"/>
<path d="M12.0 100 C12.0 88 22.0 79 37 76 Q50 81 63 76 C78.0 79 88.0 88 88.0 100 Z" fill="#e3a53a"/>
<path d="M38 76.5 Q50 84 62 76.5" fill="none" stroke="#c98d2a" stroke-width="3"/>
<g stroke="#c98d2a" stroke-width="1" opacity=".7"><path d="M24 86 L24 100"/><path d="M30 86 L30 100"/><path d="M70 86 L70 100"/><path d="M76 86 L76 100"/></g>
<path d="M32 77.6 C34 84 36 92 37 100" fill="none" stroke="#3a2418" stroke-width="4.6"/>
<ellipse cx="33.6" cy="46" rx="3.8" ry="5.4" fill="#b5784f"/><ellipse cx="66.4" cy="46" rx="3.8" ry="5.4" fill="#b5784f"/><path d="M33 43.6 Q31.6 46 33.2 48.4" fill="none" stroke="#93593a" stroke-width="1.3" stroke-linecap="round"/><path d="M67 43.6 Q68.4 46 66.8 48.4" fill="none" stroke="#93593a" stroke-width="1.3" stroke-linecap="round"/>
<path d="M33.5 43 C33.5 29 40.5 22.5 50 22.5 C59.5 22.5 66.5 29 66.5 43 C66.5 56 59.5 64.5 50 64.5 C40.5 64.5 33.5 56 33.5 43 Z" fill="#b5784f"/>
<path d="M34.4 38 C33 48 32.6 56 29.4 64 C27.6 68.6 25.6 72 24.4 76.6 C29 78.4 34 77.4 36.6 73.4 C37.6 67 36.4 61 35.4 56 C34.6 51.6 34.4 46 35.6 39.6 Z" fill="#2a1913"/>
<path d="M65.6 38 C67 48 67.4 56 70.6 64 C72.4 68.6 74.4 72 75.6 76.6 C71 78.4 66 77.4 63.4 73.4 C62.4 67 63.6 61 64.6 56 C65.4 51.6 65.6 46 64.4 39.6 Z" fill="#2a1913"/>
<path d="M33 44 C32 30 40 21 50 21 C60 21 68 30 67 44 C64 36 58 30.5 51 29.6 L49.2 29.6 C42 30.5 36 36 33 44 Z" fill="#2a1913"/>
<path d="M50 21.5 Q49.6 25.6 50 29.6" fill="none" stroke="#3d261c" stroke-width="1.4"/>
<path d="M31.6 58 Q33 63 30.4 68 M68.4 58 Q67 63 69.6 68" fill="none" stroke="#3d261c" stroke-width="1.4" stroke-linecap="round"/>
<g fill="#24140e" stroke="#24140e" stroke-width=".7" stroke-linejoin="round"><path d="M40.00 39.15 Q43.60 34.85 47.80 36.35 L47.80 39.25 Q43.60 36.75 40.00 40.05 Z"/><path d="M60.00 39.15 Q56.40 34.85 52.20 36.35 L52.20 39.25 Q56.40 36.75 60.00 40.05 Z"/></g>
<path d="M51 43.6 Q48.4 50.2 49.6 52 Q50.8 53 52.6 52" fill="none" stroke="#8f5534" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  dana: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Dana">
<!-- Overexposed, R8a avatar "dana": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#3253c2"/>
<polygon points="78.00,4.00 82.94,17.20 97.02,17.82 85.99,26.60 89.76,40.18 78.00,32.40 66.24,40.18 70.01,26.60 58.98,17.82 73.06,17.20" fill="#ffd23f" opacity="0.95" stroke-linejoin="round"/>
<circle cx="18" cy="84" r="24" fill="#3d61d4" opacity=".8"/>
<circle cx="50" cy="17" r="9.6" fill="#1b1311"/>
<path d="M42.5 56 L42.5 74 Q50 80 57.5 74 L57.5 56 Z" fill="#85522f"/>
<path d="M12.0 100 C12.0 88 22.0 79 37 76 Q50 81 63 76 C78.0 79 88.0 88 88.0 100 Z" fill="#1f2533"/>
<path d="M39 76 Q50 84 61 76 L58 100 L42 100 Z" fill="#f2f2f2"/>
<path d="M39 76 L46 100 L36 100 Z M61 76 L54 100 L64 100 Z" fill="#2b3346"/>
<path d="M42 76 L48 92 M58 76 L52 92" stroke="#e5483b" stroke-width="2.4" stroke-linecap="round"/>
<rect x="44.4" y="90" width="11.2" height="9" rx="1.4" fill="#f8f8f8" stroke="#c9cbd2" stroke-width=".8"/>
<rect x="46.4" y="92.6" width="7.2" height="1.6" fill="#3253c2"/>
<ellipse cx="33.6" cy="46" rx="3.8" ry="5.4" fill="#9a6340"/><ellipse cx="66.4" cy="46" rx="3.8" ry="5.4" fill="#9a6340"/><path d="M33 43.6 Q31.6 46 33.2 48.4" fill="none" stroke="#7b4a2b" stroke-width="1.3" stroke-linecap="round"/><path d="M67 43.6 Q68.4 46 66.8 48.4" fill="none" stroke="#7b4a2b" stroke-width="1.3" stroke-linecap="round"/>
<path d="M33.5 43 C33.5 29 40.5 22.5 50 22.5 C59.5 22.5 66.5 29 66.5 43 C66.5 56 59.5 64.5 50 64.5 C40.5 64.5 33.5 56 33.5 43 Z" fill="#9a6340"/>
<path d="M33.4 43 C33 29 40.5 22 50 22 C59.5 22 67 29 66.6 43 C64.6 34 58 29 50 29 C42 29 35.4 34 33.4 43 Z" fill="#1b1311"/>
<path d="M42 24.6 C46 23 54 23 58 24.6" fill="none" stroke="#3a2d29" stroke-width="1.5" stroke-linecap="round"/>
<path d="M31.4 46 C30 26 70 26 68.6 46" fill="none" stroke="#2a2a30" stroke-width="2.6"/>
<rect x="64.2" y="40" width="8" height="11" rx="3.4" fill="#2a2a30"/>
<path d="M66.4 49.6 C64 56 59 58.6 53.4 58.8" fill="none" stroke="#2a2a30" stroke-width="2.2" stroke-linecap="round"/>
<rect x="49.6" y="56.8" width="5.2" height="4" rx="2" fill="#2a2a30"/>
<g fill="#1b1311" stroke="#1b1311" stroke-width=".7" stroke-linejoin="round"><path d="M40.00 37.15 Q44.00 35.05 47.80 37.15 L47.80 40.05 Q44.00 36.95 40.00 38.05 Z"/><path d="M60.00 37.15 Q56.00 35.05 52.20 37.15 L52.20 40.05 Q56.00 36.95 60.00 38.05 Z"/></g>
<path d="M51 43.6 Q48.4 50.2 49.6 52 Q50.8 53 52.6 52" fill="none" stroke="#6f4126" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  photographer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Unknown number">
<!-- Overexposed, R8a avatar "photographer": drawn in code, flat colour; brows and nose only. -->
<defs><linearGradient id="ph-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9afba"/><stop offset="1" stop-color="#868c98"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#ph-bg)"/>
<circle cx="50" cy="40" r="16.5" fill="#eceef2"/>
<path d="M17 100 C17 76 32 63 50 63 C68 63 83 76 83 100 Z" fill="#eceef2"/>
</svg>
`,
  veteran: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Dex Holloway">
<!-- Overexposed, R8a avatar "veteran": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#151413"/>
<circle cx="50" cy="50" r="45.5" fill="none" stroke="#d6b46e" stroke-width="1.2" opacity=".55"/>
<path d="M42.5 56 L42.5 74 Q50 80 57.5 74 L57.5 56 Z" fill="#5c3520"/>
<path d="M11.24 100 C11.24 88 21.24 79 37 76 Q50 81 63 76 C78.76 79 88.76 88 88.76 100 Z" fill="#0d0d0e"/>
<path d="M40 76 L50 92 L60 76 Z" fill="#efe9dc"/>
<path d="M43 76 L50 86 L57 76 Z" fill="#5c3520"/>
<path d="M37 76.6 L50 100 L42 100 L31 82 Z M63 76.6 L50 100 L58 100 L69 82 Z" fill="#1d1d1f"/>
<path d="M37 76.6 L44 89 M63 76.6 L56 89" stroke="#3a3a3c" stroke-width="1"/>
<path d="M22 89 L30 86.6 L29.6 91.6 Z" fill="#d6b46e"/>
<ellipse cx="33.6" cy="46" rx="3.8" ry="5.4" fill="#6f432a"/><ellipse cx="66.4" cy="46" rx="3.8" ry="5.4" fill="#6f432a"/><path d="M33 43.6 Q31.6 46 33.2 48.4" fill="none" stroke="#552f1c" stroke-width="1.3" stroke-linecap="round"/><path d="M67 43.6 Q68.4 46 66.8 48.4" fill="none" stroke="#552f1c" stroke-width="1.3" stroke-linecap="round"/>
<path d="M33.5 43 C33.5 29 40.5 22.5 50 22.5 C59.5 22.5 66.5 29 66.5 43 C66.5 56 59.5 64.5 50 64.5 C40.5 64.5 33.5 56 33.5 43 Z" fill="#6f432a"/>
<path d="M33.6 46 C32.8 29 40.6 21.2 50 21.2 C59.4 21.2 67.2 29 66.4 46 L64.8 46 C64.8 39.4 63.4 34.6 60.4 32.2 C57.2 30.2 53.6 30.6 50 30.6 C46.4 30.6 42.8 30.2 39.6 32.2 C36.6 34.6 35.2 39.4 35.2 46 Z" fill="#d6d5d1"/>
<path d="M34.6 45.6 L35.6 45.6 C36.4 51.8 39.4 55.6 44 55.8 C46.4 55.8 48.2 54.8 50 54.8 C51.8 54.8 53.6 55.8 56 55.8 C60.6 55.6 63.6 51.8 64.4 45.6 L65.4 45.6 C66.2 57.6 59.6 65.4 50 65.4 C40.4 65.4 33.8 57.6 34.6 45.6 Z" fill="#d6d5d1"/>
<g fill="none" stroke="#b3b2ad" stroke-width="1" stroke-linecap="round"><path d="M41 59.6 l1.4 1.6 M45.6 61.6 l.8 1.8 M54.4 61.6 l-.8 1.8 M59 59.6 l-1.4 1.6 M38.4 36 l1.6 -1.2 M61.6 36 l-1.6 -1.2 M45 26.4 l1.8 -.6 M53.4 26 l1.8 .4"/></g>
<g fill="#c9c9c6" stroke="#c9c9c6" stroke-width=".7" stroke-linejoin="round"><path d="M40.00 38.35 Q43.80 36.00 47.80 36.45 L47.80 39.55 Q43.80 38.00 40.00 39.25 Z"/><path d="M60.00 36.01 Q56.20 33.66 52.20 35.28 L52.20 38.38 Q56.20 35.66 60.00 36.91 Z"/></g>
<path d="M51.2 42.6 Q48.6 50.6 49.6 52.8 Q50.8 53.8 53 52.6" fill="none" stroke="#4a2817" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  guardian: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Marguerite Ashby">
<!-- Overexposed, R8a avatar "guardian": drawn in code, flat colour; brows and nose only. -->
<rect width="100" height="100" fill="#f1e5cc"/>
<circle cx="84" cy="80" r="26" fill="#e8d7b6" opacity=".8"/>
<circle cx="33" cy="52" r="7.6" fill="#aaa59f"/>
<circle cx="67" cy="52" r="7.6" fill="#aaa59f"/>
<circle cx="31.4" cy="42" r="8.6" fill="#aaa59f"/>
<circle cx="68.6" cy="42" r="8.6" fill="#aaa59f"/>
<circle cx="35" cy="31.6" r="9" fill="#aaa59f"/>
<circle cx="65" cy="31.6" r="9" fill="#aaa59f"/>
<circle cx="43" cy="24.4" r="9.2" fill="#aaa59f"/>
<circle cx="57" cy="24.4" r="9.2" fill="#aaa59f"/>
<circle cx="50" cy="22.4" r="9" fill="#aaa59f"/>
<path d="M42.5 56 L42.5 74 Q50 80 57.5 74 L57.5 56 Z" fill="#e2b495"/>
<path d="M12.0 100 C12.0 88 22.0 79 37 76 Q50 81 63 76 C78.0 79 88.0 88 88.0 100 Z" fill="#8fa982"/>
<path d="M44 78 L50 100 L56 78 Z" fill="#f4efe4"/>
<path d="M36 74 C42 80 58 80 64 74 C66 78 64 82 60 83 C54 85 46 85 40 83 C36 82 34 78 36 74 Z" fill="#c8623a"/>
<path d="M53 82 L58 97 L51.4 96 L49 83 Z" fill="#b2532e"/>
<path d="M40 79 Q50 82.6 60 79" fill="none" stroke="#a9492a" stroke-width="1.2"/>
<ellipse cx="33.6" cy="46" rx="3.8" ry="5.4" fill="#f2ccb0"/><ellipse cx="66.4" cy="46" rx="3.8" ry="5.4" fill="#f2ccb0"/><path d="M33 43.6 Q31.6 46 33.2 48.4" fill="none" stroke="#d9a585" stroke-width="1.3" stroke-linecap="round"/><path d="M67 43.6 Q68.4 46 66.8 48.4" fill="none" stroke="#d9a585" stroke-width="1.3" stroke-linecap="round"/>
<path d="M33.5 43 C33.5 29 40.5 22.5 50 22.5 C59.5 22.5 66.5 29 66.5 43 C66.5 56 59.5 64.5 50 64.5 C40.5 64.5 33.5 56 33.5 43 Z" fill="#f2ccb0"/>
<circle cx="38.4" cy="31.2" r="6.4" fill="#cbc7c2"/>
<circle cx="45.6" cy="27.6" r="6.6" fill="#cbc7c2"/>
<circle cx="53.6" cy="27.4" r="6.6" fill="#cbc7c2"/>
<circle cx="61" cy="30.6" r="6.2" fill="#cbc7c2"/>
<circle cx="34.8" cy="38.6" r="4.4" fill="#cbc7c2"/>
<circle cx="65.4" cy="38" r="4.4" fill="#cbc7c2"/>
<path d="M40.4 30 Q43.4 27.4 47 28.4 M51.8 26 Q55.4 25.2 58.4 27.6" fill="none" stroke="#aaa59f" stroke-width="1.4" stroke-linecap="round"/>
<g fill="#ec9f86" opacity="0.38"><ellipse cx="40.5" cy="53" rx="4.2" ry="2.6"/><ellipse cx="59.5" cy="53" rx="4.2" ry="2.6"/></g>
<g fill="#8f8982" stroke="#8f8982" stroke-width=".7" stroke-linejoin="round"><path d="M39.80 37.95 Q43.20 33.30 47.80 34.25 L47.80 36.95 Q43.20 35.10 39.80 38.85 Z"/><path d="M60.20 37.95 Q56.80 33.30 52.20 34.25 L52.20 36.95 Q56.80 35.10 60.20 38.85 Z"/></g>
<g fill="none" stroke="#6b4429" stroke-width="2"><circle cx="42.6" cy="45" r="5.6"/><circle cx="57.4" cy="45" r="5.6"/><path d="M48.2 44.4 Q50 43.2 51.8 44.4"/><path d="M37 44 L34 43 M63 44 L66 43"/></g>
<path d="M48.4 50.4 Q50 52.4 51.8 50.4" fill="none" stroke="#cd9476" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
};

const urls = new Map<AvatarId, string>();

/** A face as an image's source: its SVG in a data URI, made once. */
export function avatarUrl(id: AvatarId): string {
  let url = urls.get(id);
  if (url === undefined) urls.set(id, (url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(AVATARS[id])}`));
  return url;
}
