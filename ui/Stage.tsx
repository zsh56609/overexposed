// The fixed logical stage (docs/ui-plan.md §9). The whole UI is laid out once, at 1280×720, and
// scaled uniformly to fit the viewport: contain, never crop, centred, letterboxed in the page
// background. Nothing inside may overflow the stage — each screen's layout fits it, no screen
// scrolls. The fit is recomputed whenever the viewport changes size, which covers window resizes,
// rotation, and the host page (itch) putting the game's frame into fullscreen.

import { useLayoutEffect, useRef, type ReactNode } from 'react';

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

export function Stage({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = stage.current;
    if (!f || !s) return;
    const fit = () => {
      const scale = Math.min(f.clientWidth / STAGE_WIDTH, f.clientHeight / STAGE_HEIGHT);
      if (scale > 0) s.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    fit();
    // The frame fills the viewport, so observing it catches every size change, including those
    // that fire no window event (a fullscreen transition of the embedding iframe).
    const observer = new ResizeObserver(fit);
    observer.observe(f);
    window.addEventListener('resize', fit);
    document.addEventListener('fullscreenchange', fit);
    document.addEventListener('webkitfullscreenchange', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
      document.removeEventListener('fullscreenchange', fit);
      document.removeEventListener('webkitfullscreenchange', fit);
    };
  }, []);

  return (
    <div className="frame" ref={frame}>
      <div className="stage" ref={stage}>
        {children}
      </div>
    </div>
  );
}
