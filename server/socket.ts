import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { z, type ZodTypeAny } from 'zod';
import {
  clueSchema,
  continuationVoteSchema,
  createLobbySchema,
  eliminationVoteSchema,
  firstZodError,
  guessSchema,
  joinLobbySchema,
  readySchema,
  reconnectSchema,
  settingsPatchSchema,
  targetPlayerSchema,
} from '../shared/schemas';
import type { Ack, JoinResult, RoomStatePayload } from '../shared/types';
import { RoomManager } from './manager';
import { GameError, type Player, type Room } from './room';

interface SocketData {
  code?: string;
  playerId?: string;
  bucket: { tokens: number; last: number };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEvents = Record<string, (...args: any[]) => void>;
type GameSocket = Socket<AnyEvents, AnyEvents, AnyEvents, SocketData>;

export interface GameServerOptions {
  corsOrigin?: string | string[];
  manager?: RoomManager;
}

const RATE_CAPACITY = 20;
const RATE_REFILL_PER_SEC = 8;

/** Prosty limiter zdarzeń na gniazdo (token bucket). */
function allow(socket: GameSocket): boolean {
  const b = socket.data.bucket;
  const now = Date.now();
  b.tokens = Math.min(RATE_CAPACITY, b.tokens + ((now - b.last) / 1000) * RATE_REFILL_PER_SEC);
  b.last = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

export function createGameServer(httpServer: HttpServer, opts: GameServerOptions = {}) {
  const io = new Server(httpServer, {
    cors: opts.corsOrigin ? { origin: opts.corsOrigin, credentials: false } : undefined,
    pingInterval: 10_000,
    pingTimeout: 8_000,
    maxHttpBufferSize: 16_000,
    connectionStateRecovery: undefined,
  });

  const pending = new Set<Room>();
  const flush = () => {
    for (const room of pending) broadcastNow(room);
    pending.clear();
  };

  const lastPhase = new WeakMap<Room, string>();

  /** Rozsyła stan (każdy gracz dostaje tylko swoje prywatne dane), potem zdarzenia etapu. */
  function broadcastNow(room: Room) {
    if (room.closed) return;
    const pub = room.publicState();
    for (const p of room.players.values()) {
      if (!p.socketId) continue;
      const payload: RoomStatePayload = { room: pub, self: room.selfState(p.id) };
      io.to(p.socketId).emit('room:state', payload);
    }
    // Zdarzenia pomocnicze przy zmianie etapu — zawsze po aktualizacji stanu.
    if (lastPhase.get(room) === room.phase) return;
    lastPhase.set(room, room.phase);
    if (room.phase === 'roles') {
      for (const p of room.players.values()) {
        if (!p.socketId) continue;
        const self = room.selfState(p.id);
        io.to(p.socketId).emit('game:role', { role: self.role, word: self.word });
      }
    }
    if (room.phase === 'ended') io.to(`room:${room.code}`).emit('game:results', pub.game?.result ?? null);
  }

  const manager =
    opts.manager ??
    new RoomManager({
      onChange: (room) => {
        if (pending.size === 0) queueMicrotask(flush);
        pending.add(room);
      },
      onPlayerRemoved: (room, player, reason) => {
        if (!player.socketId) return;
        const s = io.sockets.sockets.get(player.socketId) as GameSocket | undefined;
        if (!s) return;
        s.leave(`room:${room.code}`);
        s.data.code = undefined;
        s.data.playerId = undefined;
        if (reason === 'kicked') s.emit('lobby:kicked', { message: 'Host usunął Cię z pokoju.' });
      },
    });

  function bind(socket: GameSocket, room: Room, player: Player) {
    // Jeśli ten gracz był podłączony z innej karty — odłączamy starą sesję.
    if (player.socketId && player.socketId !== socket.id) {
      const old = io.sockets.sockets.get(player.socketId) as GameSocket | undefined;
      if (old) {
        old.data.code = undefined;
        old.data.playerId = undefined;
        old.leave(`room:${room.code}`);
        old.emit('session:replaced', { message: 'Otworzyłeś grę w innej karcie lub na innym urządzeniu.' });
      }
    }
    socket.data.code = room.code;
    socket.data.playerId = player.id;
    socket.join(`room:${room.code}`);
    room.attachSocket(player.id, socket.id);
  }

  /** Opuszczenie poprzedniego pokoju, gdy gniazdo dołącza gdzie indziej. */
  function detach(socket: GameSocket) {
    const { code, playerId } = socket.data;
    if (!code || !playerId) return;
    const room = manager.get(code);
    socket.leave(`room:${code}`);
    socket.data.code = undefined;
    socket.data.playerId = undefined;
    room?.removePlayer(playerId, 'left');
  }

  function ctx(socket: GameSocket): { room: Room; playerId: string } {
    const { code, playerId } = socket.data;
    if (!code || !playerId) throw new GameError('Nie jesteś w żadnym pokoju.');
    const room = manager.get(code);
    if (!room || !room.getPlayer(playerId)) throw new GameError('Pokój nie istnieje lub nie jesteś jego uczestnikiem.');
    return { room, playerId };
  }

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as unknown as GameSocket;
    socket.data.bucket = { tokens: RATE_CAPACITY, last: Date.now() };

    /** Rejestracja obsługi zdarzenia z walidacją Zod, limitem i jednolitym ack. */
    function on<S extends ZodTypeAny, R>(event: string, schema: S, handler: (data: z.output<S>) => R) {
      socket.on(event as never, ((payload: unknown, ack?: (res: Ack<R>) => void) => {
        const reply = typeof ack === 'function' ? ack : () => undefined;
        if (!allow(socket)) return reply({ ok: false, error: 'Zbyt wiele żądań — zwolnij trochę.' });
        const parsed = schema.safeParse(payload ?? {});
        if (!parsed.success) return reply({ ok: false, error: firstZodError(parsed.error) });
        try {
          const data = handler(parsed.data);
          reply({ ok: true, data: data as R });
        } catch (err) {
          if (err instanceof GameError) return reply({ ok: false, error: err.message });
          console.error(`[socket] ${event}`, err);
          reply({ ok: false, error: 'Wystąpił nieoczekiwany błąd serwera.' });
        }
      }) as never);
    }

    const empty = z.object({}).passthrough();

    on('lobby:create', createLobbySchema, ({ nickname }): JoinResult => {
      detach(socket);
      const room = manager.createRoom();
      const player = room.addPlayer(nickname);
      bind(socket, room, player);
      return { code: room.code, playerId: player.id, token: player.token };
    });

    on('lobby:join', joinLobbySchema, ({ code, nickname }): JoinResult => {
      const room = manager.get(code);
      if (!room) throw new GameError('Pokój o tym kodzie nie istnieje.');
      if (socket.data.code === code && socket.data.playerId && room.getPlayer(socket.data.playerId)) {
        throw new GameError('Już jesteś w tym pokoju.');
      }
      const player = room.addPlayer(nickname);
      detach(socket);
      bind(socket, room, player);
      return { code: room.code, playerId: player.id, token: player.token };
    });

    on('player:reconnect', reconnectSchema, ({ code, token }): JoinResult => {
      const room = manager.get(code);
      if (!room) throw new GameError('Pokój nie istnieje lub został zamknięty.');
      const player = room.findByToken(token);
      if (!player) throw new GameError('Twoja sesja wygasła — dołącz ponownie.');
      if (socket.data.code && (socket.data.code !== code || socket.data.playerId !== player.id)) detach(socket);
      bind(socket, room, player);
      return { code: room.code, playerId: player.id, token: player.token };
    });

    on('lobby:leave', empty, () => {
      detach(socket);
      return undefined;
    });

    on('lobby:ready', readySchema, ({ ready }) => {
      const { room, playerId } = ctx(socket);
      room.setReady(playerId, ready);
      return undefined;
    });

    on('lobby:update-settings', settingsPatchSchema, (patch) => {
      const { room, playerId } = ctx(socket);
      room.updateSettings(playerId, patch);
      return undefined;
    });

    on('lobby:kick', targetPlayerSchema, ({ playerId: target }) => {
      const { room, playerId } = ctx(socket);
      room.kick(playerId, target);
      return undefined;
    });

    on('lobby:transfer-host', targetPlayerSchema, ({ playerId: target }) => {
      const { room, playerId } = ctx(socket);
      room.transferHost(playerId, target);
      return undefined;
    });

    on('game:start', empty, () => {
      const { room, playerId } = ctx(socket);
      room.startGame(playerId);
      return undefined;
    });

    on('game:ack-role', empty, () => {
      const { room, playerId } = ctx(socket);
      room.acknowledgeRole(playerId);
      return undefined;
    });

    on('game:submit-clue', clueSchema, ({ word }) => {
      const { room, playerId } = ctx(socket);
      room.submitClue(playerId, word);
      return undefined;
    });

    on('game:submit-continuation-vote', continuationVoteSchema, ({ choice }) => {
      const { room, playerId } = ctx(socket);
      room.submitContinuationVote(playerId, choice);
      return undefined;
    });

    on('game:start-elimination', empty, () => {
      const { room, playerId } = ctx(socket);
      room.hostStartElimination(playerId);
      return undefined;
    });

    on('game:submit-elimination-vote', eliminationVoteSchema, ({ targetId }) => {
      const { room, playerId } = ctx(socket);
      room.submitEliminationVote(playerId, targetId);
      return undefined;
    });

    on('game:guess-word', guessSchema, ({ guess }) => {
      const { room, playerId } = ctx(socket);
      room.guessWord(playerId, guess);
      return undefined;
    });

    on('game:restart', empty, () => {
      const { room, playerId } = ctx(socket);
      room.restart(playerId);
      return undefined;
    });

    on('game:back-to-lobby', empty, () => {
      const { room, playerId } = ctx(socket);
      room.backToLobby(playerId);
      return undefined;
    });

    socket.on('disconnect', () => {
      const { code, playerId } = socket.data;
      if (!code || !playerId) return;
      manager.get(code)?.handleDisconnect(playerId, socket.id);
    });
  });

  return { io, manager };
}
