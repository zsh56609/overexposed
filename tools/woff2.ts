// node tools/woff2.ts — the game's self-hosted fonts (round V1a; docs/design/visual/README.md).
//
// Wraps each TrueType font in WOFF2 without changing it: every table is stored with the null transform
// (glyf and loca too), so decompression gives back the original tables byte for byte, and no WOFF2
// metadata is added. The OFL-FAQ counts a web-font wrapper whose "original font data remains unchanged
// except for compression" as no modification, so the fonts keep their names — Playfair Display is a
// Reserved Font Name. Subsetting would be a modification, so the fonts are whole. Node's own Brotli, no
// dependency. Every output is decoded again here and compared with its source, table by table.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = [
  ['docs/design/visual/cover/PlayfairDisplay.ttf', 'ui/fonts/PlayfairDisplay.woff2'],
  ['docs/design/visual/cover/PlayfairDisplay-Italic.ttf', 'ui/fonts/PlayfairDisplay-Italic.woff2'],
  ['docs/design/visual/cover/LibreFranklin.ttf', 'ui/fonts/LibreFranklin.woff2'],
] as const;

interface Table {
  readonly tag: string;
  readonly data: Buffer;
}

/** The sfnt's tables, in tag order (the order a font's table directory keeps). */
function readTables(sfnt: Buffer): { flavor: number; tables: Table[] } {
  const flavor = sfnt.readUInt32BE(0);
  const count = sfnt.readUInt16BE(4);
  const tables: Table[] = [];
  for (let i = 0; i < count; i++) {
    const at = 12 + 16 * i;
    const offset = sfnt.readUInt32BE(at + 8);
    tables.push({ tag: sfnt.toString('latin1', at, at + 4), data: sfnt.subarray(offset, offset + sfnt.readUInt32BE(at + 12)) });
  }
  return { flavor, tables: tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0)) };
}

/** UIntBase128: big-endian 7-bit groups, the high bit set on every byte but the last, no leading zero byte. */
function base128(n: number): number[] {
  const bytes = [n & 0x7f];
  for (let v = n >>> 7; v > 0; v >>>= 7) bytes.unshift((v & 0x7f) | 0x80);
  return bytes;
}

function readBase128(buf: Buffer, at: number): [number, number] {
  let n = 0;
  for (let i = 0; i < 5; i++) {
    const b = buf[at + i] as number;
    n = n * 128 + (b & 0x7f);
    if ((b & 0x80) === 0) return [n, at + i + 1];
  }
  throw new Error('bad UIntBase128');
}

const round4 = (n: number) => (n + 3) & ~3;

export function encode(sfnt: Buffer): Buffer {
  const { flavor, tables } = readTables(sfnt);
  const directory: number[] = [];
  for (const table of tables) {
    // Tag index 63: the tag follows in full. Transform version 3 is glyf's and loca's null transform; 0 is
    // every other table's. A null-transformed table has no transformLength.
    directory.push(((table.tag === 'glyf' || table.tag === 'loca' ? 3 : 0) << 6) | 63, ...Buffer.from(table.tag, 'latin1'), ...base128(table.data.length));
  }
  const stream = Buffer.concat(tables.map((t) => t.data));
  const compressed = brotliCompressSync(stream, {
    params: { [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_FONT, [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: stream.length },
  });
  const dataAt = 48 + directory.length;
  const length = round4(dataAt + compressed.length);
  const out = Buffer.alloc(length);
  out.write('wOF2', 0, 'latin1');
  out.writeUInt32BE(flavor, 4);
  out.writeUInt32BE(length, 8);
  out.writeUInt16BE(tables.length, 12);
  out.writeUInt32BE(12 + 16 * tables.length + tables.reduce((n, t) => n + round4(t.data.length), 0), 16); // totalSfntSize
  out.writeUInt32BE(compressed.length, 20); // totalCompressedSize
  out.writeUInt16BE(1, 24); // major version; minor 0; no metadata, no private data
  Buffer.from(directory).copy(out, 48);
  compressed.copy(out, dataAt);
  return out;
}

/** Decodes a null-transformed WOFF2 back into its tables. */
function decode(woff: Buffer): Table[] {
  if (woff.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not WOFF2');
  const count = woff.readUInt16BE(12);
  const entries: { tag: string; length: number }[] = [];
  let at = 48;
  for (let i = 0; i < count; i++) {
    const flags = woff[at++] as number;
    if ((flags & 0x3f) !== 63) throw new Error('expected a full tag');
    const tag = woff.toString('latin1', at, at + 4);
    at += 4;
    const [length, next] = readBase128(woff, at);
    at = next;
    entries.push({ tag, length });
  }
  const stream = brotliDecompressSync(woff.subarray(at, at + woff.readUInt32BE(20)));
  let offset = 0;
  return entries.map((e) => {
    const data = stream.subarray(offset, offset + e.length);
    offset += e.length;
    return { tag: e.tag, data };
  });
}

for (const [from, to] of FONTS) {
  const sfnt = readFileSync(join(ROOT, from));
  const woff = encode(sfnt);
  const back = decode(woff);
  const original = readTables(sfnt).tables;
  const same = back.length === original.length && back.every((t, i) => t.tag === original[i]?.tag && t.data.equals(original[i].data));
  if (!same) throw new Error(`${to}: the decoded tables differ from ${from}`);
  writeFileSync(join(ROOT, to), woff);
  console.log(`${to}: ${original.length} tables, ${sfnt.length} → ${woff.length} bytes, every table byte-identical after decoding`);
}
