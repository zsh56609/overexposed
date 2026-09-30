// The papers (round V1a; README §2, §7), back left: The Daily Flash, B-Side and Marquee standing on the desk, this
// month's issue. /core's lead paper stands in front, the other two behind with their mastheads showing; clicking
// a paper behind pulls it forward — a choice that lasts until the issue or its lead changes. Switching papers
// re-renders only the papers. Every word, the photograph's scene and drawing, and the box office are the
// adapter's (./model.ts).

import { memo, useCallback, useState, type KeyboardEvent } from 'react';
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
          <div className={itemClass(lead, 'lead')} data-kind={lead.kind} data-coming={lead.coming ? '1' : undefined}>
            <div className="kk">{lead.kicker}</div>
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
          <div key={i} className={itemClass(x, 'it')} data-kind={x.kind} data-coming={x.coming ? '1' : undefined}>
            <div className="kk">{x.kicker}</div>
            <div className={ph(x.text, 'h')}>{x.text}</div>
            <div className="t2" />
          </div>
        ))}
      </div>
    </div>
  );
});

export const Papers = memo(function Papers({ papers }: { papers: PapersModel | null }) {
  // The paper the player pulled forward, for the issue and lead it was pulled in.
  const [pick, setPick] = useState<{ key: string; paper: string } | null>(null);
  const key = papers ? `${papers.turn}:${papers.lead}` : '';
  const forward = useCallback((paper: string) => setPick({ key, paper }), [key]);
  if (!papers) return null;
  const front = pick?.key === key && papers.pages.some((p) => p.paper === pick.paper) ? pick.paper : papers.lead;
  const order = [front, ...papers.pages.map((p) => p.paper).filter((p) => p !== front)];
  return (
    <>
      <div className="baseShadow" />
      <div className="news" data-hook="papers" data-front={front}>
        {papers.pages.map((page) => (
          <Paper key={page.paper} page={page} pos={order.indexOf(page.paper)} forward={forward} label={papers.forwardLabel} />
        ))}
      </div>
    </>
  );
});
