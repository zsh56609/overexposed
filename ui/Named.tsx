// People's names in their colours (round R8c, E2): <Named text={…} /> renders a text with each name a <span class="pn">
// carrying its person's two colours (--c lit, --c-ink on paper; an .ink ancestor picks the ink one). The characters
// are unchanged. <PersonName> colours a name whole: a text's header, a manager's card, a signature's sender.

import type { CSSProperties, ReactNode } from 'react';
import { splitNames } from './names.ts';
import { PEOPLE, type PersonId } from './people.ts';

/** A person's two colours, as the .pn rules read them. */
export const personColours = (id: PersonId): CSSProperties => ({ ['--c' as string]: PEOPLE[id].lit, ['--c-ink' as string]: PEOPLE[id].ink });

/** Whether an id names one of the people (an avatar id, or Gran). */
export const isPerson = (id: string | null | undefined): id is PersonId => !!id && Object.hasOwn(PEOPLE, id);

/** A text with each name in its person's colour. */
export function Named({ text }: { text: string }) {
  return (
    <>
      {splitNames(text).map((piece, i) =>
        piece.person ? (
          <span key={i} className="pn" style={personColours(piece.person)}>
            {piece.text}
          </span>
        ) : (
          piece.text
        ),
      )}
    </>
  );
}

/** A name coloured whole by its person: what it says need not be found in it (the unknown number's). */
export function PersonName({ person, children }: { person: PersonId; children: ReactNode }) {
  return (
    <span className="pn" style={personColours(person)}>
      {children}
    </span>
  );
}
