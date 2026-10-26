import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ioc, type Socket } from 'socket.io-client';
import { createGameServer } from '../server/socket';
import type { Ack, JoinResult, RoomStatePayload } from '../shared/types';

let http: HttpServer;
let url: string;
let server: ReturnType<typeof createGameServer>;
const clients: Socket[] = [];

beforeAll(async () => {
  http = createServer();
  server = createGameServer(http);
  await new Promise<void>((r) => http.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterAll(async () => {
  clients.forEach((c) => c.disconnect());
  server.io.close();
  server.manager.closeAll();
  await new Promise((r) => setTimeout(r, 50));
});

interface Client {
  socket: Socket;
  /** Wszystkie surowe zdarzenia (do sprawdzania wycieków). */
  log: { event: string; payload: unknown }[];
  state: () => RoomStatePayload;
  emit: <T = undefined>(event: string, payload?: unknown) => Promise<Ack<T>>;
  waitFor: (pred: (s: RoomStatePayload) => boolean, ms?: number) => Promise<RoomStatePayload>;
  join?: JoinResult;
}

async function connect(): Promise<Client> {
  const socket = ioc(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(socket);
  const log: Client['log'] = [];
  let last: RoomStatePayload | null = null;
  const waiters: { pred: (s: RoomStatePayload) => boolean; resolve: (s: RoomStatePayload) => void }[] = [];
  socket.onAny((event, payload) => {
    log.push({ event, payload });
    if (event === 'room:state') {
      last = payload;
      for (const w of [...waiters]) {
        if (w.pred(payload)) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(payload);
        }
      }
    }
  });
  await new Promise<void>((r) => socket.on('connect', () => r()));
  return {
    socket,
    log,
    state: () => last!,
    emit: (event, payload = {}) => socket.timeout(8000).emitWithAck(event, payload),
    waitFor: (pred, ms = 8000) =>
      new Promise((resolve, reject) => {
        if (last && pred(last)) return resolve(last);
        const t = setTimeout(() => reject(new Error('Timeout waitFor')), ms);
        waiters.push({ pred, resolve: (s) => (clearTimeout(t), resolve(s)) });
      }),
  };
}

async function lobbyWith(n: number, settings: Record<string, unknown> = {}) {
  const host = await connect();
  const created = await host.emit<JoinResult>('lobby:create', { nickname: 'Host' });
  if (!created.ok) throw new Error(created.error);
  host.join = created.data;
  const code = created.data.code;
  if (Object.keys(settings).length) {
    const r = await host.emit('lobby:update-settings', settings);
    if (!r.ok) throw new Error(r.error);
  }
  const others: Client[] = [];
  for (let i = 1; i < n; i++) {
    const c = await connect();
    const r = await c.emit<JoinResult>('lobby:join', { code, nickname: `Gracz${i}` });
    if (!r.ok) throw new Error(r.error);
    c.join = r.data;
    others.push(c);
  }
  const all = [host, ...others];
  await Promise.all(all.map((c) => c.waitFor((s) => s.room.players.length === n)));
  return { host, others, all, code };
}

async function startGame(all: Client[]) {
  const [host, ...others] = all;
  for (const c of others) expect((await c.emit('lobby:ready', { ready: true })).ok).toBe(true);
  const r = await host.emit('game:start');
  expect(r).toEqual({ ok: true, data: undefined });
  await Promise.all(all.map((c) => c.waitFor((s) => s.room.phase === 'roles' && s.self.role !== null)));
  for (const c of all) await c.emit('game:ack-role');
  await Promise.all(all.map((c) => c.waitFor((s) => s.room.phase === 'clues')));
}

const byId = (all: Client[], id: string) => all.find((c) => c.join!.playerId === id)!;

describe('Socket.IO — lobby', () => {
  it('tworzy pokój z kodem, dołączanie przez kod, synchronizacja wielu klientów', async () => {
    const { all, code } = await lobbyWith(3);
    expect(code).toMatch(/^[A-Z2-9]{5}$/);
    for (const c of all) {
      const s = c.state();
      expect(s.room.players.map((p) => p.nickname)).toEqual(['Host', 'Gracz1', 'Gracz2']);
      expect(s.room.players.map((p) => p.seat)).toEqual([0, 1, 2]);
      // token nigdy nie trafia do stanu publicznego
      expect(JSON.stringify(s.room)).not.toContain(all[1].join!.token);
    }
  });

  it('komunikaty błędów: zły kod, nieistniejący pokój, pełny pokój, nick', async () => {
    const c = await connect();
    expect(await c.emit('lobby:join', { code: '!!', nickname: 'Ala' })).toMatchObject({ ok: false, error: expect.stringMatching(/Kod pokoju/) });
    expect(await c.emit('lobby:join', { code: 'ZZZZZ', nickname: 'Ala' })).toMatchObject({ ok: false, error: expect.stringMatching(/nie istnieje/) });
    const { code } = await lobbyWith(3, { maxPlayers: 3 });
    expect(await c.emit('lobby:join', { code, nickname: 'Ala' })).toMatchObject({ ok: false, error: expect.stringMatching(/pełny/) });
    expect(await c.emit('lobby:create', { nickname: '   ' })).toMatchObject({ ok: false, error: expect.stringMatching(/Nick/) });
    expect(await c.emit('lobby:create', { nickname: '<script>' })).toMatchObject({ ok: false });
  });

  it('nie pozwala na dwa identyczne nicki w lobby', async () => {
    const { code } = await lobbyWith(2);
    const c = await connect();
    expect(await c.emit('lobby:join', { code, nickname: 'host' })).toMatchObject({ ok: false, error: expect.stringMatching(/zajęty/) });
  });

  it('zmiana limitu jest rozgłaszana do wszystkich, a przypisania pozostają', async () => {
    const { host, all } = await lobbyWith(3, { maxPlayers: 8 });
    const before = host.state().room.players.map((p) => [p.id, p.seat, p.colorIndex]);
    expect((await host.emit('lobby:update-settings', { maxPlayers: 5 })).ok).toBe(true);
    await Promise.all(all.map((c) => c.waitFor((s) => s.room.settings.maxPlayers === 5)));
    for (const c of all) expect(c.state().room.players.map((p) => [p.id, p.seat, p.colorIndex])).toEqual(before);
    expect(await host.emit('lobby:update-settings', { maxPlayers: 2 })).toMatchObject({ ok: false });
    expect(await host.emit('lobby:update-settings', { maxPlayers: 13 })).toMatchObject({ ok: false });
    expect(await all[1].emit('lobby:update-settings', { maxPlayers: 9 })).toMatchObject({ ok: false, error: expect.stringMatching(/host/) });
    expect(await host.emit('lobby:update-settings', { hack: true })).toMatchObject({ ok: false });
  });

  it('host może usunąć gracza — gracz dostaje komunikat', async () => {
    const { host, others } = await lobbyWith(3);
    const kicked = new Promise((r) => others[1].socket.once('lobby:kicked', r));
    expect((await host.emit('lobby:kick', { playerId: others[1].join!.playerId })).ok).toBe(true);
    await kicked;
    await host.waitFor((s) => s.room.players.length === 2);
    expect(await others[1].emit('lobby:ready', { ready: true })).toMatchObject({ ok: false });
  });
});

describe('Socket.IO — rozgrywka', () => {
  it('pełna gra: role prywatne, tury, głosowania, wynik', async () => {
    const { all } = await lobbyWith(4, { maxRounds: 0, discussionTime: 0, lastGuess: false, clueTimeLimit: 0 });
    await startGame(all);

    const roles = new Map(all.map((c) => [c.join!.playerId, c.state().self.role]));
    const impId = [...roles.entries()].find(([, r]) => r === 'impostor')![0];
    const imp = byId(all, impId);
    const word = all.find((c) => c.state().self.role === 'crewmate')!.state().self.word!;
    expect(word).toBeTruthy();
    expect(imp.state().self.word).toBeNull();

    // Runda 1: wszyscy widzą tę samą kolejkę
    const order = all[0].state().room.game!.turnOrder;
    for (const c of all) expect(c.state().room.game!.turnOrder).toEqual(order);

    // Ktoś spoza kolejki próbuje wysłać słowo
    const notTurn = byId(all, order[1]);
    expect(await notTurn.emit('game:submit-clue', { word: 'oszust' })).toMatchObject({ ok: false, error: expect.stringMatching(/tura/) });
    expect(await byId(all, order[0]).emit('game:submit-clue', { word: '' })).toMatchObject({ ok: false });

    for (let i = 0; i < order.length; i++) {
      const c = byId(all, order[i]);
      await c.waitFor((s) => s.room.game!.currentTurnPlayerId === order[i]);
      expect((await c.emit('game:submit-clue', { word: `slowo${i}` })).ok).toBe(true);
      expect(await c.emit('game:submit-clue', { word: 'znowu' })).toMatchObject({ ok: false });
    }
    await Promise.all(all.map((c) => c.waitFor((s) => s.room.phase === 'continuation-vote')));
    for (const c of all) expect(c.state().room.game!.clues.map((x) => x.word)).toEqual(['slowo0', 'slowo1', 'slowo2', 'slowo3']);

    // Głosowanie decyzyjne: 3 za eliminacją
    await all[0].emit('game:submit-continuation-vote', { choice: 'vote' });
    await all[1].waitFor((s) => s.room.game!.votesCast === 1);
    expect(all[1].state().room.game!.votesNeeded).toBe(4);
    expect(await all[0].emit('game:submit-continuation-vote', { choice: 'continue' })).toMatchObject({ ok: false });
    await all[1].emit('game:submit-continuation-vote', { choice: 'vote' });
    await all[2].emit('game:submit-continuation-vote', { choice: 'vote' });
    await all[3].emit('game:submit-continuation-vote', { choice: 'continue' });
    await Promise.all(all.map((c) => c.waitFor((s) => s.room.phase === 'elimination-vote')));

    // Eliminacja impostora
    const someCrew = [...roles.entries()].find(([, r]) => r === 'crewmate')![0];
    expect(await imp.emit('game:submit-elimination-vote', { targetId: impId })).toMatchObject({ ok: false });
    for (const c of all) {
      const target = c === imp ? someCrew : impId;
      expect((await c.emit('game:submit-elimination-vote', { targetId: target })).ok).toBe(true);
    }
    const revealed = await all[0].waitFor((s) => s.room.phase === 'reveal');
    expect(revealed.room.game!.reveal).toMatchObject({ playerId: impId, role: 'impostor' });
    const results = new Promise((r) => all[0].socket.once('game:results', r));
    const ended = await all[0].waitFor((s) => s.room.phase === 'ended', 8000);
    expect(ended.room.game!.result!.winner).toBe('crew');
    expect(ended.room.game!.result!.word).toBe(word);
    await results;

    // Hasło NIGDY nie trafiło do impostora przed końcem gry.
    const endIdx = imp.log.findIndex((e) => e.event === 'room:state' && (e.payload as RoomStatePayload).room.phase === 'ended');
    const beforeEnd = JSON.stringify(imp.log.slice(0, endIdx));
    expect(beforeEnd).not.toContain(word);
    // Role innych graczy nie trafiły do nikogo przed końcem gry (poza etapem reveal wskazanej osoby)
    for (const c of all) {
      const idx = c.log.findIndex((e) => e.event === 'room:state' && (e.payload as RoomStatePayload).room.phase === 'reveal');
      const pre = c.log.slice(0, idx).map((e) => JSON.stringify((e.payload as RoomStatePayload)?.room ?? {}));
      for (const p of pre) expect(p).not.toMatch(/"role":"(impostor|crewmate)"/);
    }
  }, 20000);

  it('restart w tym samym lobby losuje nowe role i hasło', async () => {
    const { all, host } = await lobbyWith(3, { maxRounds: 1, discussionTime: 0, lastGuess: false, clueTimeLimit: 0 });
    await startGame(all);
    const order = host.state().room.game!.turnOrder;
    for (const id of order) {
      const c = byId(all, id);
      await c.waitFor((s) => s.room.game!.currentTurnPlayerId === id);
      await c.emit('game:submit-clue', { word: 'cos' });
    }
    await host.waitFor((s) => s.room.phase === 'elimination-vote');
    const ids = all.map((c) => c.join!.playerId);
    // wszyscy na tę samą osobę (sama na siebie nie może → głosuje na kogoś innego)
    for (const c of all) await c.emit('game:submit-elimination-vote', { targetId: c.join!.playerId === ids[0] ? ids[1] : ids[0] });
    await host.waitFor((s) => s.room.phase === 'ended', 8000);
    expect(await all[1].emit('game:restart')).toMatchObject({ ok: false });
    expect((await host.emit('game:restart')).ok).toBe(true);
    await Promise.all(all.map((c) => c.waitFor((s) => s.room.phase === 'roles' && s.self.role !== null)));
    expect(host.state().room.players).toHaveLength(3);
  }, 20000);
});

describe('Socket.IO — rozłączenia', () => {
  it('odświeżenie strony: ponowne połączenie tokenem przywraca gracza, turę i historię', async () => {
    const { all, code } = await lobbyWith(3, { clueTimeLimit: 0 });
    await startGame(all);
    const order = all[0].state().room.game!.turnOrder;
    const first = byId(all, order[0]);
    await first.emit('game:submit-clue', { word: 'pierwsze' });
    const second = byId(all, order[1]);
    const { token, playerId } = second.join!;
    second.socket.disconnect();
    await all.find((c) => c !== second)!.waitFor((s) => s.room.players.find((p) => p.id === playerId)!.connected === false);
    const paused = all.find((c) => c !== second)!.state();
    expect(paused.room.game!.turnPaused).toBe(true);

    // ktoś zna tylko kod — nie przejmie gracza
    const intruder = await connect();
    expect(await intruder.emit('player:reconnect', { code, token: 'a'.repeat(64) })).toMatchObject({ ok: false });

    const back = await connect();
    const r = await back.emit<JoinResult>('player:reconnect', { code, token });
    expect(r).toMatchObject({ ok: true, data: { playerId } });
    const s = await back.waitFor((x) => x.self.playerId === playerId);
    expect(s.room.game!.currentTurnPlayerId).toBe(playerId);
    expect(s.room.game!.turnPaused).toBe(false);
    expect(s.room.game!.clues.map((c) => c.word)).toEqual(['pierwsze']);
    expect(s.self.role).not.toBeNull();
    expect((await back.emit('game:submit-clue', { word: 'drugie' })).ok).toBe(true);
  }, 20000);

  it('dwie karty z tym samym tokenem: stara sesja zostaje zastąpiona', async () => {
    const { others, code } = await lobbyWith(3);
    const old = others[0];
    const replaced = new Promise((r) => old.socket.once('session:replaced', r));
    const tab = await connect();
    expect((await tab.emit('player:reconnect', { code, token: old.join!.token })).ok).toBe(true);
    await replaced;
    expect(await old.emit('lobby:ready', { ready: true })).toMatchObject({ ok: false });
    expect((await tab.emit('lobby:ready', { ready: true })).ok).toBe(true);
  });

  it('wyjście hosta przekazuje hosta', async () => {
    const { host, others } = await lobbyWith(3);
    await host.emit('lobby:leave');
    const s = await others[0].waitFor((x) => x.room.players.length === 2);
    expect(s.room.hostId).toBe(others[0].join!.playerId);
  });
});

describe('Socket.IO — nowe funkcje', () => {
  it('paczka 500 haseł przechodzi przez gniazdo, wygląd i reset punktów', async () => {
    const { host, others } = await lobbyWith(3);
    const words = Array.from({ length: 500 }, (_, i) => ({ word: `hasło numer ${i} xyz`, hint: `podpowiedź do hasła ${i}` }));
    const r = await host.emit<{ count: number }>('lobby:set-custom-words', { name: 'Duża paczka', words });
    expect(r).toEqual({ ok: true, data: { count: 500 } });
    const s = await others[0].waitFor((x) => x.room.customPack?.count === 500);
    expect(JSON.stringify(s)).not.toContain('hasło numer 42');
    expect(await others[0].emit('lobby:set-custom-words', { name: 'x', words })).toMatchObject({ ok: false });
    expect((await others[0].emit('lobby:update-appearance', { hat: 5, face: 2, shirt: 9 })).ok).toBe(true);
    expect(await others[0].emit('lobby:update-appearance', { hat: 999 })).toMatchObject({ ok: false });
    expect((await host.emit('lobby:reset-scores')).ok).toBe(true);
  });
});
