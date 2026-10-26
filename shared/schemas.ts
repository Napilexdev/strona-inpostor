import { z } from 'zod';
import { CATEGORIES, DIFFICULTIES } from './types';
import { CLUE_MAX, MAX_PLAYERS, MIN_PLAYERS, NICK_MAX, NICK_MIN, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants';

/** Usuwa znaki sterujące i niewidoczne, scala białe znaki. */
export function cleanText(input: string): string {
  return input
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalizacja do porównań: małe litery, bez zbędnych spacji. */
export function normalizeForCompare(input: string): string {
  return cleanText(input).toLocaleLowerCase('pl-PL');
}

/** Dodatkowo bez polskich znaków diakrytycznych (np. „zyrafa” == „żyrafa”). */
export function foldDiacritics(input: string): string {
  return normalizeForCompare(input)
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Porównanie odpowiedzi w ostatniej próbie — całe hasło, bez dopasowań częściowych. */
export function isCorrectGuess(guess: string, word: string): boolean {
  const g = foldDiacritics(guess);
  if (!g) return false;
  return g === foldDiacritics(word);
}

const NICK_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.\-]*$/u;

export const nicknameSchema = z
  .string({ invalid_type_error: 'Nieprawidłowy nick.' })
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(NICK_MIN, `Nick musi mieć co najmniej ${NICK_MIN} znaki.`)
      .max(NICK_MAX, `Nick może mieć najwyżej ${NICK_MAX} znaków.`)
      .regex(NICK_RE, 'Nick może zawierać tylko litery, cyfry, spacje oraz znaki _ . -'),
  );

export const roomCodeSchema = z
  .string({ invalid_type_error: 'Nieprawidłowy kod pokoju.' })
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .length(ROOM_CODE_LENGTH, `Kod pokoju ma ${ROOM_CODE_LENGTH} znaków.`)
      .refine((s) => [...s].every((c) => ROOM_CODE_ALPHABET.includes(c)), 'Kod pokoju zawiera niedozwolone znaki.'),
  );

export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Nieprawidłowy token.');
export const playerIdSchema = z.string().min(1).max(64);

export const createLobbySchema = z.object({ nickname: nicknameSchema });
export const joinLobbySchema = z.object({ code: roomCodeSchema, nickname: nicknameSchema });
export const reconnectSchema = z.object({ code: roomCodeSchema, token: tokenSchema });
export const readySchema = z.object({ ready: z.boolean() });
export const targetPlayerSchema = z.object({ playerId: playerIdSchema });

export const settingsPatchSchema = z
  .object({
    maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
    impostorCount: z.union([z.literal(1), z.literal(2)]),
    category: z.enum(CATEGORIES),
    difficulty: z.enum(DIFFICULTIES),
    clueTimeLimit: z.union([z.literal(0), z.number().int().min(15).max(180)]),
    discussionTime: z.union([z.literal(0), z.number().int().min(15).max(600)]),
    maxRounds: z.number().int().min(0).max(20),
    voteMode: z.enum(['tajny', 'jawny']),
    lastGuess: z.boolean(),
  })
  .partial()
  .strict();

export const clueSchema = z.object({
  word: z
    .string({ invalid_type_error: 'Nieprawidłowe słowo.' })
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(1, 'Wpisz słowo.')
        .max(CLUE_MAX, `Słowo może mieć najwyżej ${CLUE_MAX} znaków.`)
        .regex(/^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u, 'Słowo może zawierać tylko litery, cyfry, spacje, myślnik i apostrof.')
        .refine((s) => s.split(' ').length <= 3, 'Podaj jedno słowo (maksymalnie krótkie wyrażenie z 3 wyrazów).'),
    ),
});

export const continuationVoteSchema = z.object({ choice: z.enum(['continue', 'vote']) });
export const eliminationVoteSchema = z.object({ targetId: playerIdSchema });
export const guessSchema = z.object({
  guess: z.string().transform(cleanText).pipe(z.string().min(1, 'Wpisz hasło.').max(40)),
});

export function firstZodError(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Nieprawidłowe dane.';
}
