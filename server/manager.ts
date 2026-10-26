import { randomInt } from 'node:crypto';
import { EMPTY_ROOM_TTL_MS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../shared/constants';
import { Room, type RoomHooks } from './room';

export function generateRoomCode(rand: (max: number) => number = randomInt): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[rand(ROOM_CODE_ALPHABET.length)];
  return code;
}

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private readonly hooks: RoomHooks;
  private readonly codeGen: () => string;

  constructor(hooks: RoomHooks = {}, codeGen: () => string = () => generateRoomCode()) {
    this.hooks = hooks;
    this.codeGen = codeGen;
  }

  /** Tworzy pokój z unikalnym kodem (sprawdzanie kolizji z aktywnymi pokojami). */
  createRoom(): Room {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const code = this.codeGen();
      if (this.rooms.has(code)) continue;
      const room = new Room(code, {
        ...this.hooks,
        onEmpty: (r) => {
          this.rooms.delete(r.code);
          this.hooks.onEmpty?.(r);
        },
      });
      this.rooms.set(code, room);
      // Pokój bez graczy (np. twórca nie dokończył dołączania) jest sprzątany.
      setTimeout(() => {
        if (room.players.size === 0 && this.rooms.get(code) === room) {
          room.close();
          this.rooms.delete(code);
        }
      }, EMPTY_ROOM_TTL_MS).unref?.();
      return room;
    }
    throw new Error('Nie udało się wygenerować unikalnego kodu pokoju.');
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  closeAll() {
    for (const r of this.rooms.values()) r.close();
    this.rooms.clear();
  }
}
