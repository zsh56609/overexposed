import type { MotionMode } from './queue.ts';
/** One switch for the OS preference, V2's future setting, and static audits. */
export function motionMode(): MotionMode {
  if (document.documentElement.dataset.motion === 'off') return 'off';
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}
