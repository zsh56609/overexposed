import type { MotionMode } from './queue.ts';
import { useSyncExternalStore } from 'react';
/** One switch for the OS preference, V2's future setting, and static audits. */
export function motionMode(): MotionMode {
  if (document.documentElement.dataset.motion === 'off') return 'off';
  if (document.documentElement.dataset.motion === 'reduced') return 'reduced';
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}
const listeners=new Set<()=>void>();
let stop:(()=>void)|undefined;
export function subscribeMotion(listener:()=>void) {
  listeners.add(listener);
  if(!stop){
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{document.documentElement.dataset.motionResolved=motionMode();for(const fn of listeners)fn();};
    const observer=new MutationObserver(update);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
    media.addEventListener('change',update);update();
    stop=()=>{observer.disconnect();media.removeEventListener('change',update);};
  }
  return ()=>{listeners.delete(listener);if(!listeners.size){stop?.();stop=undefined;}};
}
export const useMotionMode=()=>useSyncExternalStore(subscribeMotion,motionMode);

/**
 * One set of transitions (round R3, Part B), in ms: what opens over the desk — the dim, then the content rising —
 * and what leaves it; reduced motion's crossfade. The CSS uses the same numbers (ui/style.css).
 */
export const TRANSITION = { dim: 200, rise: 250, out: 150, crossfade: 200 } as const;

/** The changes of scene running now: every transition is a CSS animation whose keyframes are named tr-…. */
export function runningTransitions(): Animation[] {
  if (typeof document === 'undefined' || !('getAnimations' in document)) return [];
  return document.getAnimations().filter((a) => a.playState === 'running' && a instanceof CSSAnimation && a.animationName.startsWith('tr-'));
}

/** D7 for a change of scene: a click during one completes it at once — every element where it ends. */
export function finishTransitions(): boolean {
  const running = runningTransitions();
  for (const a of running) a.finish();
  return running.length > 0;
}
