import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from '../server/room';
import { parseWordPack } from '../shared/schemas';
import { REVEAL_MS } from '../shared/constants';
import { crewmates, impostors, makeRoom, playRound, startAndAck } from './helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function finishWithImpostorCaught(room: Room) {
  playRound(room);
  const imp = impostors(room)[0];
  for (const id of room.game!.voters) room.submitEliminationVote(id, id === imp ? crewmates(room)[0] : imp);
  vi.advanceTimersByTime(REVEAL_MS + 1);
}

describe('wygląd postaci', () => {
  it('wybrany kolor i dodatek; zajęty kolor → najbliższy wolny', () => {
    const room = new Room('ABCDE');
    const a = room.addPlayer('Adam', { colorIndex: 4, hat: 6, face: 1, shirt: 3 });
    const b = room.addPlayer('Beata', { colorIndex: 4, hat: 1, face: 0, shirt: 0 });
    expect(a).toMatchObject({ colorIndex: 4, hat: 6, face: 1, shirt: 3 });
    expect(b.colorIndex).toBe(5);
    expect(b.hat).toBe(1);
  });

  it('zmiana wyglądu w poczekalni; nie można zająć cudzego koloru', () => {
    const { room, players } = makeRoom(3);
    room.updateAppearance(players[0].id, { hat: 4, shirt: 20 });
    expect(room.publicState().players[0]).toMatchObject({ hat: 4, shirt: 20 });
    expect(() => room.updateAppearance(players[0].id, { colorIndex: players[1].colorIndex })).toThrow(/zajęty/);
    room.updateAppearance(players[0].id, { colorIndex: 11 });
    expect(room.getPlayer(players[0].id)!.colorIndex).toBe(11);
  });
});

describe('podpowiedź dla impostora', () => {
  it('impostor dostaje podpowiedź, zwykli gracze nie; nie trafia do stanu publicznego', () => {
    const { room } = makeRoom(4, { impostorHint: 'skojarzenie' });
    startAndAck(room);
    const imp = impostors(room)[0];
    const hint = room.selfState(imp).hint!;
    expect(hint).toMatch(/^Skojarzenie: /);
    expect(room.selfState(crewmates(room)[0]).hint).toBeNull();
    expect(JSON.stringify(room.publicState())).not.toContain(hint.replace('Skojarzenie: ', ''));
  });

  it('dwóch impostorów dostaje różne podpowiedzi', () => {
    for (const mode of ['skojarzenie', 'litery'] as const) {
      const { room } = makeRoom(6, { impostorCount: 2, impostorHint: mode });
      startAndAck(room);
      const [a, b] = impostors(room).map((id) => room.selfState(id).hint);
      expect(a).toBeTruthy();
      expect(a).not.toBe(b);
    }
  });

  it('zwykły gracz widzi kategorię hasła, impostor nie', () => {
    const { room } = makeRoom(4, { impostorHint: 'brak' });
    startAndAck(room);
    expect(room.selfState(crewmates(room)[0]).wordCategory).toBeTruthy();
    expect(room.selfState(impostors(room)[0]).wordCategory).toBeNull();
  });

  it('tryby: kategoria, litery, brak', () => {
    for (const [mode, re] of [['kategoria', /^Kategoria: /], ['litery', /liter|wyrazy|zaczyna/], ['brak', null]] as const) {
      const { room } = makeRoom(4, { impostorHint: mode });
      startAndAck(room);
      const h = room.selfState(impostors(room)[0]).hint;
      if (re) expect(h).toMatch(re);
      else expect(h).toBeNull();
    }
  });
});

describe('własna paczka słów', () => {
  it('parser: linie, podpowiedzi, punktory, duplikaty, JSON', () => {
    expect(parseWordPack('pizza; okrągła\n- kot\n1. pies | szczeka\n# komentarz\nKOT\n\n')).toEqual([
      { word: 'pizza', hint: 'okrągła' },
      { word: 'kot' },
      { word: 'pies', hint: 'szczeka' },
    ]);
    expect(parseWordPack('["a1","b2"]')).toEqual([{ word: 'a1' }, { word: 'b2' }]);
    expect(parseWordPack('{"words":[{"word":"x1","hint":"y"}]}')).toEqual([{ word: 'x1', hint: 'y' }]);
    expect(parseWordPack('7 cudów świata')).toEqual([{ word: '7 cudów świata' }]);
  });

  it('host wgrywa paczkę → hasło losowane z paczki; lista nie trafia do graczy', () => {
    const { room, players } = makeRoom(4);
    const words = ['alfa', 'beta', 'gamma', 'delta', 'omega'].map((word) => ({ word, hint: `p-${word}` }));
    expect(() => room.setCustomWords(players[1].id, 'X', words)).toThrow(/host/);
    expect(() => room.setCustomWords(room.hostId, 'X', words.slice(0, 3))).toThrow(/co najmniej 5/);
    room.setCustomWords(room.hostId, 'Moja paczka', words);
    expect(room.settings.category).toBe('wlasne');
    expect(room.publicState().customPack).toEqual({ name: 'Moja paczka', count: 5 });
    expect(JSON.stringify(room.publicState())).not.toContain('gamma');
    startAndAck(room);
    expect(words.map((w) => w.word)).toContain(room.game!.word.word);
    expect(room.selfState(impostors(room)[0]).hint).toBe(`Skojarzenie: p-${room.game!.word.word}`);
  });

  it('kategoria „wlasne” bez paczki jest odrzucana; usunięcie paczki wraca do „mieszane”', () => {
    const { room } = makeRoom(3);
    expect(() => room.updateSettings(room.hostId, { category: 'wlasne' })).toThrow(/wgraj/i);
    room.setCustomWords(room.hostId, 'X', ['a1', 'a2', 'a3', 'a4', 'a5'].map((word) => ({ word })));
    room.setCustomWords(room.hostId, 'X', []);
    expect(room.settings.category).toBe('mieszane');
    expect(room.publicState().customPack).toBeNull();
  });
});

describe('punkty', () => {
  it('wygrana zwykłych: +1 i +1 za trafny głos; impostor 0; punkty sumują się między grami', () => {
    const { room } = makeRoom(4, { maxRounds: 1, discussionTime: 0, lastGuess: false });
    startAndAck(room);
    finishWithImpostorCaught(room);
    const res = room.publicState().game!.result!;
    const imp = impostors(room)[0];
    for (const s of res.scores) expect(s.delta).toBe(s.playerId === imp ? 0 : 2);
    const crew = crewmates(room)[0];
    expect(room.publicState().players.find((p) => p.id === crew)!.score).toBe(2);
    room.restart(room.hostId);
    for (const p of room.players.values()) room.acknowledgeRole(p.id);
    finishWithImpostorCaught(room);
    const total = room.publicState().players.find((p) => p.id === crew)!.score;
    expect(total).toBeGreaterThanOrEqual(2);
    room.resetScores(room.hostId);
    expect(room.publicState().players.every((p) => p.score === 0)).toBe(true);
  });

  it('wygrana impostora: +3', () => {
    const { room } = makeRoom(4, { maxRounds: 1, discussionTime: 0, lastGuess: false });
    startAndAck(room);
    playRound(room);
    const crew = crewmates(room);
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === crew[0] ? crew[1] : crew[0]);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    const imp = impostors(room)[0];
    expect(room.game!.result!.winner).toBe('impostors');
    expect(room.game!.result!.scores.find((s) => s.playerId === imp)!.delta).toBe(3);
  });
});

describe('impostor wpisuje hasło w swojej turze', () => {
  function impostorTurn(settings = {}) {
    const { room } = makeRoom(4, { clueTimeLimit: 0, ...settings });
    startAndAck(room);
    const imp = impostors(room)[0];
    let guard = 0;
    while (room.currentTurnId() !== imp && guard++ < 10) room.submitClue(room.currentTurnId()!, `slowo${guard}`);
    return { room, imp };
  }

  it('trafione hasło (wielkość liter, spacje, ogonki) = natychmiastowa wygrana impostorów i +3', () => {
    const { room, imp } = impostorTurn();
    const word = room.game!.word.word;
    room.submitClue(imp, `  ${word.toUpperCase()} `);
    const res = room.publicState().game!.result!;
    expect(room.phase).toBe('ended');
    expect(res.winner).toBe('impostors');
    expect(res.lastGuess).toMatchObject({ playerId: imp, correct: true, inTurn: true });
    expect(res.scores.find((s) => s.playerId === imp)!.delta).toBe(3);
    expect(room.game!.clues.at(-1)!.playerId).toBe(imp);
  });

  it('częściowe dopasowanie to zwykłe skojarzenie', () => {
    const { room, imp } = impostorTurn();
    const word = room.game!.word.word;
    room.submitClue(imp, word.slice(0, Math.max(1, word.length - 2)) + 'xq');
    expect(room.phase).not.toBe('ended');
  });

  it('po wyłączeniu reguły hasło od impostora jest zwykłym skojarzeniem', () => {
    const { room, imp } = impostorTurn({ impostorWordWin: false });
    room.submitClue(imp, room.game!.word.word);
    expect(room.phase).not.toBe('ended');
    expect(room.game!.clues.at(-1)!.word).toBe(room.game!.word.word);
  });
});

describe('emotki', () => {
  it('przerwa 30 s między emotkami jednego gracza', () => {
    const { room, players } = makeRoom(3);
    room.emote(players[0].id, 'dab');
    expect(() => room.emote(players[0].id, 'wave')).toThrow(/Kolejna emotka za 30 s/);
    room.emote(players[1].id, 'six-seven'); // inny gracz — bez blokady
    vi.advanceTimersByTime(29_000);
    expect(() => room.emote(players[0].id, 'wave')).toThrow(/za 1 s/);
    vi.advanceTimersByTime(1_001);
    expect(() => room.emote(players[0].id, 'wave')).not.toThrow();
  });
});
