// The papers (round V1a; README §2, §7), back left: The Daily Flash, B-Side and Marquee standing on the desk, this
// month's issue. /core's lead paper stands in front, the other two behind with their mastheads showing; clicking
// a paper behind pulls it forward. The paper comes to the player (round R1, H3): a play that prints in a paper
// behind brings that paper forward while the card is carried, with the same motion. The paper in front stays until
// another play brings a different one forward, the player picks one, or the month ends and the new issue's lead
// takes the desk. Reduced motion swaps the papers with a short crossfade. Switching papers re-renders only the papers. Every word, the photograph's scene and drawing, and the box office are the
// adapter's (./model.ts).

import { memo, useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { motionMode } from '../motion.ts';
import { isPlaceholder } from '../text.ts';
import { photoUrl } from './halftone.ts';
import type { ItemModel, PageModel, PapersModel, RightModel } from './model.ts';

const ph = (text: string, base = ''): string | undefined => (isPlaceholder(text) ? `${base} placeholder`.trim() : base || undefined);

/** An item's classes: the margin mark, a scandal's red, a brief's size; data-coming for V1b. */
const itemClass = (x: ItemModel, base: string): string => `${base}${x.mark === 'you' ? ' you' : x.mark === 'rival' ? ' rival' : ''}${x.red ? ' red' : ''}${x.brief ? ' brief' : ''}`;

function Right({ right }: { right: RightModel }) {
  if (!right) return <div />;
  if (right.kind === 'boxoffice') {
    return (
      <div>
        <div className="bo" data-hook="boxoffice">
          <b>{right.title}</b>
          {right.rows.map((r) => (
            <div key={r.rank} className={r.player ? 'me' : undefined}>
              <span className={ph(r.title)}>
                {r.rank}. {r.title}
                {r.fresh && <em>{r.fresh}</em>}
              </span>
              <span>{r.gross}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className={`ph scene-${right.scene}`} data-scene={right.scene} data-variant={right.variant} style={{ backgroundImage: `url(${photoUrl(right.scene, right.season, right.variant)})` }} />
      <div className="cp">{right.caption}</div>
    </div>
  );
}

const Paper = memo(function Paper({ page, pos, forward, label }: { page: PageModel; pos: number; forward: (paper: string) => void; label: string }) {
  const m = page.masthead;
  const back = pos > 0;
  const pull = () => back && forward(page.paper);
  const key = (e: KeyboardEvent) => {
    if (back && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      forward(page.paper);
    }
  };
  const lead = page.lead;
  return (
    <div
      className={`pp ${page.paper} pos${pos}`}
      data-paper={page.paper}
      title={back ? label : undefined}
      role={back ? 'button' : undefined}
      tabIndex={back ? 0 : undefined}
      onClick={back ? pull : undefined}
      onKeyDown={back ? key : undefined}
    >
      <div className="mhrow">
        <span className="ear">{m.earLeft}</span>
        <div className="mh">
          <b>{m.name}</b>
          {m.sub && <small>{m.sub}</small>}
        </div>
        <span className="ear">{m.earRight}</span>
      </div>
      <div className="dl">
        <span>{m.date}</span>
        <span>{m.issue}</span>
        <span>{m.tagline}</span>
      </div>
      <div className="ld">
        {lead ? (
          <div className={itemClass(lead, 'lead')} data-story={lead.story} data-kind={lead.kind} data-coming={lead.coming ? '1' : undefined}>
            <div className="kk">{lead.kicker}{lead.stars && <span className="review"> {lead.stars}</span>}</div>
            <div className={ph(lead.text, 'hd')}>{lead.text}</div>
            {lead.dek && <div className="dk">{lead.dek}</div>}
            <div className="txt">
              <i />
              <i />
            </div>
          </div>
        ) : (
          <div />
        )}
        <Right right={page.right} />
      </div>
      <div className="rw">
        {page.row.map((x, i) => (
          <div key={i} className={itemClass(x, 'it')} data-story={x.story} data-kind={x.kind} data-coming={x.coming ? '1' : undefined}>
            <div className="kk">{x.kicker}{x.stars && <span className="review"> {x.stars}</span>}</div>
            <div className={ph(x.text, 'h')}>{x.text}</div>
            <div className="t2" />
          </div>
        ))}
      </div>
    </div>
  );
});

/** The paper a play in flight brings forward (ui/desk/model.ts paperForPlay), once per play. */
export interface IncomingPaper {
  readonly id: number;
  readonly paper: string | null;
}

export const Papers = memo(function Papers({ papers, incoming }: { papers: PapersModel | null; incoming: IncomingPaper | null }) {
  // The paper in front for this month: the last one a play brought forward or the player pulled forward.
  const [chosen, setChosen] = useState<{ turn: number; paper: string } | null>(null);
  const turn = papers?.turn ?? 0;
  const forward = useCallback((paper: string) => setChosen({ turn, paper }), [turn]);
  const seen = useRef(0);
  useLayoutEffect(() => {
    if (!incoming || incoming.id === seen.current) return;
    seen.current = incoming.id;
    if (incoming.paper) setChosen({ turn, paper: incoming.paper });
  }, [incoming, turn]);
  const news = useRef<HTMLDivElement>(null);
  const front = papers && chosen?.turn === papers.turn && papers.pages.some((p) => p.paper === chosen.paper) ? chosen.paper : (papers?.lead ?? '');
  const shown = useRef(front);
  useLayoutEffect(() => {
    if (shown.current === front) return;
    shown.current = front;
    if (motionMode() === 'reduced') news.current?.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 150 });
  }, [front]);
  if (!papers) return null;
  const order = [front, ...papers.pages.map((p) => p.paper).filter((p) => p !== front)];
  return (
    <>
      <div className="baseShadow" />
      <div className="news" data-hook="papers" data-front={front} ref={news}>
        {papers.pages.map((page) => (
          <Paper key={page.paper} page={page} pos={order.indexOf(page.paper)} forward={forward} label={papers.forwardLabel} />
        ))}
      </div>
    </>
  );
});
