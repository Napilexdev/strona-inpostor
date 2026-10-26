'use client';

import { useEffect, useRef } from 'react';
import { play } from '@/lib/sound';
import type { RoomStatePayload } from '@/shared/types';

/** Odtwarza dźwięki na podstawie zmian stanu gry. */
export function useGameSounds(payload: RoomStatePayload | null, serverNow: () => number) {
  const prev = useRef<RoomStatePayload | null>(null);

  useEffect(() => {
    const cur = payload;
    const old = prev.current;
    prev.current = cur;
    if (!cur || !old || old.room.code !== cur.room.code) return;
    const r = cur.room;
    const o = old.room;
    const me = cur.self.playerId;

    if (r.players.length > o.players.length) play('join');
    else if (r.players.length < o.players.length) play('leave');

    if (r.phase !== o.phase) {
      if (r.phase === 'roles') play('start');
      if (r.phase === 'reveal' && r.game?.reveal) {
        const role = r.game.reveal.role;
        setTimeout(() => play(role === 'impostor' ? 'impostor' : 'innocent'), 1400);
      }
      if (r.phase === 'ended' && r.game?.result) {
        const res = r.game.result;
        const myRole = res.roles.find((x) => x.playerId === me)?.role;
        if (!res.winner || !myRole) play('leave');
        else play((res.winner === 'crew') === (myRole === 'crewmate') ? 'win' : 'lose');
      }
    }

    const g = r.game;
    const og = o.game;
    if (g && og) {
      if (g.clues.length > og.clues.length) play('clue');
      if (r.phase === 'clues' && g.currentTurnPlayerId === me && og.currentTurnPlayerId !== me) setTimeout(() => play('myTurn'), 180);
      if (g.votesCast > og.votesCast && r.phase === o.phase) play('vote');
    }
  }, [payload]);

  // Tykanie przez ostatnie 5 sekund, gdy to Ty masz coś zrobić.
  useEffect(() => {
    const r = payload?.room;
    const g = r?.game;
    if (!payload || !r || !g?.deadline) return;
    const me = payload.self.playerId;
    const mine =
      (r.phase === 'clues' && g.currentTurnPlayerId === me) ||
      (r.phase === 'continuation-vote' && g.voters.includes(me) && !payload.self.continuationVote) ||
      (r.phase === 'elimination-vote' && g.voters.includes(me) && !payload.self.eliminationVote) ||
      (r.phase === 'last-guess' && payload.self.canGuess);
    if (!mine) return;
    let last = -1;
    const id = setInterval(() => {
      const left = Math.ceil((g.deadline! - serverNow()) / 1000);
      if (left <= 5 && left > 0 && left !== last) {
        last = left;
        play('tick');
      }
    }, 200);
    return () => clearInterval(id);
  }, [payload, serverNow]);
}
