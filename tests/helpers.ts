import { Room } from '../server/room';

export function seeded(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NAMES = ['Adam', 'Kasia', 'Michał', 'Ola', 'Piotr', 'Zosia', 'Bartek', 'Ewa', 'Tomek', 'Ania', 'Kuba', 'Magda'];

export function makeRoom(n: number, settings: Partial<Room['settings']> = {}, seed = 7) {
  const room = new Room('TEST1', { random: seeded(seed) });
  room.settings = { ...room.settings, maxPlayers: Math.max(n, 6), ...settings };
  const players = NAMES.slice(0, n).map((name) => room.addPlayer(name));
  players.forEach((p, i) => room.attachSocket(p.id, `sock-${i}`));
  return { room, players };
}

export function startGame(room: Room) {
  for (const p of room.players.values()) if (p.id !== room.hostId) room.setReady(p.id, true);
  room.startGame(room.hostId);
}

export function startAndAck(room: Room) {
  startGame(room);
  for (const p of room.players.values()) room.acknowledgeRole(p.id);
}

/** Każdy gracz w kolejności podaje słowo. */
export function playRound(room: Room, word = 'skojarzenie') {
  let guard = 0;
  while (room.phase === 'clues' && guard++ < 50) {
    const id = room.currentTurnId()!;
    const w = room.game!.roles.get(id) === 'crewmate' ? `${word}${guard}` : `zgaduje${guard}`;
    room.submitClue(id, w);
  }
}

export function impostors(room: Room) {
  return [...room.game!.roles.entries()].filter(([, r]) => r === 'impostor').map(([id]) => id);
}
export function crewmates(room: Room) {
  return [...room.game!.roles.entries()].filter(([, r]) => r === 'crewmate').map(([id]) => id);
}
