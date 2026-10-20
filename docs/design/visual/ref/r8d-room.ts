// Overexposed, round R8d: spring's photograph — `room`, one more scene for ui/desk/halftone.ts's SCENES
// (round V1a's halftone; the four of round R8a came the same way, docs/design/visual/ref/r8a-halftone.ts).
// Insert the entry below into SCENES, unchanged, before `street`; it draws with that module's own helpers (lg,
// glow, mulberry) on the scenes' 480×172 frame, as every scene does, and reads `o.off` for its roofs.
// Spring's card shows it light on ink (renderLightCanvas('room', 'spring', …, 'season', …)); a paper could print it too.
// The author's choice (2026-10-20): the year's four ovals are the room, the arena, the street and the carpet.
// (Wrapped in an object here only so this file parses; it is not compiled.)

const SCENES = {
  room(g, w, h, o) {
    // A small room, the year's start: the singer from behind on the edge of the bed, playing, at the window with
    // the city outside; a lamp on the left, the coat on its hook on the right. Summer's arena is the same back at
    // the far end of the year.
    g.fillStyle = lg(g, 0, 0, 0, h, [
      [0, '#a6a6a6'],
      [1, '#8a8a8a'],
    ]);
    g.fillRect(0, 0, w, h);
    const x0 = w * 0.335;
    const x1 = w * 0.665;
    const y0 = h * 0.08;
    const y1 = h * 0.74;
    glow(g, w * 0.5, h * 0.42, h * 0.75, 0.55);
    // The window: the sky, and the city's roofs along its foot.
    g.fillStyle = lg(g, 0, y0, 0, y1, [
      [0, '#ededed'],
      [1, '#fafafa'],
    ]);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const rnd = mulberry(11 + o.off);
    let bx = x0 - 4;
    while (bx < x1 + 4) {
      const bw = 14 + rnd() * 22;
      const top = y1 - h * (0.1 + rnd() * 0.2);
      g.fillStyle = rnd() < 0.5 ? '#7a7a7a' : '#8c8c8c';
      g.fillRect(bx, top, bw, y1 - top);
      g.fillStyle = '#9c9c9c';
      for (let yy = top + 4; yy < y1 - 3; yy += 6) {
        for (let xx = bx + 3; xx < bx + bw - 3; xx += 6) g.fillRect(xx, yy, 2.4, 3);
      }
      bx += bw + 1;
    }
    // The frame and its cross, the sill.
    g.fillStyle = '#161616';
    g.fillRect(x0 - 5, y0 - 5, x1 - x0 + 10, 5);
    g.fillRect(x0 - 5, y0, 5, y1 - y0);
    g.fillRect(x1, y0, 5, y1 - y0);
    g.fillRect(w * 0.5 - 1.6, y0, 3.2, y1 - y0);
    g.fillRect(x0, h * 0.38, x1 - x0, 3.2);
    g.fillStyle = '#3a3a3a';
    g.fillRect(x0 - 10, y1, x1 - x0 + 20, 4);
    // The curtains, drawn back.
    for (const side of [-1, 1]) {
      const cx = side < 0 ? x0 - 3 : x1 + 3;
      g.fillStyle = '#4e4e4e';
      g.beginPath();
      g.moveTo(cx - side * 18, 0);
      g.lineTo(cx + side * 12, 0);
      g.quadraticCurveTo(cx + side * 1, h * 0.38, cx + side * 6, h * 0.8);
      g.lineTo(cx - side * 24, h * 0.8);
      g.closePath();
      g.fill();
      g.strokeStyle = '#3a3a3a';
      g.lineWidth = 2;
      for (const f of [0.25, 0.6]) {
        g.beginPath();
        g.moveTo(cx - side * 18 * f, 0);
        g.quadraticCurveTo(cx - side * 18 * f + side * 3, h * 0.42, cx - side * 22 * f, h * 0.8);
        g.stroke();
      }
    }
    // The lamp on its little table, on the left.
    glow(g, w * 0.2, h * 0.46, h * 0.3, 0.5);
    g.fillStyle = '#141414';
    g.fillRect(w * 0.13, h * 0.68, w * 0.12, 3);
    g.fillRect(w * 0.14, h * 0.68, 2.6, h * 0.2);
    g.fillRect(w * 0.235, h * 0.68, 2.6, h * 0.2);
    g.fillRect(w * 0.188, h * 0.5, 2.4, h * 0.18);
    g.fillRect(w * 0.17, h * 0.665, 22, 3);
    g.beginPath();
    g.moveTo(w * 0.165, h * 0.5);
    g.lineTo(w * 0.222, h * 0.5);
    g.lineTo(w * 0.21, h * 0.37);
    g.lineTo(w * 0.177, h * 0.37);
    g.closePath();
    g.fill();
    // The coat on its hook, on the right: sloping shoulders from the hook, the collar, the sleeves hanging at its
    // sides, a little apart from the body.
    const hx = w * 0.79;
    g.fillStyle = '#141414';
    g.fillRect(hx - 4, h * 0.2, 8, 2.4);
    g.fillRect(hx - 1, h * 0.2, 2, 6);
    g.beginPath();
    g.moveTo(hx, h * 0.235);
    g.lineTo(hx - 13, h * 0.31);
    g.lineTo(hx - 14, h * 0.74);
    g.lineTo(hx + 14, h * 0.74);
    g.lineTo(hx + 13, h * 0.31);
    g.closePath();
    g.fill();
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(hx + side * 12, h * 0.3);
      g.quadraticCurveTo(hx + side * 19, h * 0.33, hx + side * 19.5, h * 0.42);
      g.lineTo(hx + side * 19, h * 0.66);
      g.lineTo(hx + side * 14.6, h * 0.67);
      g.lineTo(hx + side * 14.4, h * 0.36);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = '#5a5a5a';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(hx - 5, h * 0.25);
    g.lineTo(hx, h * 0.43);
    g.lineTo(hx + 5, h * 0.25);
    g.moveTo(hx, h * 0.43);
    g.lineTo(hx, h * 0.73);
    g.stroke();
    // The bed's edge, a fold in the blanket.
    g.fillStyle = '#5c5c5c';
    g.fillRect(0, h * 0.84, w, h * 0.16);
    g.fillStyle = '#4a4a4a';
    g.fillRect(0, h * 0.84, w, 2);
    // The singer from behind, the guitar on the lap: its neck out to the left past the shoulder, its body's edge at
    // the right hip.
    const cx = w * 0.5;
    const k = h / 100;
    g.fillStyle = '#060606';
    g.beginPath();
    g.moveTo(cx - 27 * k, h + 2);
    g.quadraticCurveTo(cx - 28 * k, h * 0.71, cx - 11 * k, h * 0.675);
    g.lineTo(cx + 11 * k, h * 0.675);
    g.quadraticCurveTo(cx + 28 * k, h * 0.71, cx + 27 * k, h + 2);
    g.closePath();
    g.fill();
    g.fillRect(cx - 4.4 * k, h * 0.61, 8.8 * k, 8 * k);
    g.beginPath();
    g.ellipse(cx, h * 0.555, 9.4 * k, 10.6 * k, 0.05, 0, 6.2832);
    g.fill();
    g.beginPath();
    g.ellipse(cx + 28 * k, h * 0.94, 9 * k, 11 * k, 0.35, 0, 6.2832);
    g.fill();
    g.save();
    g.translate(cx - 20 * k, h * 0.83);
    g.rotate(Math.PI + 0.42);
    g.fillRect(0, -1.9 * k, 40 * k, 3.8 * k);
    g.translate(40 * k, 0);
    g.rotate(-0.22);
    g.fillRect(0, -3.2 * k, 11 * k, 6.4 * k);
    for (const px of [2.5, 6, 9.5]) {
      g.fillRect(px * k, -5 * k, 1.6 * k, 2 * k);
      g.fillRect(px * k, 3 * k, 1.6 * k, 2 * k);
    }
    g.restore();
  },
};
