'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dices } from 'lucide-react';
import { PLAYER_COLORS, PLAYER_COLOR_NAMES } from '@/shared/constants';
import { ACCESSORIES, type Appearance } from '@/shared/types';
import { cn } from './primitives';

const AvatarPreview = dynamic(() => import('@/components/arena/AvatarPreview'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-white/[.04]" />,
});

const KEY = 'impostor:appearance';

export function randomAppearance(): Appearance {
  return { colorIndex: Math.floor(Math.random() * PLAYER_COLORS.length), accessory: Math.floor(Math.random() * ACCESSORIES.length) };
}

/** Zapamiętany wygląd postaci z tej przeglądarki (albo losowy). */
export function useStoredAppearance(): [Appearance, (a: Appearance) => void] {
  const [a, setA] = useState<Appearance>({ colorIndex: 0, accessory: 0 });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw) as Appearance;
        if (Number.isInteger(v.colorIndex) && Number.isInteger(v.accessory)) return setA(v);
      }
    } catch {
      /* ignoruj */
    }
    setA(randomAppearance());
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

/** Kreator wyglądu: kolor + dodatek, z podglądem 3D. */
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
  return (
    <div className={cn('flex gap-4', compact ? 'flex-row items-start' : 'flex-col sm:flex-row sm:items-start')} data-testid="appearance-picker">
      <div className={cn('relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800 to-ink-950', compact ? 'h-32 w-24' : 'mx-auto h-40 w-32 sm:mx-0')}>
        <AvatarPreview colorIndex={value.colorIndex} accessory={value.accessory} />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Kolor</span>
            <button
              type="button"
              onClick={() => {
                const free = PLAYER_COLORS.map((_, i) => i).filter((i) => !taken.includes(i));
                const c = free[Math.floor(Math.random() * free.length)] ?? 0;
                onChange({ colorIndex: c, accessory: Math.floor(Math.random() * ACCESSORIES.length) });
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Dices size={14} /> Losuj
            </button>
          </div>
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
                    'relative h-8 rounded-lg border-2 transition disabled:cursor-not-allowed disabled:opacity-25',
                    value.colorIndex === i ? 'scale-105 border-white' : 'border-transparent hover:border-white/40',
                  )}
                  style={{ background: c }}
                >
                  {isTaken && <span className="absolute inset-0 m-auto h-0.5 w-7 rotate-45 bg-ink-950" />}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">Dodatek</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Dodatek do postaci">
            {ACCESSORIES.map((name, i) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={value.accessory === i}
                onClick={() => onChange({ ...value, accessory: i })}
                className={cn(
                  'h-8 rounded-lg px-2.5 text-xs font-medium transition',
                  value.accessory === i ? 'bg-accent text-white' : 'bg-white/[.06] text-white/70 hover:bg-white/[.12]',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
