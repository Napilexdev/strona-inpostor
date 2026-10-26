'use client';

import { useEffect, useState } from 'react';
import { PLAYER_COLORS } from '@/shared/constants';
import { Arena } from './Arena';
import type { ArenaPlayer } from './types';

const DEMO = ['Adam', 'Kasia', 'Michał', 'Ola', 'Piotr'];
const players: ArenaPlayer[] = DEMO.map((nickname, i) => ({
  id: `demo-${i}`,
  nickname,
  color: PLAYER_COLORS[i],
  seat: i,
  isHost: i === 0,
  ready: true,
  connected: true,
  eliminated: false,
  isMe: false,
  accessory: [4, 1, 6, 3, 5][i],
  score: [7, 4, 9, 2, 5][i],
  lastWord: ['ser', 'Włochy', 'piekarnik', null, null][i],
}));

/** Podgląd areny na stronie głównej. */
export default function ArenaPreview() {
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTurn((t) => (t + 1) % players.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/[.06]">
      <Arena maxPlayers={6} players={players} phase="clues" activeId={players[turn].id} reveal={null} winners={null} showReady={false} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070a14] to-transparent" />
    </div>
  );
}
