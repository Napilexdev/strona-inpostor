'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dices } from 'lucide-react';
import { PLAYER_COLORS, PLAYER_COLOR_NAMES, playerColor } from '@/shared/constants';
import { BEARDS, EYES, FACES, HATS, SHIRTS, type Appearance } from '@/shared/types';
import { cn } from './primitives';

const AvatarPreview = dynamic(() => import('@/components/arena/AvatarPreview'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-white/[.04]" />,
});

const KEY = 'impostor:appearance';

/** Podgląd 3D tylko, gdy przeglądarka obsługuje WebGL (i nie wymuszono ?webgl=0). */
function useCan3D() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const forced = new URLSearchParams(window.location.search).get('webgl') === '0';
      const c = document.createElement('canvas');
      setOk(!forced && !!(c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

function FlatPreview({ value }: { value: Appearance }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
      <div className="h-10 w-10 rounded-full" style={{ background: playerColor(value) }} />
      <div className="h-12 w-12 rounded-2xl" style={{ background: playerColor(value), opacity: 0.85 }} />
      <span className="text-[9px] leading-tight text-white/40">podgląd 3D niedostępny</span>
    </div>
  );
}
const HEX = /^#[0-9a-fA-F]{6}$/;
const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Własny kolor skóry: suwaki R/G/B, próbnik i pole #RRGGBB. Zmiany wysyłane z krótkim opóźnieniem. */
function CustomColor({ value, base, onCommit }: { value: string | null; base: string; onCommit: (hex: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? base);
  const [text, setText] = useState(value ?? base);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastLocal = useRef(0);
  useEffect(() => {
    // zmiana z zewnątrz (np. wybór z palety, losowanie) — ale nie w trakcie przeciągania suwaka
    if (Date.now() - lastLocal.current < 600) return;
    setDraft(value ?? base);
    setText(value ?? base);
  }, [value, base]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const push = (hex: string) => {
    lastLocal.current = Date.now();
    setDraft(hex);
    setText(hex);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(hex.toLowerCase()), 200);
  };
  const rgb = toRgb(draft);
  const labels = ['R', 'G', 'B'] as const;
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-2.5" data-testid="custom-color">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-white/70">Własny kolor (RGB)</span>
        {value && (
          <button type="button" onClick={() => onCommit(null)} className="ml-auto text-[11px] text-white/45 hover:text-white">
            wróć do palety
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-white/30" style={{ background: draft }} title="Wybierz kolor">
          <input type="color" value={draft} onChange={(e) => push(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Próbnik koloru" />
        </label>
        <input
          type="text"
          value={text}
          maxLength={7}
          spellCheck={false}
          aria-label="Kolor w zapisie szesnastkowym"
          onChange={(e) => {
            const t = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
            setText(t);
            if (HEX.test(t)) push(t);
          }}
          className="h-9 w-24 rounded-lg border border-white/10 bg-ink-950/60 px-2 font-mono text-sm uppercase text-white outline-none focus:border-accent"
        />
        {value && <span className="ml-auto h-2 w-2 rounded-full bg-ok" title="Używasz własnego koloru" />}
      </div>
      <div className="mt-2 space-y-1.5">
        {labels.map((l, i) => {
          const lo = [...rgb];
          lo[i] = 0;
          const hi = [...rgb];
          hi[i] = 255;
          return (
            <label key={l} className="flex items-center gap-2 text-[11px] text-white/55">
              <span className="w-3 font-bold">{l}</span>
              <input
                type="range"
                min={0}
                max={255}
                value={rgb[i]}
                aria-label={`Składowa ${l}`}
                onChange={(e) => {
                  const next = [...rgb];
                  next[i] = Number(e.target.value);
                  push(toHex(next));
                }}
                className="rgb-range h-2 flex-1 cursor-pointer appearance-none rounded-full"
                style={{ background: `linear-gradient(to right, ${toHex(lo)}, ${toHex(hi)})` }}
              />
              <span className="w-7 text-right tabular-nums">{rgb[i]}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

const rnd = (n: number) => Math.floor(Math.random() * n);

export function randomAppearance(taken: number[] = []): Appearance {
  const free = PLAYER_COLORS.map((_, i) => i).filter((i) => !taken.includes(i));
  return {
    colorIndex: free[rnd(free.length)] ?? 0,
    hat: rnd(HATS.length),
    face: Math.random() < 0.5 ? 0 : rnd(FACES.length),
    shirt: rnd(SHIRTS.length),
    eyes: Math.random() < 0.4 ? 0 : rnd(EYES.length),
    beard: Math.random() < 0.65 ? 0 : rnd(BEARDS.length),
    skin: null,
  };
}

/** Odczyt zapisanego wyglądu (z migracją starego formatu z jednym „dodatkiem”). */
function readStored(): Appearance | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Appearance> & { accessory?: number };
    const ok = (x: unknown, max: number) => Number.isInteger(x) && (x as number) >= 0 && (x as number) < max;
    if (!ok(v.colorIndex, PLAYER_COLORS.length)) return null;
    if (v.accessory !== undefined && v.hat === undefined) {
      // stare dodatki: 0 brak, 1 antenka, 2 czapeczka, 3 słuchawki, 4 korona, 5 okulary, 6 cylinder, 7 kokarda
      const a = v.accessory;
      return { colorIndex: v.colorIndex!, hat: a === 5 ? 0 : a > 5 ? a - 1 : a, face: a === 5 ? 1 : 0, shirt: 1, eyes: 0, beard: 0, skin: null };
    }
    if (!ok(v.hat, HATS.length) || !ok(v.face, FACES.length) || !ok(v.shirt, SHIRTS.length)) return null;
    if (v.beard === undefined) {
      // dawniej wąsy (4) i broda (5) były w „Twarzy” — teraz są w „Zaroście”
      const beard = v.face === 4 ? 1 : v.face === 5 ? 2 : 0;
      return { ...(v as Appearance), face: beard ? 0 : v.face!, beard, eyes: 0, skin: null };
    }
    return {
      ...(v as Appearance),
      eyes: ok(v.eyes, EYES.length) ? v.eyes! : 0,
      beard: ok(v.beard, BEARDS.length) ? v.beard! : 0,
      skin: typeof v.skin === 'string' && HEX.test(v.skin) ? v.skin.toLowerCase() : null,
    };
  } catch {
    return null;
  }
}

/** Zapamiętany wygląd postaci z tej przeglądarki (albo losowy). */
export function useStoredAppearance(): [Appearance, (a: Appearance) => void] {
  const [a, setA] = useState<Appearance>({ colorIndex: 0, hat: 0, face: 0, shirt: 1, eyes: 0, beard: 0, skin: null });
  useEffect(() => {
    setA(readStored() ?? randomAppearance());
  }, []);
  const set = (v: Appearance) => {
    setA(v);
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* ignoruj */
    }
  };
  return [a, set];
}

type Tab = 'color' | 'hat' | 'eyes' | 'face' | 'beard' | 'shirt';
const TABS: { id: Tab; label: string }[] = [
  { id: 'color', label: 'Kolor' },
  { id: 'hat', label: 'Czapka' },
  { id: 'eyes', label: 'Oczy' },
  { id: 'face', label: 'Twarz' },
  { id: 'beard', label: 'Zarost' },
  { id: 'shirt', label: 'Strój' },
];

const fold = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

function Chips({ items, value, onPick, label }: { items: readonly string[]; value: number; onPick: (i: number) => void; label: string }) {
  const [q, setQ] = useState('');
  const shown = items.map((name, i) => ({ name, i })).filter((x) => !q || fold(x.name).includes(fold(q)));
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Szukaj (${items.length})…`}
          aria-label={`Szukaj: ${label}`}
          className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-accent"
        />
        <button
          type="button"
          onClick={() => onPick(Math.floor(Math.random() * items.length))}
          className="h-8 shrink-0 rounded-lg bg-white/[.06] px-2.5 text-xs text-white/70 hover:bg-white/[.12]"
          title="Losuj z tej kategorii"
        >
          <Dices size={13} />
        </button>
      </div>
      <div className="scrollbar-thin flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1" role="radiogroup" aria-label={label}>
        {shown.map(({ name, i }) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === i}
            onClick={() => onPick(i)}
            className={cn(
              'h-8 rounded-lg px-2.5 text-xs font-medium transition',
              value === i ? 'bg-accent text-white' : 'bg-white/[.06] text-white/70 hover:bg-white/[.12]',
            )}
          >
            {name}
          </button>
        ))}
        {shown.length === 0 && <span className="py-1 text-xs text-white/40">Nic nie znaleziono.</span>}
      </div>
    </div>
  );
}

/** Kreator wyglądu: kolor, czapka, twarz i strój — z podglądem 3D. */
export function AppearancePicker({
  value,
  onChange,
  taken = [],
  compact,
}: {
  value: Appearance;
  onChange: (a: Appearance) => void;
  /** Kolory zajęte przez innych graczy w pokoju. */
  taken?: number[];
  compact?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('color');
  const can3D = useCan3D();
  return (
    <div className={cn('flex gap-4', compact ? 'flex-row items-start' : 'flex-col sm:flex-row sm:items-start')} data-testid="appearance-picker">
      <div className={cn('relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800 to-ink-950', compact ? 'h-36 w-24' : 'mx-auto h-44 w-32 sm:mx-0')}>
        {can3D ? (
          <AvatarPreview colorIndex={value.colorIndex} skin={value.skin} hat={value.hat} face={value.face} shirt={value.shirt} eyes={value.eyes} beard={value.beard} />
        ) : can3D === false ? (
          <FlatPreview value={value} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-1">
          <div className="grid flex-1 grid-cols-3 gap-0.5 rounded-lg bg-ink-950/60 p-0.5" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn('h-7 flex-1 rounded-md px-1 text-[11px] font-semibold transition', tab === t.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(randomAppearance(taken))}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
            title="Losuj cały wygląd"
          >
            <Dices size={14} /> Losuj
          </button>
        </div>
        {tab === 'color' && (
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Kolor postaci">
            {PLAYER_COLORS.map((c, i) => {
              const isTaken = taken.includes(i) && i !== value.colorIndex;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={!value.skin && value.colorIndex === i}
                  aria-label={`Kolor ${PLAYER_COLOR_NAMES[i]}${isTaken ? ' (zajęty)' : ''}`}
                  title={isTaken ? 'Zajęty przez innego gracza' : PLAYER_COLOR_NAMES[i]}
                  disabled={isTaken}
                  onClick={() => onChange({ ...value, colorIndex: i, skin: null })}
                  className={cn(
                    'relative h-7 rounded-lg border-2 transition disabled:cursor-not-allowed disabled:opacity-25',
                    !value.skin && value.colorIndex === i ? 'scale-105 border-white' : 'border-transparent hover:border-white/40',
                  )}
                  style={{ background: c }}
                >
                  {isTaken && <span className="absolute inset-0 m-auto h-0.5 w-6 rotate-45 bg-ink-950" />}
                </button>
              );
            })}
          </div>
        )}
        {tab === 'color' && <CustomColor value={value.skin} base={PLAYER_COLORS[value.colorIndex]} onCommit={(skin) => onChange({ ...value, skin })} />}
        {tab === 'hat' && <Chips items={HATS} value={value.hat} onPick={(hat) => onChange({ ...value, hat })} label="Nakrycie głowy" />}
        {tab === 'eyes' && <Chips items={EYES} value={value.eyes} onPick={(eyes) => onChange({ ...value, eyes })} label="Oczy" />}
        {tab === 'beard' && <Chips items={BEARDS} value={value.beard} onPick={(beard) => onChange({ ...value, beard })} label="Zarost" />}
        {tab === 'face' && <Chips items={FACES} value={value.face} onPick={(face) => onChange({ ...value, face })} label="Dodatek na twarz" />}
        {tab === 'shirt' && <Chips items={SHIRTS} value={value.shirt} onPick={(shirt) => onChange({ ...value, shirt })} label="Strój" />}
        <p className="mt-2 truncate text-[11px] text-white/40">
          {[HATS[value.hat], EYES[value.eyes], FACES[value.face], BEARDS[value.beard], SHIRTS[value.shirt]].filter((x) => x !== 'Brak' && x !== 'Normalne').join(' · ') || 'Bez dodatków'}
        </p>
      </div>
    </div>
  );
}
