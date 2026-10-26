import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room, GameError } from '../server/room';
import { crewmates, impostors, makeRoom, playRound, startAndAck, startGame } from './helpers';
import { DISCONNECTED_TURN_GRACE_MS, RECONNECT_GRACE_MS, REVEAL_MS } from '../shared/constants';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('lobby', () => {
  it('pierwszy gracz zostaje hostem, miejsca przydzielane po kolei', () => {
    const { room, players } = makeRoom(3);
    expect(room.hostId).toBe(players[0].id);
    expect(players.map((p) => p.seat)).toEqual([0, 1, 2]);
    expect(new Set(players.map((p) => p.colorIndex)).size).toBe(3);
  });

  it('odrzuca zduplikowany nick (bez względu na wielkość liter i ogonki)', () => {
    const { room } = makeRoom(2);
    expect(() => room.addPlayer('ADAM')).toThrow(/zajęty/);
    expect(() => room.addPlayer('Michal')).not.toThrow();
    expect(() => room.addPlayer('michał')).toThrow(/zajęty/);
  });

  it('odrzuca dołączenie do pełnego pokoju i do trwającej gry', () => {
    const { room } = makeRoom(3, { maxPlayers: 3 });
    expect(() => room.addPlayer('Nowy')).toThrow(/pełny/);
    room.updateSettings(room.hostId, { maxPlayers: 4 });
    startGame(room);
    expect(() => room.addPlayer('Spóźniony')).toThrow(/Gra już trwa/);
  });

  it('zmiana limitu: odrzuca limit niższy niż liczba graczy, nie usuwa nikogo', () => {
    const { room } = makeRoom(5, { maxPlayers: 8 });
    expect(() => room.updateSettings(room.hostId, { maxPlayers: 4 })).toThrow(/nie może być mniejszy/);
    expect(room.players.size).toBe(5);
    expect(room.settings.maxPlayers).toBe(8);
  });

  it('zmiana limitu zachowuje przypisanie postaci i miejsc w zakresie', () => {
    const { room, players } = makeRoom(4, { maxPlayers: 10 });
    // gracz na miejscu 2 wychodzi, nowy trafia na pierwsze wolne (2)
    room.removePlayer(players[2].id, 'left');
    const late = room.addPlayer('Zosia');
    expect(late.seat).toBe(2);
    // sztucznie: ktoś siedzi na miejscu 9
    late.seat = 9;
    const before = new Map([...room.players.values()].map((p) => [p.id, { seat: p.seat, color: p.colorIndex, nick: p.nickname }]));
    room.updateSettings(room.hostId, { maxPlayers: 5 });
    for (const p of room.players.values()) {
      const b = before.get(p.id)!;
      expect(p.colorIndex).toBe(b.color);
      expect(p.nickname).toBe(b.nick);
      if (b.seat < 5) expect(p.seat).toBe(b.seat); // nieprzesunięci
      expect(p.seat).toBeLessThan(5);
    }
    expect(late.seat).toBe(2);
    expect(new Set([...room.players.values()].map((p) => p.seat)).size).toBe(room.players.size);
  });

  it('tylko host zmienia ustawienia; po starcie ustawienia są zablokowane', () => {
    const { room, players } = makeRoom(3);
    expect(() => room.updateSettings(players[1].id, { maxPlayers: 8 })).toThrow(/Tylko host/);
    startGame(room);
    expect(() => room.updateSettings(room.hostId, { maxPlayers: 8 })).toThrow(/poczekalni/);
  });

  it('start wymaga 3 graczy, gotowości i prawidłowej liczby impostorów', () => {
    const { room, players } = makeRoom(3);
    expect(() => room.startGame(room.hostId)).toThrow(/gotowi/);
    room.setReady(players[1].id, true);
    room.setReady(players[2].id, true);
    expect(() => room.updateSettings(room.hostId, { impostorCount: 2, maxPlayers: 4 })).toThrow(/co najmniej 5/);
    room.updateSettings(room.hostId, { impostorCount: 2, maxPlayers: 6 });
    expect(() => room.startGame(room.hostId)).toThrow(/co najmniej 5 graczy/);
    room.updateSettings(room.hostId, { impostorCount: 1 });
    expect(() => room.startGame(players[1].id)).toThrow(/Tylko host/);
    room.startGame(room.hostId);
    expect(room.phase).toBe('roles');

    const small = new Room('X', {});
    small.addPlayer('Aa');
    small.addPlayer('Bb');
    expect(() => small.startGame(small.hostId)).toThrow(/co najmniej 3/);
  });

  it('host może usunąć gracza i przekazać rolę hosta', () => {
    const { room, players } = makeRoom(4);
    room.kick(room.hostId, players[3].id);
    expect(room.players.has(players[3].id)).toBe(false);
    expect(() => room.kick(players[1].id, players[2].id)).toThrow(/Tylko host/);
    room.transferHost(room.hostId, players[1].id);
    expect(room.hostId).toBe(players[1].id);
  });

  it('wyjście hosta przekazuje hosta kolejnej osobie; puste lobby jest zamykane', () => {
    const onEmpty = vi.fn();
    const room = new Room('ABCDE', { onEmpty });
    const a = room.addPlayer('Aa');
    const b = room.addPlayer('Bb');
    room.removePlayer(a.id, 'left');
    expect(room.hostId).toBe(b.id);
    room.removePlayer(b.id, 'left');
    expect(onEmpty).toHaveBeenCalledOnce();
    expect(room.closed).toBe(true);
  });
});

describe('role i ochrona hasła', () => {
  it('losuje dokładnie wybraną liczbę impostorów', () => {
    for (const count of [1, 2] as const) {
      const { room } = makeRoom(6, { impostorCount: count });
      startGame(room);
      expect(impostors(room)).toHaveLength(count);
    }
  });

  it('impostor nie dostaje hasła; stan publiczny nie zawiera ról ani hasła', () => {
    const { room } = makeRoom(5);
    startAndAck(room);
    const word = room.game!.word.word;
    const imp = impostors(room)[0];
    const crew = crewmates(room)[0];
    expect(room.selfState(imp)).toMatchObject({ role: 'impostor', word: null });
    expect(room.selfState(crew)).toMatchObject({ role: 'crewmate', word });
    const pub = JSON.stringify(room.publicState());
    expect(pub).not.toContain(`"${word}"`);
    expect(pub).not.toContain('impostor"');
    expect(pub).not.toContain('crewmate');
  });

  it('przy dwóch impostorach żaden nie zna drugiego', () => {
    const { room } = makeRoom(6, { impostorCount: 2 });
    startAndAck(room);
    for (const id of impostors(room)) {
      const self = JSON.stringify(room.selfState(id));
      const other = impostors(room).find((x) => x !== id)!;
      expect(self).not.toContain(other);
    }
  });

  it('runda zaczyna się po potwierdzeniu ról przez wszystkich', () => {
    const { room, players } = makeRoom(3);
    startGame(room);
    room.acknowledgeRole(players[0].id);
    room.acknowledgeRole(players[1].id);
    expect(room.phase).toBe('roles');
    room.acknowledgeRole(players[2].id);
    expect(room.phase).toBe('clues');
    expect(room.game!.round).toBe(1);
  });
});

describe('turowe podawanie słów', () => {
  it('przyjmuje słowa tylko od gracza, którego jest tura', () => {
    const { room } = makeRoom(4);
    startAndAck(room);
    const order = room.game!.turnOrder;
    expect(order).toHaveLength(4);
    expect(() => room.submitClue(order[1], 'ser')).toThrow(/nie jest Twoja tura/);
    room.submitClue(order[0], room.game!.roles.get(order[0]) === 'crewmate' ? 'ser' : 'cokolwiek');
    expect(room.currentTurnId()).toBe(order[1]);
    expect(() => room.submitClue(order[0], 'drugie')).toThrow(/Już podałeś/);
    expect(room.game!.clues).toHaveLength(1);
  });

  it('odrzuca słowa od osób spoza pokoju i poza etapem rundy', () => {
    const { room, players } = makeRoom(3);
    expect(() => room.submitClue(players[0].id, 'x')).toThrow(GameError);
    startAndAck(room);
    expect(() => room.submitClue('obcy-id', 'x')).toThrow(/uczestnikiem/);
    playRound(room);
    expect(room.phase).toBe('continuation-vote');
    expect(() => room.submitClue(players[0].id, 'po czasie')).toThrow(/niedostępna|nie jest teraz/);
  });

  it('zwykły gracz nie może podać samego hasła', () => {
    const { room } = makeRoom(4);
    startAndAck(room);
    let id = room.currentTurnId()!;
    if (room.game!.roles.get(id) === 'impostor') {
      room.submitClue(id, 'blef');
      id = room.currentTurnId()!;
    }
    expect(() => room.submitClue(id, room.game!.word.word.toUpperCase())).toThrow(/samego hasła/);
  });

  it('w kolejnej rundzie pierwszy gracz przechodzi na koniec kolejki', () => {
    const { room } = makeRoom(4, { maxRounds: 0 });
    startAndAck(room);
    const r1 = [...room.game!.turnOrder];
    playRound(room);
    for (const id of room.game!.voters) room.submitContinuationVote(id, 'continue');
    const r2 = [...room.game!.turnOrder];
    expect(r2).toEqual([...r1.slice(1), r1[0]]);
    playRound(room);
    for (const id of room.game!.voters) room.submitContinuationVote(id, 'continue');
    expect(room.game!.turnOrder).toEqual([...r1.slice(2), ...r1.slice(0, 2)]);
    // historia uporządkowana i podzielona na rundy
    const clues = room.game!.clues;
    expect(clues.map((c) => c.round)).toEqual([1, 1, 1, 1, 2, 2, 2, 2]);
    expect(clues.slice(0, 4).map((c) => c.playerId)).toEqual(r1);
  });

  it('limit czasu pomija turę', () => {
    const { room } = makeRoom(3, { clueTimeLimit: 20 });
    startAndAck(room);
    const first = room.currentTurnId();
    vi.advanceTimersByTime(20_001);
    expect(room.game!.clues[0]).toMatchObject({ playerId: first, skipped: true, word: null });
    expect(room.currentTurnId()).not.toBe(first);
  });
});

describe('głosowanie decyzyjne', () => {
  function toVote(n = 4, settings = {}) {
    const { room, players } = makeRoom(n, { maxRounds: 0, discussionTime: 0, ...settings });
    startAndAck(room);
    playRound(room);
    return { room, players };
  }

  it('głosy są niezmienne, liczone tylko jako postęp', () => {
    const { room } = toVote();
    const [a] = room.game!.voters;
    room.submitContinuationVote(a, 'vote');
    expect(() => room.submitContinuationVote(a, 'continue')).toThrow(/Już oddałeś/);
    const pub = room.publicState();
    expect(pub.game!.votesCast).toBe(1);
    expect(pub.game!.votesNeeded).toBe(4);
    expect(JSON.stringify(pub)).not.toContain('"vote"');
  });

  it('większość „głosujemy” przechodzi do głosowania eliminacyjnego', () => {
    const { room } = toVote();
    const v = room.game!.voters;
    room.submitContinuationVote(v[0], 'vote');
    room.submitContinuationVote(v[1], 'vote');
    room.submitContinuationVote(v[2], 'vote');
    room.submitContinuationVote(v[3], 'continue');
    expect(room.phase).toBe('elimination-vote');
  });

  it('remis oznacza kolejną rundę słów', () => {
    const { room } = toVote();
    const v = room.game!.voters;
    room.submitContinuationVote(v[0], 'vote');
    room.submitContinuationVote(v[1], 'vote');
    room.submitContinuationVote(v[2], 'continue');
    room.submitContinuationVote(v[3], 'continue');
    expect(room.phase).toBe('clues');
    expect(room.game!.round).toBe(2);
  });

  it('host nie może wymusić wyniku', () => {
    const { room } = toVote();
    expect(() => room.hostStartElimination(room.hostId)).toThrow();
    expect(room.phase).toBe('continuation-vote');
  });

  it('po osiągnięciu limitu rund od razu przechodzi do głosowania na impostora', () => {
    const { room } = makeRoom(3, { maxRounds: 1, discussionTime: 30 });
    startAndAck(room);
    playRound(room);
    expect(room.phase).toBe('discussion');
    expect(room.game!.roundLimitReached).toBe(true);
    room.hostStartElimination(room.hostId);
    expect(room.phase).toBe('elimination-vote');
  });

  it('dyskusja kończy się automatycznie po upływie czasu', () => {
    const { room } = makeRoom(3, { maxRounds: 1, discussionTime: 30 });
    startAndAck(room);
    playRound(room);
    vi.advanceTimersByTime(30_001);
    expect(room.phase).toBe('elimination-vote');
  });
});

describe('głosowanie eliminacyjne i warunki zwycięstwa', () => {
  function toElimination(n: number, settings = {}, seed = 7) {
    const { room, players } = makeRoom(n, { maxRounds: 1, discussionTime: 0, lastGuess: false, ...settings }, seed);
    startAndAck(room);
    playRound(room);
    expect(room.phase).toBe('elimination-vote');
    return { room, players };
  }

  it('nie można głosować na siebie ani dwa razy', () => {
    const { room, players } = toElimination(4);
    expect(() => room.submitEliminationVote(players[0].id, players[0].id)).toThrow(/na siebie/);
    room.submitEliminationVote(players[0].id, players[1].id);
    expect(() => room.submitEliminationVote(players[0].id, players[2].id)).toThrow(/Już oddałeś/);
  });

  it('wskazanie zwykłego gracza = wygrana impostorów', () => {
    const { room } = toElimination(4);
    const crew = crewmates(room);
    const target = crew[0];
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === target ? crew[1] : target);
    expect(room.phase).toBe('reveal');
    expect(room.publicState().game!.reveal).toMatchObject({ playerId: target, role: 'crewmate' });
    vi.advanceTimersByTime(REVEAL_MS + 1);
    expect(room.phase).toBe('ended');
    expect(room.game!.result!.winner).toBe('impostors');
  });

  it('wykrycie jedynego impostora = wygrana zwykłych graczy (bez ostatniej próby)', () => {
    const { room } = toElimination(4);
    const imp = impostors(room)[0];
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === imp ? crewmates(room)[0] : imp);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    expect(room.phase).toBe('ended');
    const result = room.publicState().game!.result!;
    expect(result.winner).toBe('crew');
    expect(result.word).toBe(room.game!.word.word);
    expect(result.roles).toHaveLength(4);
    // po zakończeniu hasło trafia do wszystkich
    expect(room.selfState(imp).word).toBe(room.game!.word.word);
  });

  it('ostatnia próba: poprawne hasło (wielkość liter, spacje) = wygrana impostorów', () => {
    const { room } = toElimination(4, { lastGuess: true });
    const imp = impostors(room)[0];
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === imp ? crewmates(room)[0] : imp);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    expect(room.phase).toBe('last-guess');
    expect(room.selfState(imp).canGuess).toBe(true);
    expect(() => room.guessWord(crewmates(room)[0], 'x')).toThrow(/Tylko wykryty/);
    room.guessWord(imp, `   ${room.game!.word.word.toUpperCase()}  `);
    expect(room.game!.result).toMatchObject({ winner: 'impostors', lastGuess: { correct: true } });
  });

  it('ostatnia próba: częściowe dopasowanie nie jest akceptowane', () => {
    const { room } = toElimination(4, { lastGuess: true });
    const imp = impostors(room)[0];
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === imp ? crewmates(room)[0] : imp);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    const word = room.game!.word.word;
    room.guessWord(imp, word.slice(0, Math.max(1, word.length - 2)));
    expect(room.game!.result).toMatchObject({ winner: 'crew', lastGuess: { correct: false } });
  });

  it('ostatnia próba: brak odpowiedzi w czasie = wygrana zwykłych graczy', () => {
    const { room } = toElimination(4, { lastGuess: true });
    const imp = impostors(room)[0];
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === imp ? crewmates(room)[0] : imp);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    vi.advanceTimersByTime(30_001);
    expect(room.game!.result!.winner).toBe('crew');
  });

  it('remis → dogrywka → ponowny remis → kolejna runda bez eliminacji', () => {
    const { room, players } = toElimination(4);
    const [a, b, c, d] = players.map((p) => p.id);
    // a,b dostają po 2 głosy
    room.submitEliminationVote(a, b);
    room.submitEliminationVote(b, a);
    room.submitEliminationVote(c, a);
    room.submitEliminationVote(d, b);
    expect(room.phase).toBe('elimination-vote');
    const g = room.publicState().game!;
    expect(g.isTieBreak).toBe(true);
    expect(g.candidates.sort()).toEqual([a, b].sort());
    expect(g.voters.sort()).toEqual([c, d].sort());
    expect(() => room.submitEliminationVote(a, b)).toThrow(/Nie możesz głosować/);
    expect(() => room.submitEliminationVote(c, d)).toThrow(/nie można głosować/);
    room.submitEliminationVote(c, a);
    room.submitEliminationVote(d, b);
    expect(room.phase).toBe('clues');
    expect(room.game!.round).toBe(2);
    expect(room.game!.voteHistory.map((v) => v.kind)).toEqual(['continuation', 'elimination', 'tie-break']);
  });

  it('dogrywka rozstrzygnięta wskazuje osobę', () => {
    const { room, players } = toElimination(4);
    const [a, b, c, d] = players.map((p) => p.id);
    room.submitEliminationVote(a, b);
    room.submitEliminationVote(b, a);
    room.submitEliminationVote(c, a);
    room.submitEliminationVote(d, b);
    room.submitEliminationVote(c, a);
    room.submitEliminationVote(d, a);
    expect(room.phase).toBe('reveal');
    expect(room.game!.reveal!.playerId).toBe(a);
  });

  it('restart losuje nowe hasło i zachowuje skład lobby', () => {
    const { room } = toElimination(4);
    const firstWord = room.game!.word.word;
    const imp = impostors(room)[0];
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === imp ? crewmates(room)[0] : imp);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    const ids = [...room.players.keys()].sort();
    room.restart(room.hostId);
    expect(room.phase).toBe('roles');
    expect(room.game!.word.word).not.toBe(firstWord);
    expect([...room.players.keys()].sort()).toEqual(ids);
    expect(room.game!.clues).toHaveLength(0);
  });

  it('powrót do poczekalni po zakończeniu gry', () => {
    const { room } = toElimination(4);
    const imp = impostors(room)[0];
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === imp ? crewmates(room)[0] : imp);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    room.backToLobby(room.hostId);
    expect(room.phase).toBe('lobby');
    expect(room.game).toBeNull();
    room.updateSettings(room.hostId, { maxPlayers: 9 });
  });
});

describe('dwóch impostorów', () => {
  it('po wykryciu pierwszego impostora gra trwa; po drugim wygrywają zwykli gracze', () => {
    const { room } = makeRoom(6, { impostorCount: 2, maxRounds: 1, discussionTime: 0, lastGuess: false });
    startAndAck(room);
    playRound(room);
    const [i1, i2] = impostors(room);
    const crew = crewmates(room);
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === i1 ? crew[0] : i1);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    expect(room.phase).toBe('clues');
    expect(room.game!.impostorsFound).toBe(1);
    expect(room.game!.turnOrder).not.toContain(i1);
    expect(room.publicState().players.find((p) => p.id === i1)!.eliminated).toBe(true);
    expect(() => room.submitClue(i1, 'x')).toThrow();
    playRound(room);
    // limit rund osiągnięty → od razu eliminacja
    expect(room.phase).toBe('elimination-vote');
    expect(room.game!.voters).not.toContain(i1);
    for (const id of room.game!.voters) room.submitEliminationVote(id, id === i2 ? crew[0] : i2);
    vi.advanceTimersByTime(REVEAL_MS + 1);
    expect(room.game!.result!.winner).toBe('crew');
  });
});

describe('rozłączenia i ponowne połączenia', () => {
  it('rozłączony gracz w swojej turze: tura wstrzymana, potem pominięta', () => {
    const { room } = makeRoom(4, { clueTimeLimit: 0 });
    startAndAck(room);
    const id = room.currentTurnId()!;
    room.handleDisconnect(id, room.getPlayer(id)!.socketId!);
    expect(room.publicState().game!.turnPaused).toBe(true);
    vi.advanceTimersByTime(DISCONNECTED_TURN_GRACE_MS + 1);
    expect(room.game!.clues[0]).toMatchObject({ playerId: id, skipped: true });
    expect(room.players.has(id)).toBe(true); // miejsce zachowane
  });

  it('powrót w czasie wstrzymania wznawia turę', () => {
    const { room } = makeRoom(4, { clueTimeLimit: 0 });
    startAndAck(room);
    const id = room.currentTurnId()!;
    room.handleDisconnect(id, room.getPlayer(id)!.socketId!);
    vi.advanceTimersByTime(5_000);
    const p = room.findByToken(room.getPlayer(id)!.token)!;
    room.attachSocket(p.id, 'nowe-gniazdo');
    expect(room.publicState().game!.turnPaused).toBe(false);
    expect(room.currentTurnId()).toBe(id);
    vi.advanceTimersByTime(DISCONNECTED_TURN_GRACE_MS * 2);
    expect(room.game!.clues).toHaveLength(0);
  });

  it('miejsce jest trzymane 60 s, potem gracz jest usuwany', () => {
    const { room, players } = makeRoom(4);
    room.handleDisconnect(players[2].id, 'sock-2');
    vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1000);
    expect(room.players.has(players[2].id)).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(room.players.has(players[2].id)).toBe(false);
  });

  it('token jest wymagany do przejęcia gracza', () => {
    const { room, players } = makeRoom(3);
    expect(room.findByToken('0'.repeat(64))).toBeUndefined();
    expect(room.findByToken(players[1].token)?.id).toBe(players[1].id);
  });

  it('za mało graczy w trakcie gry → gra przerwana', () => {
    const { room } = makeRoom(3);
    startAndAck(room);
    const crew = crewmates(room)[0];
    room.removePlayer(crew, 'left');
    expect(room.phase).toBe('ended');
    expect(room.game!.result!.winner).toBeNull();
  });

  it('wyjście gracza w trakcie rundy usuwa go z kolejki', () => {
    const { room } = makeRoom(5);
    startAndAck(room);
    const order = [...room.game!.turnOrder];
    const leaver = order.find((id) => room.game!.roles.get(id) === 'crewmate' && id !== order[0])!;
    room.removePlayer(leaver, 'left');
    expect(room.game!.turnOrder).not.toContain(leaver);
    expect(room.currentTurnId()).toBe(order[0]);
    playRound(room);
    expect(room.game!.clues).toHaveLength(4);
  });
});
