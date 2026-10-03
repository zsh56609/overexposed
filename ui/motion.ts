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
