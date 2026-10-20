// The people's colours (round R8c, E1; docs/design/visual/ref/r8c-awards.html): each person's names as running text
// writes them, and two colours close to their portrait's — lit on dark grounds, ink on paper. Keyed by avatar id (core's
// AVATAR_IDS), and Gran, who has no portrait. The unknown number (the photographer) has no name to find: its header is
// coloured whole, grey. Plain TypeScript, so validate can read it (no check imports a .tsx). English names, as the
// words are: a renamed person shows up in validate as a stale name.

export interface Person {
  /** The names running text writes, found as whole words. */
  readonly names: readonly string[];
  /** On dark grounds. */
  readonly lit: string;
  /** On paper. */
  readonly ink: string;
}

export const PEOPLE = {
  mum: { names: ['Mum'], lit: '#ffcf4a', ink: '#a86f00' },
  gran: { names: ['Gran'], lit: '#f2655f', ink: '#b0302a' },
  sam: { names: ['Sam Whitlock', 'Sam'], lit: '#ffa36e', ink: '#b8501f' },
  alex: { names: ['Alex'], lit: '#b7a6f0', ink: '#5f4ea8' },
  juno: { names: ['Juno Vale', 'Juno'], lit: '#ff78b0', ink: '#c42d6c' },
  lio: { names: ['Lio'], lit: '#5cd6ec', ink: '#1f7d93' },
  priya: { names: ['Priya'], lit: '#4fd3b6', ink: '#1f7f6c' },
  dana: { names: ['Dana'], lit: '#87a0ff', ink: '#2f4fc0' },
  photographer: { names: [], lit: '#b9bfcb', ink: '#5d6574' },
  veteran: { names: ['Dex Holloway', 'Dex'], lit: '#dcb46c', ink: '#8a6420' },
  guardian: { names: ['Marguerite Ashby', 'Marguerite', 'Mags'], lit: '#a9cf8e', ink: '#4f7a3a' },
} as const satisfies Readonly<Record<string, Person>>;

export type PersonId = keyof typeof PEOPLE;
