// The desk (round V1a; docs/design/visual/README.md "The scene", §1–§7): a dressing-room vanity seen from the
// chair, on the one 1280×720 stage. This component stacks the layers; each part of the desk renders from the
// adapter's model (./model.ts) and computes nothing. Whatever is passed as children is drawn over the scene
// (the plain screens until round V2).

import type { ReactNode } from 'react';
import type { DeskModel } from './model.ts';
import './tokens.css';
import './fonts.css';
import './css/scene.css';

export function Desk({ model, children }: { model: DeskModel; children?: ReactNode }) {
  return (
    <div className={`desk ${model.season} lane-${model.lane}${model.crisis ? ' crisis' : ''}`} data-season={model.season} data-lane={model.lane} data-crisis={model.crisis ? '1' : '0'}>
      <div className="wallpaper" />
      <div className="lightpool" />
      <div className="floor" />
      <div className="deskscene">
        <div className="desktop" />
      </div>
      <div className="deskfront" />
      {/* This month's pile: the cards played this month lie here, flat in the desk's plane (V1b). */}
      <div className="scene3d pile" data-hook="pile" />
      <div className="dim" />
      {children}
    </div>
  );
}
