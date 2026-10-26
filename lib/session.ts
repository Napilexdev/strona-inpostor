'use client';

export interface StoredSession {
  code: string;
  token: string;
  playerId: string;
}

const key = (code: string) => `impostor:session:${code.toUpperCase()}`;
const NICK_KEY = 'impostor:nick';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Sesja trzymana w sessionStorage — przetrwa odświeżenie strony,
 * a każda karta to osobny gracz (wygodne do testów na jednym komputerze).
 */
export function saveSession(s: StoredSession) {
  safe(() => sessionStorage.setItem(key(s.code), JSON.stringify(s)), undefined);
}

export function loadSession(code: string): StoredSession | null {
  return safe(() => {
    const raw = sessionStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }, null);
}

export function clearSession(code: string) {
  safe(() => sessionStorage.removeItem(key(code)), undefined);
}

export function loadNick(): string {
  return safe(() => localStorage.getItem(NICK_KEY) ?? '', '');
}

export function saveNick(nick: string) {
  safe(() => localStorage.setItem(NICK_KEY, nick), undefined);
}
