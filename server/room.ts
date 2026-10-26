import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  CONTINUATION_VOTE_MS,
  DISCONNECTED_TURN_GRACE_MS,
  ELIMINATION_VOTE_MS,
  LAST_GUESS_MS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  RECONNECT_GRACE_MS,
  REVEAL_MS,
  ROLE_ACK_TIMEOUT_MS,
} from '../shared/constants';
import { isCorrectGuess, normalizeForCompare, foldDiacritics, CUSTOM_MIN } from '../shared/schemas';
import {
  HATS,
  SHIRTS,
  CATEGORY_LABELS,
  DEFAULT_SETTINGS,
  type Appearance,
  type ClueEntry,
  type EndResult,
  type Phase,
  type PublicGame,
  type PublicPlayer,
  type PublicRoom,
  type RevealInfo,
  type Role,
  type RoomSettings,
  type SelfState,
  type VoteRecord,
} from '../shared/types';
import { pickWord, type WordEntry } from '../shared/words';
import { EMOTE_COOLDOWN_MS, type EmoteId } from '../shared/emotes';

/** Błąd zgłaszany graczowi (komunikat po polsku). */
export class GameError extends Error {}

const fail = (msg: string): never => {
  throw new GameError(msg);
};

export interface Player {
  id: string;
  token: string;
  nickname: string;
  colorIndex: number;
  hat: number;
  face: number;
  shirt: number;
  score: number;
  seat: number;
  ready: boolean;
  connected: boolean;
  socketId: string | null;
  joinedAt: number;
  removalTimer: ReturnType<typeof setTimeout> | null;
  lastEmoteAt: number;
}

interface GameState {
  word: WordEntry;
  roles: Map<string, Role>;
  /** Podpowiedzi — osobna dla każdego impostora. */
  hints: Map<string, string>;
  /** Wszystkie głosy eliminacyjne z całej gry (do punktacji). */
  allElimVotes: { voterId: string; targetId: string }[];
  /** Uczestnicy w kolejności bazowej (wg miejsc) — tylko obecni w pokoju. */
  participants: string[];
  eliminated: Set<string>;
  acknowledged: Set<string>;
  round: number;
  turnOrder: string[];
  turnIndex: number;
  clues: ClueEntry[];
  submitted: Set<string>;
  deadline: number | null;
  turnPaused: boolean;
  contVotes: Map<string, 'continue' | 'vote'>;
  elimVotes: Map<string, string>;
  candidates: string[];
  voters: string[];
  isTieBreak: boolean;
  roundLimitReached: boolean;
  voteHistory: VoteRecord[];
  reveal: RevealInfo | null;
  lastGuessPlayerId: string | null;
  impostorCount: number;
  impostorsFound: number;
  result: EndResult | null;
}

export interface RoomHooks {
  onChange?: (room: Room) => void;
  onPlayerRemoved?: (room: Room, player: Player, reason: 'left' | 'kicked' | 'timeout') => void;
  onEmpty?: (room: Room) => void;
  random?: () => number;
}

export function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export class Room {
  readonly code: string;
  hostId = '';
  phase: Phase = 'lobby';
  settings: RoomSettings = { ...DEFAULT_SETTINGS };
  readonly players = new Map<string, Player>();
  game: GameState | null = null;
  version = 0;
  readonly usedWords = new Set<string>();
  customPack: { name: string; words: WordEntry[] } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly hooks: RoomHooks;
  private readonly rand: () => number;
  closed = false;

  constructor(code: string, hooks: RoomHooks = {}) {
    this.code = code;
    this.hooks = hooks;
    this.rand = hooks.random ?? Math.random;
  }

  // ───────────────────────────── pomocnicze ─────────────────────────────

  private changed() {
    this.version++;
    this.hooks.onChange?.(this);
  }

  private schedule(ms: number, fn: () => void) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.closed) return;
      fn();
      this.changed();
    }, ms);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  get playerList(): Player[] {
    return [...this.players.values()].sort((a, b) => a.seat - b.seat);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  findByToken(token: string): Player | undefined {
    for (const p of this.players.values()) if (tokensEqual(p.token, token)) return p;
    return undefined;
  }

  private requirePlayer(id: string): Player {
    return this.players.get(id) ?? fail('Nie jesteś uczestnikiem tego pokoju.');
  }

  private requireHost(id: string) {
    this.requirePlayer(id);
    if (id !== this.hostId) fail('Tylko host może to zrobić.');
  }

  private requireGame(...phases: Phase[]): GameState {
    if (!this.game || !phases.includes(this.phase)) fail('Ta akcja nie jest teraz dostępna.');
    return this.game!;
  }

  get isGameActive(): boolean {
    return this.phase !== 'lobby' && this.phase !== 'ended';
  }

  /** Aktywni uczestnicy gry: obecni w pokoju i niewyeliminowani. */
  private activeIds(g = this.game): string[] {
    if (!g) return [];
    return g.participants.filter((id) => !g.eliminated.has(id) && this.players.has(id));
  }

  // ───────────────────────────── lobby ─────────────────────────────

  addPlayer(nickname: string, appearance?: Appearance): Player {
    if (this.isGameActive) fail('Gra już trwa — nie można teraz dołączyć.');
    if (this.players.size >= this.settings.maxPlayers) fail('Pokój jest pełny.');
    const lower = normalizeForCompare(nickname);
    const folded = foldDiacritics(nickname);
    for (const p of this.players.values()) {
      if (normalizeForCompare(p.nickname) === lower || foldDiacritics(p.nickname) === folded) {
        fail('Ten nick jest już zajęty w tym pokoju.');
      }
    }
    const seat = this.firstFreeSeat();
    const usedColors = new Set([...this.players.values()].map((p) => p.colorIndex));
    // Wybrany kolor, a jeśli zajęty — najbliższy wolny.
    let colorIndex = appearance?.colorIndex ?? 0;
    for (let i = 0; i < PLAYER_COLORS.length && usedColors.has(colorIndex); i++) colorIndex = (colorIndex + 1) % PLAYER_COLORS.length;
    const pick = (n: number) => Math.floor(this.rand() * n);
    const hat = appearance?.hat ?? pick(HATS.length);
    const face = appearance?.face ?? 0;
    const shirt = appearance?.shirt ?? pick(SHIRTS.length);
    const player: Player = {
      id: randomUUID(),
      token: randomBytes(32).toString('hex'),
      nickname,
      colorIndex,
      hat,
      face,
      shirt,
      score: 0,
      seat,
      ready: false,
      connected: true,
      socketId: null,
      joinedAt: Date.now(),
      removalTimer: null,
      lastEmoteAt: 0,
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.changed();
    return player;
  }

  private firstFreeSeat(): number {
    const taken = new Set([...this.players.values()].map((p) => p.seat));
    for (let i = 0; i < this.settings.maxPlayers; i++) if (!taken.has(i)) return i;
    return fail('Pokój jest pełny.');
  }

  setReady(playerId: string, ready: boolean) {
    const p = this.requirePlayer(playerId);
    if (this.phase !== 'lobby' && this.phase !== 'ended') fail('Gotowość można zmieniać tylko w poczekalni.');
    p.ready = ready;
    this.changed();
  }

  updateSettings(playerId: string, patch: Partial<RoomSettings>) {
    this.requireHost(playerId);
    if (this.phase !== 'lobby') fail('Ustawienia można zmieniać tylko w poczekalni.');
    const next = { ...this.settings, ...patch };
    if (next.maxPlayers < this.players.size) {
      fail(`Limit nie może być mniejszy niż liczba graczy w pokoju (${this.players.size}).`);
    }
    if (next.impostorCount === 2 && next.maxPlayers < 5) {
      fail('Dwóch impostorów wymaga limitu co najmniej 5 graczy.');
    }
    if (next.category === 'wlasne' && !this.customPack) fail('Najpierw wgraj własną paczkę słów.');
    const limitChanged = next.maxPlayers !== this.settings.maxPlayers;
    this.settings = next;
    if (limitChanged) this.compactSeats();
    this.changed();
  }

  /** Po zmniejszeniu limitu przenosi tylko graczy z miejsc spoza zakresu. */
  private compactSeats() {
    const max = this.settings.maxPlayers;
    const taken = new Set<number>();
    const outside: Player[] = [];
    for (const p of this.playerList) {
      if (p.seat < max) taken.add(p.seat);
      else outside.push(p);
    }
    for (const p of outside) {
      let s = 0;
      while (taken.has(s)) s++;
      p.seat = s;
      taken.add(s);
    }
  }

  updateAppearance(playerId: string, patch: Partial<Appearance>) {
    const p = this.requirePlayer(playerId);
    if (this.isGameActive) fail('Wygląd postaci można zmieniać tylko w poczekalni.');
    if (patch.colorIndex !== undefined && patch.colorIndex !== p.colorIndex) {
      if ([...this.players.values()].some((o) => o.id !== p.id && o.colorIndex === patch.colorIndex)) fail('Ten kolor jest już zajęty przez innego gracza.');
      p.colorIndex = patch.colorIndex;
    }
    if (patch.hat !== undefined) p.hat = patch.hat;
    if (patch.face !== undefined) p.face = patch.face;
    if (patch.shirt !== undefined) p.shirt = patch.shirt;
    this.changed();
  }

  setCustomWords(hostId: string, name: string, words: { word: string; hint?: string }[]) {
    this.requireHost(hostId);
    if (this.phase !== 'lobby') fail('Paczkę słów można zmienić tylko w poczekalni.');
    if (words.length === 0) {
      this.customPack = null;
      if (this.settings.category === 'wlasne') this.settings = { ...this.settings, category: 'mieszane' };
      this.changed();
      return;
    }
    const seen = new Set<string>();
    const unique = words.filter((w) => {
      const k = normalizeForCompare(w.word);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (unique.length < CUSTOM_MIN) fail(`Paczka musi mieć co najmniej ${CUSTOM_MIN} różnych haseł (jest ${unique.length}).`);
    this.customPack = {
      name: name || 'Własna paczka',
      // Kilka podpowiedzi do jednego hasła można oddzielić przecinkami.
      words: unique.map((w) => ({
        word: w.word,
        hints: (w.hint ?? '').split(',').map((h) => h.trim()).filter(Boolean),
        category: 'wlasne',
        difficulty: 'sredni',
      })),
    };
    for (const w of this.customPack.words) this.usedWords.delete(w.word);
    // Po wgraniu paczki od razu z niej gramy.
    this.settings = { ...this.settings, category: 'wlasne' };
    this.changed();
  }

  /** Emotka postaci (bez wpływu na stan gry) — z przerwą 30 s na gracza. Zwraca czas, od którego można użyć kolejnej. */
  emote(playerId: string, _emote: EmoteId): number {
    const p = this.requirePlayer(playerId);
    const now = Date.now();
    const left = p.lastEmoteAt + EMOTE_COOLDOWN_MS - now;
    if (left > 0) fail(`Kolejna emotka za ${Math.ceil(left / 1000)} s.`);
    p.lastEmoteAt = now;
    return now + EMOTE_COOLDOWN_MS;
  }

  resetScores(hostId: string) {
    this.requireHost(hostId);
    if (this.isGameActive) fail('Punkty można wyzerować tylko poza rozgrywką.');
    for (const p of this.players.values()) p.score = 0;
    this.changed();
  }

  kick(hostId: string, targetId: string) {
    this.requireHost(hostId);
    if (this.isGameActive) fail('Nie można usuwać graczy w trakcie gry.');
    if (targetId === hostId) fail('Nie możesz usunąć samego siebie.');
    const target = this.requirePlayer(targetId);
    this.removePlayer(target.id, 'kicked');
  }

  transferHost(hostId: string, targetId: string) {
    this.requireHost(hostId);
    const target = this.requirePlayer(targetId);
    if (target.id === hostId) fail('Już jesteś hostem.');
    this.hostId = target.id;
    this.changed();
  }

  // ─────────────────────── połączenia i rozłączenia ───────────────────────

  attachSocket(playerId: string, socketId: string) {
    const p = this.requirePlayer(playerId);
    p.socketId = socketId;
    const wasDisconnected = !p.connected;
    p.connected = true;
    if (p.removalTimer) clearTimeout(p.removalTimer);
    p.removalTimer = null;
    if (wasDisconnected && this.game && this.phase === 'clues' && this.currentTurnId() === p.id) {
      this.startTurn(); // wznowienie wstrzymanej tury
    }
    this.changed();
  }

  handleDisconnect(playerId: string, socketId: string) {
    const p = this.players.get(playerId);
    if (!p || p.socketId !== socketId) return;
    p.socketId = null;
    p.connected = false;
    if (p.removalTimer) clearTimeout(p.removalTimer);
    p.removalTimer = setTimeout(() => {
      p.removalTimer = null;
      if (!this.closed && this.players.get(p.id) === p && !p.connected) this.removePlayer(p.id, 'timeout');
    }, RECONNECT_GRACE_MS);
    if (this.game && this.phase === 'clues' && this.currentTurnId() === p.id) this.startTurn();
    this.changed();
  }

  removePlayer(playerId: string, reason: 'left' | 'kicked' | 'timeout') {
    const p = this.players.get(playerId);
    if (!p) return;
    if (p.removalTimer) clearTimeout(p.removalTimer);
    this.players.delete(playerId);
    this.hooks.onPlayerRemoved?.(this, p, reason);

    if (this.players.size === 0) {
      this.close();
      this.hooks.onEmpty?.(this);
      return;
    }
    if (this.hostId === playerId) {
      const next = this.playerList.find((x) => x.connected) ?? this.playerList[0];
      this.hostId = next.id;
    }
    if (this.game && this.isGameActive && this.game.participants.includes(playerId)) {
      this.handleParticipantLeft(playerId);
    } else if (this.game) {
      this.game.participants = this.game.participants.filter((id) => id !== playerId);
    }
    this.changed();
  }

  close() {
    this.closed = true;
    this.clearTimer();
    for (const p of this.players.values()) if (p.removalTimer) clearTimeout(p.removalTimer);
  }

  private handleParticipantLeft(playerId: string) {
    const g = this.game!;
    const wasTurn = this.phase === 'clues' && this.currentTurnId() === playerId;
    const turnPos = g.turnOrder.indexOf(playerId);
    g.participants = g.participants.filter((id) => id !== playerId);
    const role = g.roles.get(playerId);
    const wasActive = !g.eliminated.has(playerId);

    const active = this.activeIds();
    const undetected = active.filter((id) => g.roles.get(id) === 'impostor').length;
    if (wasActive && role === 'impostor' && undetected === 0) {
      return this.endGame(null, 'Impostor opuścił grę — rozgrywka została przerwana.');
    }
    if (active.length < MIN_PLAYERS) {
      return this.endGame(null, 'Za mało graczy, aby kontynuować — rozgrywka została przerwana.');
    }
    if (!wasActive) return;

    switch (this.phase) {
      case 'roles':
        g.acknowledged.delete(playerId);
        this.maybeFinishRoles();
        break;
      case 'clues': {
        if (turnPos >= 0) {
          g.turnOrder.splice(turnPos, 1);
          if (turnPos < g.turnIndex) g.turnIndex--;
        }
        if (wasTurn || g.turnIndex >= g.turnOrder.length) {
          if (g.turnIndex >= g.turnOrder.length) this.endRound();
          else this.startTurn();
        }
        break;
      }
      case 'continuation-vote':
        g.voters = g.voters.filter((id) => id !== playerId);
        g.contVotes.delete(playerId);
        if (g.contVotes.size >= g.voters.length) this.resolveContinuation();
        break;
      case 'elimination-vote': {
        g.voters = g.voters.filter((id) => id !== playerId);
        g.candidates = g.candidates.filter((id) => id !== playerId);
        g.elimVotes.delete(playerId);
        for (const [voter, target] of g.elimVotes) if (target === playerId) g.elimVotes.delete(voter);
        if (g.voters.length === 0 || g.candidates.length === 0 || g.elimVotes.size >= g.voters.length) {
          this.resolveElimination();
        }
        break;
      }
      case 'last-guess':
        if (g.lastGuessPlayerId === playerId) this.resolveLastGuess(playerId, '', false);
        break;
      default:
        break;
    }
  }

  // ───────────────────────────── start gry ─────────────────────────────

  startGame(playerId: string) {
    this.requireHost(playerId);
    if (this.phase !== 'lobby' && this.phase !== 'ended') fail('Gra już trwa.');
    const players = this.playerList;
    if (players.length < MIN_PLAYERS) fail(`Do rozpoczęcia potrzeba co najmniej ${MIN_PLAYERS} graczy.`);
    if (players.some((p) => !p.connected)) fail('Nie wszyscy gracze są połączeni.');
    if (this.phase === 'lobby' && players.some((p) => p.id !== this.hostId && !p.ready)) {
      fail('Nie wszyscy gracze są gotowi.');
    }
    const impostors = this.settings.impostorCount;
    if (impostors === 2 && players.length < 5) fail('Dwóch impostorów wymaga co najmniej 5 graczy.');
    if (impostors >= players.length - impostors) fail('Nieprawidłowa liczba impostorów dla tej liczby graczy.');

    if (this.settings.category === 'wlasne' && !this.customPack) fail('Wgraj własną paczkę słów albo wybierz inną kategorię.');
    const word = pickWord(this.settings.category, this.settings.difficulty, this.usedWords, this.rand, this.customPack?.words ?? []);
    const ids = players.map((p) => p.id);
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const impostorIds = new Set(shuffled.slice(0, impostors));
    const roles = new Map<string, Role>(ids.map((id) => [id, impostorIds.has(id) ? 'impostor' : 'crewmate']));
    // Kolejność bazowa: losowy gracz rozpoczyna, dalej wg miejsc na arenie.
    const startAt = Math.floor(this.rand() * ids.length);
    const participants = [...ids.slice(startAt), ...ids.slice(0, startAt)];

    this.game = {
      word,
      roles,
      hints: this.makeHints(word, [...impostorIds]),
      allElimVotes: [],
      participants,
      eliminated: new Set(),
      acknowledged: new Set(),
      round: 0,
      turnOrder: [],
      turnIndex: 0,
      clues: [],
      submitted: new Set(),
      deadline: Date.now() + ROLE_ACK_TIMEOUT_MS,
      turnPaused: false,
      contVotes: new Map(),
      elimVotes: new Map(),
      candidates: [],
      voters: [],
      isTieBreak: false,
      roundLimitReached: false,
      voteHistory: [],
      reveal: null,
      lastGuessPlayerId: null,
      impostorCount: impostors,
      impostorsFound: 0,
      result: null,
    };
    for (const p of players) p.ready = false;
    this.phase = 'roles';
    this.schedule(ROLE_ACK_TIMEOUT_MS, () => this.beginRound(1));
    this.changed();
  }

  /**
   * Podpowiedzi dla impostorów wg ustawienia hosta — każdy impostor dostaje inną.
   * Zwraca mapę: id impostora → treść podpowiedzi.
   */
  private makeHints(word: WordEntry, impostorIds: string[]): Map<string, string> {
    const out = new Map<string, string>();
    const mode = this.settings.impostorHint;
    if (mode === 'brak') return out;
    const category = word.category === 'wlasne' ? (this.customPack?.name ?? 'Własna paczka') : CATEGORY_LABELS[word.category];
    const shuffle = <T,>(arr: T[]) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    // Tryb „litery”: każdy dostaje tylko jedną informację (długość albo pierwszą literę), nie obie naraz.
    const w = word.word.trim();
    const parts = w.split(/\s+/);
    const letterPieces = shuffle([
      parts.length > 1 ? `Hasło ma ${parts.length} wyrazy` : `Hasło ma ${w.replace(/[^\p{L}\p{N}]/gu, '').length} liter`,
      `Hasło zaczyna się na „${w[0].toLocaleUpperCase('pl-PL')}”`,
    ]);
    const assoc = shuffle(word.hints ?? []).map((h) => `Skojarzenie: ${h}`);
    impostorIds.forEach((id, i) => {
      if (mode === 'kategoria') out.set(id, `Kategoria: ${category}`);
      else if (mode === 'litery') out.set(id, letterPieces[i % letterPieces.length]);
      // skojarzenie — a gdy hasło go nie ma (np. własna paczka bez podpowiedzi) — informacja o literach
      else out.set(id, assoc.length ? assoc[i % assoc.length] : letterPieces[i % letterPieces.length]);
    });
    return out;
  }

  acknowledgeRole(playerId: string) {
    this.requirePlayer(playerId);
    const g = this.requireGame('roles');
    if (!g.participants.includes(playerId)) fail('Nie bierzesz udziału w tej grze.');
    g.acknowledged.add(playerId);
    this.maybeFinishRoles();
    this.changed();
  }

  private maybeFinishRoles() {
    const g = this.game!;
    if (this.activeIds().every((id) => g.acknowledged.has(id))) this.beginRound(1);
  }

  // ───────────────────────────── tury ─────────────────────────────

  currentTurnId(): string | null {
    const g = this.game;
    if (!g || this.phase !== 'clues') return null;
    return g.turnOrder[g.turnIndex] ?? null;
  }

  private beginRound(round: number) {
    const g = this.game!;
    const base = this.activeIds();
    const shift = (round - 1) % base.length;
    g.round = round;
    g.turnOrder = [...base.slice(shift), ...base.slice(0, shift)];
    g.turnIndex = 0;
    g.submitted = new Set();
    g.contVotes = new Map();
    g.elimVotes = new Map();
    g.candidates = [];
    g.voters = [];
    g.isTieBreak = false;
    g.reveal = null;
    g.lastGuessPlayerId = null;
    this.phase = 'clues';
    this.startTurn();
  }

  private startTurn() {
    const g = this.game!;
    const currentId = g.turnOrder[g.turnIndex];
    const current = currentId ? this.players.get(currentId) : undefined;
    if (!current) {
      this.clearTimer();
      return;
    }
    if (!current.connected) {
      g.turnPaused = true;
      g.deadline = Date.now() + DISCONNECTED_TURN_GRACE_MS;
      this.schedule(DISCONNECTED_TURN_GRACE_MS, () => this.skipTurn());
      return;
    }
    g.turnPaused = false;
    const limit = this.settings.clueTimeLimit;
    if (limit > 0) {
      g.deadline = Date.now() + limit * 1000;
      this.schedule(limit * 1000, () => this.skipTurn());
    } else {
      g.deadline = null;
      this.clearTimer();
    }
  }

  submitClue(playerId: string, word: string) {
    this.requirePlayer(playerId);
    const g = this.requireGame('clues');
    if (!g.participants.includes(playerId)) fail('Nie bierzesz udziału w tej grze.');
    if (g.eliminated.has(playerId)) fail('Zostałeś wyeliminowany — nie możesz podawać słów.');
    if (g.submitted.has(playerId)) fail('Już podałeś słowo w tej rundzie.');
    if (this.currentTurnId() !== playerId) fail('To nie jest Twoja tura.');
    if (g.roles.get(playerId) === 'crewmate' && foldDiacritics(word) === foldDiacritics(g.word.word)) {
      fail('Nie możesz podać samego hasła!');
    }
    // Impostor, który w swojej turze trafi tajne hasło, od razu wygrywa dla impostorów.
    if (g.roles.get(playerId) === 'impostor' && this.settings.impostorWordWin && isCorrectGuess(word, g.word.word)) {
      const p = this.players.get(playerId)!;
      g.clues.push({ round: g.round, playerId, nickname: p.nickname, word, skipped: false });
      g.submitted.add(playerId);
      this.endGame('impostors', `${p.nickname} był impostorem i odgadł hasło w swojej turze! Impostorzy wygrywają.`, {
        playerId,
        guess: word,
        correct: true,
        inTurn: true,
      });
      this.changed();
      return;
    }
    this.recordClue(playerId, word);
    this.changed();
  }

  private recordClue(playerId: string, word: string | null) {
    const g = this.game!;
    const p = this.players.get(playerId);
    g.clues.push({ round: g.round, playerId, nickname: p?.nickname ?? '?', word, skipped: word === null });
    g.submitted.add(playerId);
    g.turnIndex++;
    if (g.turnIndex >= g.turnOrder.length) this.endRound();
    else this.startTurn();
  }

  private skipTurn() {
    const id = this.currentTurnId();
    if (id) this.recordClue(id, null);
  }

  private endRound() {
    const g = this.game!;
    g.deadline = null;
    g.turnPaused = false;
    const max = this.settings.maxRounds;
    if (max > 0 && g.round >= max) {
      g.roundLimitReached = true;
      g.voteHistory.push({
        kind: 'continuation',
        round: g.round,
        outcome: 'Osiągnięto limit rund — przechodzimy do głosowania na impostora.',
      });
      return this.goToDiscussion();
    }
    this.phase = 'continuation-vote';
    g.voters = this.activeIds();
    g.contVotes = new Map();
    g.deadline = Date.now() + CONTINUATION_VOTE_MS;
    this.schedule(CONTINUATION_VOTE_MS, () => this.resolveContinuation());
  }

  // ───────────────────────── głosowanie decyzyjne ─────────────────────────

  submitContinuationVote(playerId: string, choice: 'continue' | 'vote') {
    this.requirePlayer(playerId);
    const g = this.requireGame('continuation-vote');
    if (!g.voters.includes(playerId)) fail('Nie możesz głosować w tym głosowaniu.');
    if (g.contVotes.has(playerId)) fail('Już oddałeś głos.');
    g.contVotes.set(playerId, choice);
    if (g.contVotes.size >= g.voters.length) this.resolveContinuation();
    this.changed();
  }

  private resolveContinuation() {
    const g = this.game!;
    let cont = 0;
    let vote = 0;
    for (const v of g.contVotes.values()) (v === 'continue' ? cont++ : vote++);
    const goVote = vote > cont;
    g.voteHistory.push({
      kind: 'continuation',
      round: g.round,
      continueVotes: cont,
      eliminateVotes: vote,
      outcome: goVote
        ? 'Większość chce głosować na impostora.'
        : vote === cont
          ? 'Remis — gramy kolejną rundę słów.'
          : 'Większość chce kolejnej rundy słów.',
    });
    if (goVote) this.goToDiscussion();
    else this.beginRound(g.round + 1);
  }

  // ───────────────────────── dyskusja i eliminacja ─────────────────────────

  private goToDiscussion() {
    const g = this.game!;
    const t = this.settings.discussionTime;
    if (t > 0) {
      this.phase = 'discussion';
      g.deadline = Date.now() + t * 1000;
      this.schedule(t * 1000, () => this.startElimination(null));
    } else {
      this.startElimination(null);
    }
  }

  hostStartElimination(playerId: string) {
    this.requireHost(playerId);
    this.requireGame('discussion');
    this.startElimination(null);
    this.changed();
  }

  private startElimination(tied: string[] | null) {
    const g = this.game!;
    const active = this.activeIds();
    g.isTieBreak = tied !== null;
    g.candidates = tied ?? active;
    g.voters = tied ? active.filter((id) => !tied.includes(id)) : active;
    g.elimVotes = new Map();
    this.phase = 'elimination-vote';
    if (g.voters.length === 0) {
      // Nikt nie może głosować w dogrywce — traktujemy jak ponowny remis.
      this.resolveElimination();
      return;
    }
    g.deadline = Date.now() + ELIMINATION_VOTE_MS;
    this.schedule(ELIMINATION_VOTE_MS, () => this.resolveElimination());
  }

  submitEliminationVote(playerId: string, targetId: string) {
    this.requirePlayer(playerId);
    const g = this.requireGame('elimination-vote');
    if (!g.voters.includes(playerId)) fail('Nie możesz głosować w tym głosowaniu.');
    if (g.elimVotes.has(playerId)) fail('Już oddałeś głos.');
    if (targetId === playerId) fail('Nie możesz głosować na siebie.');
    if (!g.candidates.includes(targetId)) fail('Na tę osobę nie można głosować.');
    g.elimVotes.set(playerId, targetId);
    if (g.elimVotes.size >= g.voters.length) this.resolveElimination();
    this.changed();
  }

  private resolveElimination() {
    const g = this.game!;
    const tally = new Map<string, number>(g.candidates.map((id) => [id, 0]));
    for (const t of g.elimVotes.values()) if (tally.has(t)) tally.set(t, tally.get(t)! + 1);
    const tallies = [...tally.entries()].map(([playerId, votes]) => ({ playerId, votes })).sort((a, b) => b.votes - a.votes);
    const top = tallies[0]?.votes ?? 0;
    const leaders = top > 0 ? tallies.filter((t) => t.votes === top).map((t) => t.playerId) : [];
    const ballots =
      this.settings.voteMode === 'jawny'
        ? [...g.elimVotes.entries()].map(([voterId, targetId]) => ({ voterId, targetId }))
        : undefined;
    const kind = g.isTieBreak ? 'tie-break' : 'elimination';
    for (const [voterId, targetId] of g.elimVotes) g.allElimVotes.push({ voterId, targetId });
    const nick = (id: string) => this.players.get(id)?.nickname ?? '?';

    if (leaders.length === 1) {
      g.voteHistory.push({ kind, round: g.round, tallies, ballots, outcome: `Najwięcej głosów: ${nick(leaders[0])}.` });
      return this.revealPlayer(leaders[0], top);
    }
    if (!g.isTieBreak && leaders.length > 1) {
      g.voteHistory.push({
        kind,
        round: g.round,
        tallies,
        ballots,
        outcome: `Remis: ${leaders.map(nick).join(', ')} — dogrywka.`,
      });
      return this.startElimination(leaders);
    }
    g.voteHistory.push({
      kind,
      round: g.round,
      tallies,
      ballots,
      outcome:
        leaders.length === 0 && !g.isTieBreak
          ? 'Nikt nie otrzymał głosów — nikt nie odpada, gramy kolejną rundę słów.'
          : 'Ponowny remis — nikt nie odpada, gramy kolejną rundę słów.',
    });
    this.beginRound(g.round + 1);
  }

  private revealPlayer(playerId: string, votes: number) {
    const g = this.game!;
    const role = g.roles.get(playerId)!;
    g.reveal = { playerId, nickname: this.players.get(playerId)?.nickname ?? '?', role, votes };
    g.candidates = [];
    g.voters = [];
    this.phase = 'reveal';
    g.deadline = Date.now() + REVEAL_MS;
    this.schedule(REVEAL_MS, () => this.afterReveal());
  }

  private afterReveal() {
    const g = this.game!;
    const r = g.reveal!;
    if (r.role === 'crewmate') {
      return this.endGame('impostors', `${r.nickname} nie był impostorem. Impostorzy wygrywają!`);
    }
    g.eliminated.add(r.playerId);
    g.impostorsFound++;
    if (this.settings.lastGuess && this.players.has(r.playerId)) {
      this.phase = 'last-guess';
      g.lastGuessPlayerId = r.playerId;
      g.deadline = Date.now() + LAST_GUESS_MS;
      this.schedule(LAST_GUESS_MS, () => this.resolveLastGuess(r.playerId, '', false));
      return;
    }
    this.afterImpostorCaught();
  }

  private afterImpostorCaught() {
    const g = this.game!;
    if (g.impostorsFound >= g.impostorCount) {
      return this.endGame(
        'crew',
        g.impostorCount > 1 ? 'Wszyscy impostorzy zostali wykryci. Wygrywają zwykli gracze!' : 'Impostor został wykryty. Wygrywają zwykli gracze!',
      );
    }
    if (this.activeIds().length < MIN_PLAYERS) {
      return this.endGame(null, 'Za mało graczy, aby kontynuować.');
    }
    this.beginRound(g.round + 1);
  }

  guessWord(playerId: string, guess: string) {
    this.requirePlayer(playerId);
    const g = this.requireGame('last-guess');
    if (g.lastGuessPlayerId !== playerId) fail('Tylko wykryty impostor może zgadywać hasło.');
    this.resolveLastGuess(playerId, guess, isCorrectGuess(guess, g.word.word));
    this.changed();
  }

  private resolveLastGuess(playerId: string, guess: string, correct: boolean) {
    const g = this.game!;
    g.lastGuessPlayerId = null;
    const lg = { playerId, guess: guess || '—', correct };
    if (correct) {
      this.endGame('impostors', `${this.players.get(playerId)?.nickname ?? 'Impostor'} odgadł hasło! Impostorzy wygrywają.`, lg);
      return;
    }
    if (g.impostorsFound >= g.impostorCount) {
      this.endGame('crew', 'Impostor nie odgadł hasła. Wygrywają zwykli gracze!', lg);
      return;
    }
    g.voteHistory.push({ kind: 'elimination', round: g.round, outcome: 'Impostor nie odgadł hasła — gra toczy się dalej.' });
    this.afterImpostorCaught();
  }

  // ───────────────────────────── koniec gry ─────────────────────────────

  private endGame(winner: 'crew' | 'impostors' | null, reason: string, lastGuess?: EndResult['lastGuess']) {
    const g = this.game!;
    this.clearTimer();
    g.deadline = null;
    g.turnPaused = false;
    g.result = {
      winner,
      reason,
      word: g.word.word,
      category: g.word.category,
      roles: [...g.roles.entries()].map(([playerId, role]) => ({
        playerId,
        role,
        nickname: this.players.get(playerId)?.nickname ?? g.clues.find((c) => c.playerId === playerId)?.nickname ?? '(opuścił grę)',
      })),
      lastGuess,
      scores: this.awardPoints(winner, lastGuess),
    };
    this.phase = 'ended';
    for (const p of this.players.values()) p.ready = false;
  }

  /**
   * Punktacja:
   * - wygrana zwykłych graczy: każdy zwykły gracz +1, dodatkowo +1 za każdy głos oddany na impostora,
   * - wygrana impostorów: każdy impostor +3 (także za odgadnięte hasło w ostatniej próbie),
   * - gra przerwana: bez punktów.
   */
  private awardPoints(winner: 'crew' | 'impostors' | null, lastGuess?: EndResult['lastGuess']): EndResult['scores'] {
    const g = this.game!;
    const result: EndResult['scores'] = [];
    for (const [id, role] of g.roles) {
      const p = this.players.get(id);
      let delta = 0;
      let reason = '';
      if (winner === 'crew' && role === 'crewmate') {
        const hits = g.allElimVotes.filter((v) => v.voterId === id && g.roles.get(v.targetId) === 'impostor').length;
        delta = 1 + hits;
        reason = hits ? `wygrana +1, trafne głosy +${hits}` : 'wygrana +1';
      } else if (winner === 'impostors' && role === 'impostor') {
        delta = 3;
        reason = lastGuess?.correct && lastGuess.playerId === id ? (lastGuess.inTurn ? 'hasło w swojej turze +3' : 'odgadnięte hasło +3') : 'wygrana impostora +3';
      }
      if (p) p.score += delta;
      result.push({ playerId: id, delta, total: p?.score ?? delta, reason });
    }
    return result;
  }

  restart(playerId: string) {
    this.requireHost(playerId);
    if (this.phase !== 'ended') fail('Gra jeszcze się nie zakończyła.');
    this.startGame(playerId);
  }

  backToLobby(playerId: string) {
    this.requireHost(playerId);
    if (this.phase !== 'ended') fail('Można wrócić do poczekalni dopiero po zakończeniu gry.');
    this.clearTimer();
    this.game = null;
    this.phase = 'lobby';
    for (const p of this.players.values()) p.ready = false;
    this.changed();
  }

  // ───────────────────────────── widoki stanu ─────────────────────────────

  publicState(): PublicRoom {
    const g = this.game;
    const players: PublicPlayer[] = this.playerList.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      colorIndex: p.colorIndex,
      hat: p.hat,
      face: p.face,
      shirt: p.shirt,
      score: p.score,
      seat: p.seat,
      isHost: p.id === this.hostId,
      ready: p.ready,
      connected: p.connected,
      inGame: !!g && this.phase !== 'lobby' && g.participants.includes(p.id),
      eliminated: !!g && g.eliminated.has(p.id),
      acknowledged: !!g && this.phase === 'roles' && g.acknowledged.has(p.id),
    }));
    let game: PublicGame | null = null;
    if (g) {
      const voting = this.phase === 'continuation-vote' || this.phase === 'elimination-vote';
      game = {
        round: g.round,
        turnOrder: this.phase === 'clues' ? [...g.turnOrder] : [],
        turnIndex: g.turnIndex,
        currentTurnPlayerId: this.currentTurnId(),
        clues: g.clues.map((c) => ({ ...c })),
        deadline: g.deadline,
        turnPaused: g.turnPaused,
        votesCast: this.phase === 'continuation-vote' ? g.contVotes.size : this.phase === 'elimination-vote' ? g.elimVotes.size : 0,
        votesNeeded: voting ? g.voters.length : 0,
        candidates: this.phase === 'elimination-vote' ? [...g.candidates] : [],
        voters: voting ? [...g.voters] : [],
        isTieBreak: g.isTieBreak,
        roundLimitReached: g.roundLimitReached,
        voteHistory: g.voteHistory.map((v) => ({ ...v })),
        // Rola ujawniona dopiero po rozstrzygnięciu przez serwer (etap „reveal”).
        reveal: g.reveal ? { ...g.reveal } : null,
        lastGuessPlayerId: g.lastGuessPlayerId,
        impostorCount: g.impostorCount,
        impostorsFound: g.impostorsFound,
        result: this.phase === 'ended' && g.result ? { ...g.result } : null,
        category: this.settings.category,
      };
    }
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      settings: { ...this.settings },
      players,
      game,
      customPack: this.customPack ? { name: this.customPack.name, count: this.customPack.words.length } : null,
      serverNow: Date.now(),
      version: this.version,
    };
  }

  selfState(playerId: string): SelfState {
    const g = this.game;
    const role = g && this.phase !== 'lobby' ? (g.roles.get(playerId) ?? null) : null;
    const ended = this.phase === 'ended';
    return {
      playerId,
      role,
      // Hasło nigdy nie trafia do impostora przed końcem gry.
      word: g && (ended || role === 'crewmate') ? g.word.word : null,
      wordCategory:
        g && (ended || role === 'crewmate')
          ? g.word.category === 'wlasne'
            ? (this.customPack?.name ?? CATEGORY_LABELS.wlasne)
            : CATEGORY_LABELS[g.word.category]
          : null,
      // Podpowiedź tylko dla impostora (zwykli gracze znają hasło).
      hint: g && role === 'impostor' && !ended ? (g.hints.get(playerId) ?? null) : null,
      hasSubmittedClue: !!g && g.submitted.has(playerId),
      continuationVote: (this.phase === 'continuation-vote' && g?.contVotes.get(playerId)) || null,
      eliminationVote: (this.phase === 'elimination-vote' && g?.elimVotes.get(playerId)) || null,
      canGuess: this.phase === 'last-guess' && g?.lastGuessPlayerId === playerId,
    };
  }
}
