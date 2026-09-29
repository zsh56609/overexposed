// Ambient types for the handful of Node APIs /sim and /validate use.
// Stand-in for @types/node, which is not installed (CLAUDE.md §0.6: no dependencies without asking).
// If @types/node is ever added, delete this file.

declare const process: {
  readonly argv: readonly string[];
  exitCode: number | undefined;
};

declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare const performance: { now(): number };

interface ImportMeta {
  /** Directory of the current module (Node >= 20.11). */
  readonly dirname: string;
}

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  export function mkdirSync(path: string, options: { recursive: true }): string | undefined;
  export function readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): { readonly name: string; isDirectory(): boolean; isFile(): boolean }[];
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
  export function dirname(path: string): string;
}
