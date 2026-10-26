export const CATEGORIES = [
  'jedzenie',
  'zwierzeta',
  'miejsca',
  'przedmioty',
  'sport',
  'filmy',
  'gry',
  'zawody',
  'natura',
  'technologia',
  'mieszane',
  'wlasne',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  jedzenie: 'Jedzenie',
  zwierzeta: 'Zwierzęta',
  miejsca: 'Miejsca',
  przedmioty: 'Przedmioty',
  sport: 'Sport',
  filmy: 'Filmy i seriale',
  gry: 'Gry',
  zawody: 'Zawody',
  natura: 'Natura',
  technologia: 'Technologia',
  mieszane: 'Mieszane',
  wlasne: 'Własna paczka',
};

/** Kategorie wbudowanej bazy haseł. */
export type BuiltinCategory = Exclude<Category, 'mieszane' | 'wlasne'>;

export const HINT_MODES = ['skojarzenie', 'kategoria', 'litery', 'brak'] as const;
export type HintMode = (typeof HINT_MODES)[number];
export const HINT_MODE_LABELS: Record<HintMode, string> = {
  skojarzenie: 'Skojarzenie',
  kategoria: 'Tylko kategoria',
  litery: 'Pierwsza litera i długość',
  brak: 'Brak',
};

export { FACES, HATS, SHIRTS } from './outfits';

/** Wygląd postaci: kolor + nakrycie głowy + twarz + strój. */
export interface Appearance {
  colorIndex: number;
  hat: number;
  face: number;
  shirt: number;
}

export const DIFFICULTIES = ['dowolny', 'latwy', 'sredni', 'trudny'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  dowolny: 'Dowolny',
  latwy: 'Łatwy',
  sredni: 'Średni',
  trudny: 'Trudny',
};

export type VoteMode = 'tajny' | 'jawny';

export interface RoomSettings {
  maxPlayers: number; // 3..12
  impostorCount: 1 | 2;
  category: Category;
  difficulty: Difficulty;
  /** Sekundy na podanie słowa, 0 = bez limitu. */
  clueTimeLimit: number;
  /** Sekundy dyskusji przed głosowaniem, 0 = pomiń dyskusję. */
  discussionTime: number;
  /** Maksymalna liczba rund skojarzeń, 0 = bez limitu. */
  maxRounds: number;
  voteMode: VoteMode;
  lastGuess: boolean;
  /** Podpowiedź do hasła dla impostora. */
  impostorHint: HintMode;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 6,
  impostorCount: 1,
  category: 'mieszane',
  difficulty: 'dowolny',
  clueTimeLimit: 45,
  discussionTime: 60,
  maxRounds: 4,
  voteMode: 'tajny',
  lastGuess: true,
  impostorHint: 'skojarzenie',
};

export type Phase =
  | 'lobby'
  | 'roles'
  | 'clues'
  | 'continuation-vote'
  | 'discussion'
  | 'elimination-vote'
  | 'reveal'
  | 'last-guess'
  | 'ended';

export type Role = 'crewmate' | 'impostor';

export interface PublicPlayer {
  id: string;
  nickname: string;
  colorIndex: number;
  hat: number;
  face: number;
  shirt: number;
  /** Punkty zdobyte w tym lobby (sumowane między grami). */
  score: number;
  seat: number;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  /** Czy uczestniczy w bieżącej grze (false = dołączył/obserwuje). */
  inGame: boolean;
  /** Wykryty impostor — nie gra dalej. */
  eliminated: boolean;
  /** Potwierdził zapoznanie się z rolą (etap ról). */
  acknowledged: boolean;
}

export interface ClueEntry {
  round: number;
  playerId: string;
  nickname: string;
  word: string | null; // null = tura pominięta
  skipped: boolean;
}

export interface EliminationTally {
  playerId: string;
  votes: number;
}

export interface VoteRecord {
  kind: 'continuation' | 'elimination' | 'tie-break';
  round: number;
  /** Dla głosowania decyzyjnego. */
  continueVotes?: number;
  eliminateVotes?: number;
  outcome: string;
  tallies?: EliminationTally[];
  /** Tylko w trybie jawnym (lub po zakończeniu gry): kto na kogo. */
  ballots?: { voterId: string; targetId: string }[];
}

export interface RevealInfo {
  playerId: string;
  nickname: string;
  role: Role;
  votes: number;
}

export interface EndResult {
  winner: 'crew' | 'impostors' | null;
  reason: string;
  word: string;
  category: Category;
  roles: { playerId: string; nickname: string; role: Role }[];
  lastGuess?: { playerId: string; guess: string; correct: boolean };
  /** Punkty przyznane w tej grze. */
  scores: { playerId: string; delta: number; total: number; reason: string }[];
}

export interface PublicGame {
  round: number;
  /** Kolejność bieżącej rundy (ID graczy). */
  turnOrder: string[];
  turnIndex: number;
  currentTurnPlayerId: string | null;
  clues: ClueEntry[];
  /** Termin (epoch ms) bieżącego etapu/tury, null = brak limitu. */
  deadline: number | null;
  /** Tura wstrzymana z powodu rozłączenia gracza. */
  turnPaused: boolean;
  votesCast: number;
  votesNeeded: number;
  /** Kandydaci w głosowaniu eliminacyjnym (dogrywka: tylko remisujący). */
  candidates: string[];
  /** Uprawnieni do głosowania w bieżącym głosowaniu. */
  voters: string[];
  isTieBreak: boolean;
  /** Czy można jeszcze grać kolejne rundy (limit rund). */
  roundLimitReached: boolean;
  voteHistory: VoteRecord[];
  reveal: RevealInfo | null;
  lastGuessPlayerId: string | null;
  impostorCount: number;
  impostorsFound: number;
  result: EndResult | null;
  category: Category;
}

export interface PublicRoom {
  code: string;
  hostId: string;
  phase: Phase;
  settings: RoomSettings;
  players: PublicPlayer[];
  game: PublicGame | null;
  /** Wgrana własna paczka słów (bez listy haseł — ta zostaje na serwerze). */
  customPack: { name: string; count: number } | null;
  serverNow: number;
  /** Rośnie przy każdej zmianie stanu. */
  version: number;
}

/** Prywatne dane wysyłane tylko do jednego gracza. */
export interface SelfState {
  playerId: string;
  role: Role | null;
  /** Hasło — tylko dla zwykłych graczy (i dla wszystkich po zakończeniu). */
  word: string | null;
  /** Podpowiedź do hasła — tylko dla impostora. */
  hint: string | null;
  hasSubmittedClue: boolean;
  continuationVote: 'continue' | 'vote' | null;
  eliminationVote: string | null;
  canGuess: boolean;
}

export interface RoomStatePayload {
  room: PublicRoom;
  self: SelfState;
}

export type Ack<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface JoinResult {
  code: string;
  playerId: string;
  token: string;
}
