'use client';

export interface StoredSession {
  code: string;
  token: string;
  playerId: string;
  nickname?: string;
  savedAt?: number;
}

const key = (code: string) => `impostor:session:${code.toUpperCase()}`;
const LAST_KEY = 'impostor:last-session';
const NICK_KEY = 'impostor:nick';
/** Zapamiętana sesja jest ważna przez 6 godzin (serwer i tak usuwa pokoje bez graczy). */
const REMEMBER_MS = 6 * 60 * 60 * 1000;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Sesja jest zapisywana w dwóch miejscach:
 * - sessionStorage — bieżąca karta (odświeżenie strony wraca automatycznie,
 *   a kilka kart to kilku różnych graczy),
 * - localStorage — „ostatnia gra” w tej przeglądarce, żeby po zamknięciu karty
 *   można było wrócić z linku albo ze strony głównej.
 */
export function saveSession(s: StoredSession) {
  const full = { ...s, savedAt: Date.now() };
  safe(() => sessionStorage.setItem(key(s.code), JSON.stringify(full)), undefined);
  safe(() => localStorage.setItem(LAST_KEY, JSON.stringify(full)), undefined);
}

export function loadSession(code: string): StoredSession | null {
  return safe(() => {
    const raw = sessionStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }, null);
}

/** Ostatnia gra zapamiętana w tej przeglądarce (opcjonalnie dla konkretnego pokoju). */
export function loadRemembered(code?: string): StoredSession | null {
  return safe(() => {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s.token || !s.code || Date.now() - (s.savedAt ?? 0) > REMEMBER_MS) return null;
    if (code && s.code.toUpperCase() !== code.toUpperCase()) return null;
    return s;
  }, null);
}

/** Przenosi zapamiętaną sesję do bieżącej karty (powrót do gry). */
export function adoptRemembered(code: string): boolean {
  const s = loadRemembered(code);
  if (!s) return false;
  safe(() => sessionStorage.setItem(key(code), JSON.stringify(s)), undefined);
  return true;
}

/** Usuwa sesję karty; zapamiętaną „ostatnią grę” tylko wtedy, gdy dotyczy tego samego gracza. */
export function clearSession(code: string) {
  const current = loadSession(code);
  safe(() => sessionStorage.removeItem(key(code)), undefined);
  const last = loadRemembered(code);
  if (last && (!current || current.token === last.token)) safe(() => localStorage.removeItem(LAST_KEY), undefined);
}

export function loadNick(): string {
  return safe(() => localStorage.getItem(NICK_KEY) ?? '', '');
}

export function saveNick(nick: string) {
  safe(() => localStorage.setItem(NICK_KEY, nick), undefined);
}
