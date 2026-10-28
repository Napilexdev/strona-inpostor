import { z } from 'zod';
import { CATEGORIES, DIFFICULTIES, HINT_MODES } from './types';
import { BEARDS, EYES, FACES, HATS, SHIRTS } from './outfits';
import { CLUE_MAX, MAX_PLAYERS, MIN_PLAYERS, NICK_MAX, NICK_MIN, PLAYER_COLORS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants';

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

export const appearanceSchema = z
  .object({
    colorIndex: z.number().int().min(0).max(PLAYER_COLORS.length - 1),
    hat: z.number().int().min(0).max(HATS.length - 1),
    face: z.number().int().min(0).max(FACES.length - 1),
    shirt: z.number().int().min(0).max(SHIRTS.length - 1),
    // eyes/beard opcjonalne — starsze klienty ich nie wysyłają
    eyes: z.number().int().min(0).max(EYES.length - 1).default(0),
    beard: z.number().int().min(0).max(BEARDS.length - 1).default(0),
    skin: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Kolor musi mieć format #RRGGBB.')
      .transform((s) => s.toLowerCase())
      .nullable()
      .default(null),
  })
  .strict();
export const appearancePatchSchema = appearanceSchema.partial().strict();

export const createLobbySchema = z.object({ nickname: nicknameSchema, appearance: appearanceSchema.optional() });
export const joinLobbySchema = z.object({ code: roomCodeSchema, nickname: nicknameSchema, appearance: appearanceSchema.optional() });

export const CUSTOM_MIN = 5;
export const CUSTOM_MAX = 500;
const packText = (max: number, label: string) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(1).max(max, `${label} może mieć najwyżej ${max} znaków.`));
export const customWordsSchema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().max(40)).default('Własna paczka'),
  words: z
    .array(z.object({ word: packText(40, 'Hasło'), hint: z.string().transform(cleanText).pipe(z.string().max(60)).optional() }))
    .max(CUSTOM_MAX, `Paczka może mieć najwyżej ${CUSTOM_MAX} haseł.`),
});

/**
 * Parsowanie paczki z tekstu: jedno hasło w linii, opcjonalnie „hasło ; podpowiedź”
 * (separator: średnik, | albo tabulator). Obsługuje też JSON: ["hasło", ...] lub [{word, hint}].
 */
export function parseWordPack(text: string): { word: string; hint?: string }[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const data = JSON.parse(t);
      const arr = Array.isArray(data) ? data : Array.isArray(data.words) ? data.words : [];
      return arr
        .map((x: unknown) =>
          typeof x === 'string' ? { word: x } : x && typeof x === 'object' ? { word: String((x as { word?: unknown }).word ?? ''), hint: (x as { hint?: unknown }).hint ? String((x as { hint?: unknown }).hint) : undefined } : null,
        )
        .filter((x: { word: string } | null): x is { word: string; hint?: string } => !!x && !!cleanText(x.word));
    } catch {
      /* nie JSON — czytamy jako tekst */
    }
  }
  const seen = new Set<string>();
  const out: { word: string; hint?: string }[] = [];
  for (const line of t.split(/\r?\n/)) {
    const raw = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
    if (!raw || raw.startsWith('#')) continue;
    const [w, h] = raw.split(/\s*[;|\t]\s*/);
    const word = cleanText(w ?? '');
    if (!word || seen.has(normalizeForCompare(word))) continue;
    seen.add(normalizeForCompare(word));
    out.push(h && cleanText(h) ? { word, hint: cleanText(h) } : { word });
  }
  return out;
}
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
    impostorHint: z.enum(HINT_MODES),
    impostorWordWin: z.boolean(),
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
        .regex(/^[\p{L}\p{N}][\p{L}\p{N} '\-.,!?&:]*$/u, 'Słowo może zawierać tylko litery, cyfry, spacje i podstawowe znaki interpunkcyjne.')
        .refine((s) => s.split(' ').length <= 6, 'Podaj jedno słowo albo krótkie wyrażenie (najwyżej 6 wyrazów).'),
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
