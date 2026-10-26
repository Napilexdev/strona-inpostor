import type { Phase, Role } from '@/shared/types';

export interface ArenaPlayer {
  id: string;
  nickname: string;
  color: string;
  seat: number;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  eliminated: boolean;
  isMe: boolean;
  accessory: number;
  score: number;
  /** Słowo z bieżącej / ostatniej rundy — wyświetlane w chmurce nad postacią. */
  lastWord?: string | null;
}

export type Mood = 'idle' | 'active' | 'caught' | 'innocent' | 'surprised' | 'win' | 'lose' | 'eliminated';

export interface ArenaProps {
  maxPlayers: number;
  players: ArenaPlayer[];
  phase: Phase;
  activeId: string | null;
  reveal: { playerId: string; role: Role } | null;
  /** Po zakończeniu gry: zwycięzcy (null = brak rozstrzygnięcia). */
  winners: Set<string> | null;
  showReady: boolean;
  quality?: 'high' | 'low';
  /** Ułamek wysokości płótna zakrytej od dołu przez interfejs (0..0.5). */
  bottomInset?: number;
}
