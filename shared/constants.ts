export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const NICK_MIN = 2;
export const NICK_MAX = 16;
/** Tyle samo co najdłuższe hasło w paczce — impostor musi móc wpisać każde hasło. */
export const CLUE_MAX = 40;
export const ROOM_CODE_LENGTH = 5;
/** Alfabet kodów bez mylących znaków (0/O, 1/I/L). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Czas utrzymania miejsca po rozłączeniu. */
export const RECONNECT_GRACE_MS = 180_000; // 3 minuty
/** Ile czekamy na rozłączonego gracza, gdy trwa jego tura, zanim ją pominiemy. */
export const DISCONNECTED_TURN_GRACE_MS = 20_000;
/** Bezpiecznik etapu zapoznania się z rolą. */
export const ROLE_ACK_TIMEOUT_MS = 45_000;
/** Limit czasu głosowania decyzyjnego. */
export const CONTINUATION_VOTE_MS = 45_000;
/** Limit czasu głosowania eliminacyjnego i dogrywki. */
export const ELIMINATION_VOTE_MS = 60_000;
/** Czas prezentacji wyniku głosowania przed kolejnym etapem. */
export const REVEAL_MS = 5_000;
/** Czas na ostatnią próbę odgadnięcia hasła. */
export const LAST_GUESS_MS = 30_000;
/** Puste lobby jest usuwane po tym czasie. */
export const EMPTY_ROOM_TTL_MS = 30_000;

export const PLAYER_COLORS = [
  '#ff5d73', // malinowy
  '#4dabf7', // niebieski
  '#ffd43b', // żółty
  '#51cf66', // zielony
  '#b197fc', // lawendowy
  '#ff922b', // pomarańczowy
  '#22d3ee', // turkus
  '#f783ac', // róż
  '#a9e34b', // limonka
  '#e8e8f0', // biały
  '#748ffc', // indygo
  '#c08457', // brąz
  '#2b2b33', // czarny
  '#7a4a2a', // ciemny brąz
  '#e03131', // czerwony
  '#2f9e44', // ciemnozielony
  '#364fc7', // granatowy
  '#862e9c', // fioletowy
  '#868e96', // szary
  '#e9c99a', // beżowy
  '#63e6be', // miętowy
  '#f2b134', // złoty
  '#a61e4d', // bordowy
  '#ff8787', // łososiowy
] as const;

/** Kolor postaci: własny kolor (RGB) albo kolor z palety. */
export function playerColor(p: { colorIndex: number; skin?: string | null }): string {
  return p.skin ?? PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length];
}

export const PLAYER_COLOR_NAMES = [
  'malinowy', 'niebieski', 'żółty', 'zielony', 'lawendowy', 'pomarańczowy',
  'turkusowy', 'różowy', 'limonkowy', 'biały', 'indygo', 'brązowy',
  'czarny', 'ciemnobrązowy', 'czerwony', 'ciemnozielony', 'granatowy', 'fioletowy',
  'szary', 'beżowy', 'miętowy', 'złoty', 'bordowy', 'łososiowy',
] as const;
