'use client';

import { createContext, useContext } from 'react';
import { PLAYER_COLORS, playerColor } from '@/shared/constants';
import type { PublicPlayer, PublicRoom, SelfState } from '@/shared/types';

export interface RoomCtxValue {
  room: PublicRoom;
  self: SelfState;
  me: PublicPlayer | undefined;
  isHost: boolean;
  player: (id: string | null | undefined) => PublicPlayer | undefined;
  nick: (id: string | null | undefined) => string;
  color: (id: string | null | undefined) => string;
  act: (event: string, payload?: unknown) => Promise<boolean>;
  serverNow: () => number;
  openSettings: () => void;
  openHistory: () => void;
}

export const RoomCtx = createContext<RoomCtxValue | null>(null);

export function useRoom(): RoomCtxValue {
  const v = useContext(RoomCtx);
  if (!v) throw new Error('useRoom poza RoomCtx');
  return v;
}

export function buildHelpers(room: PublicRoom) {
  const map = new Map(room.players.map((p) => [p.id, p]));
  const historic = new Map<string, string>();
  room.game?.clues.forEach((c) => historic.set(c.playerId, c.nickname));
  room.game?.result?.roles.forEach((r) => historic.set(r.playerId, r.nickname));
  return {
    player: (id: string | null | undefined) => (id ? map.get(id) : undefined),
    nick: (id: string | null | undefined) => (id ? (map.get(id)?.nickname ?? historic.get(id) ?? '(gracz opuścił grę)') : ''),
    color: (id: string | null | undefined) => {
      const p = id ? map.get(id) : undefined;
      return p ? playerColor(p) : '#6b7280';
    },
  };
}
