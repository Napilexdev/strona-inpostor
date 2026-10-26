'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dices } from 'lucide-react';
import { PLAYER_COLORS, PLAYER_COLOR_NAMES } from '@/shared/constants';
import { FACES, HATS, SHIRTS, type Appearance } from '@/shared/types';
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
      <div className="h-10 w-10 rounded-full" style={{ background: PLAYER_COLORS[value.colorIndex] }} />
      <div className="h-12 w-12 rounded-2xl" style={{ background: PLAYER_COLORS[value.colorIndex], opacity: 0.85 }} />
      <span className="text-[9px] leading-tight text-white/40">podgląd 3D niedostępny</span>
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
      return { colorIndex: v.colorIndex!, hat: a === 5 ? 0 : a > 5 ? a - 1 : a, face: a === 5 ? 1 : 0, shirt: 1 };
    }
    if (!ok(v.hat, HATS.length) || !ok(v.face, FACES.length) || !ok(v.shirt, SHIRTS.length)) return null;
    return v as Appearance;
  } catch {
    return null;
  }
}

/** Zapamiętany wygląd postaci z tej przeglądarki (albo losowy). */
export function useStoredAppearance(): [Appearance, (a: Appearance) => void] {
  const [a, setA] = useState<Appearance>({ colorIndex: 0, hat: 0, face: 0, shirt: 1 });
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

type Tab = 'color' | 'hat' | 'face' | 'shirt';
const TABS: { id: Tab; label: string }[] = [
  { id: 'color', label: 'Kolor' },
  { id: 'hat', label: 'Czapka' },
  { id: 'face', label: 'Twarz' },
  { id: 'shirt', label: 'Strój' },
];

function Chips({ items, value, onPick, label }: { items: readonly string[]; value: number; onPick: (i: number) => void; label: string }) {
  return (
    <div className="scrollbar-thin flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1" role="radiogroup" aria-label={label}>
      {items.map((name, i) => (
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
          <AvatarPreview colorIndex={value.colorIndex} hat={value.hat} face={value.face} shirt={value.shirt} />
        ) : can3D === false ? (
          <FlatPreview value={value} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-1">
          <div className="flex flex-1 gap-0.5 rounded-lg bg-ink-950/60 p-0.5" role="tablist">
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
                  aria-checked={value.colorIndex === i}
                  aria-label={`Kolor ${PLAYER_COLOR_NAMES[i]}${isTaken ? ' (zajęty)' : ''}`}
                  title={isTaken ? 'Zajęty przez innego gracza' : PLAYER_COLOR_NAMES[i]}
                  disabled={isTaken}
                  onClick={() => onChange({ ...value, colorIndex: i })}
                  className={cn(
                    'relative h-7 rounded-lg border-2 transition disabled:cursor-not-allowed disabled:opacity-25',
                    value.colorIndex === i ? 'scale-105 border-white' : 'border-transparent hover:border-white/40',
                  )}
                  style={{ background: c }}
                >
                  {isTaken && <span className="absolute inset-0 m-auto h-0.5 w-6 rotate-45 bg-ink-950" />}
                </button>
              );
            })}
          </div>
        )}
        {tab === 'hat' && <Chips items={HATS} value={value.hat} onPick={(hat) => onChange({ ...value, hat })} label="Nakrycie głowy" />}
        {tab === 'face' && <Chips items={FACES} value={value.face} onPick={(face) => onChange({ ...value, face })} label="Dodatek na twarz" />}
        {tab === 'shirt' && <Chips items={SHIRTS} value={value.shirt} onPick={(shirt) => onChange({ ...value, shirt })} label="Strój" />}
        <p className="mt-2 truncate text-[11px] text-white/40">
          {HATS[value.hat]} · {FACES[value.face]} · {SHIRTS[value.shirt]}
        </p>
      </div>
    </div>
  );
}
