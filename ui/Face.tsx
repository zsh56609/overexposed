// A face (round R8a): a portrait from ui/avatars.ts in a circle with a 1 px ring — the ring's colour is the place's
// (--face-ring). Its alt is empty: a name is always printed beside it.

import type { AvatarId } from '../core/index.ts';
import { avatarUrl } from './avatars.ts';

export function Face({ id, size, className }: { id: AvatarId; size: number; className?: string }) {
  return <img className={className ? `face ${className}` : 'face'} src={avatarUrl(id)} alt="" width={size} height={size} draggable={false} />;
}
