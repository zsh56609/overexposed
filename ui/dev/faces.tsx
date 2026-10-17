// Every card face of the content, for check:overflow (round R1, H2): a group at a time in the real hand — five
// cards, and a crowded eight — and in an offer of four at 1.1×, on the game's own stage. The page is driven from the
// check: window.__faces.show('hand5' | 'hand8' | 'offer', group) renders a group and reports how many groups there
// are. Dev-only: Vite serves it, the build never includes it.

import { useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { createInitialState } from '../../core/index.ts';
import { content } from '../content.ts';
import { Desk } from '../desk/Desk.tsx';
import { Hand } from '../desk/Hand.tsx';
import { IconDefs } from '../desk/Icons.tsx';
import { offerCardModel, type HandWords } from '../desk/model.ts';
import { t } from '../i18n.ts';
import { Stage } from '../Stage.tsx';
import { CardPicture } from '../desk/Hand.tsx';
import '../style.css';
import '../screens/common.tsx';

type Layout = 'hand5' | 'hand8' | 'offer';
const SIZE: Record<Layout, number> = { hand5: 5, hand8: 8, offer: 4 };

const state = createInitialState(1, content, { strict: true });
const ids = (Array.isArray(content.cards) ? content.cards : []).map((card) => card.id);
let shown: { layout: Layout; group: number } = { layout: 'hand5', group: 0 };
const listeners = new Set<() => void>();
const words = (): HandWords => ({ callsheet: t('ui.face.callsheet'), revision: t('ui.face.revision'), pass: t('ui.face.pass'), cross: t('ui.face.cross'), opportunity: t('ui.face.opportunity'), scandal: '', noActions: '' });
void Desk; // the desk's styles: the hand's faces live under .desk .hand

declare global {
  interface Window {
    __faces: { show(layout: Layout, group: number): number; cards: readonly string[] };
  }
}
window.__faces = {
  cards: ids,
  show(layout, group) {
    shown = { layout, group };
    for (const fn of listeners) fn();
    return Math.ceil(ids.length / SIZE[layout]);
  },
};

function Faces() {
  const now = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => shown,
  );
  const [lane] = useState<string | null>(null);
  const size = SIZE[now.layout];
  const cards = ids.slice(now.group * size, now.group * size + size).map((id, i) => offerCardModel(state, id, lane, i + 1));
  if (now.layout === 'offer')
    return (
      <div className="scr offers draft" data-screen="faces">
        <IconDefs />
        <div className="drow faces">
          {cards.map((card) => (
            <div key={card.cardId} className="dslot">
              <div className="lift take">
                <CardPicture card={card} words={words()} season="summer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="desk summer lane-early">
      <IconDefs />
      <Hand
        cards={cards.map((card) => ({ ...card, playable: true }))}
        words={words()}
        endTurn={{ title: '', sub: '', printing: 0, legal: false }}
        season="summer"
        play={() => {}}
        end={() => {}}
        focus={() => {}}
        toast={() => {}}
        busy={false}
      />
    </div>
  );
}

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <Stage>
      <Faces />
    </Stage>,
  );
