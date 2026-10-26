'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { Crown, Check, Mic, WifiOff, UserPlus } from 'lucide-react';
import { cn } from '@/components/ui/primitives';

/**
 * Nicki są zwykłymi elementami HTML nałożonymi na płótno.
 * Pozycje liczone są co klatkę przez rzutowanie punktów 3D na ekran
 * i zapisywane bezpośrednio w stylu elementu (bez re-renderów Reacta).
 */
export class TagStore {
  anchors = new Map<string, THREE.Object3D>();
  offsets = new Map<string, number>();
  elements = new Map<string, HTMLDivElement>();
  /** Zapamiętane rozmiary etykiet — bez mierzenia DOM w każdej klatce. */
  sizes = new Map<HTMLDivElement, { w: number; h: number }>();
  last = new Map<HTMLDivElement, string>();
  private ro: ResizeObserver | null =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
          for (const e of entries) {
            const el = e.target as HTMLDivElement;
            this.sizes.set(el, { w: el.offsetWidth, h: el.offsetHeight });
          }
        })
      : null;
  setAnchor(key: string, obj: THREE.Object3D | null, offsetY: number) {
    if (obj) {
      this.anchors.set(key, obj);
      this.offsets.set(key, offsetY);
    } else this.anchors.delete(key);
  }
  setElement(key: string, el: HTMLDivElement | null) {
    const prev = this.elements.get(key);
    if (prev && prev !== el) {
      this.ro?.unobserve(prev);
      this.sizes.delete(prev);
      this.last.delete(prev);
    }
    if (el) {
      this.elements.set(key, el);
      if (!this.sizes.has(el)) {
        this.sizes.set(el, { w: el.offsetWidth, h: el.offsetHeight });
        this.ro?.observe(el);
      }
    } else this.elements.delete(key);
  }
}

/** Komponent wewnątrz <Canvas>: rzutuje kotwice nicków na ekran. */
export function TagProjector({ store }: { store: TagStore }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const placed: { el: HTMLDivElement; x: number; y: number; w: number; h: number }[] = [];
    for (const [key, el] of store.elements) {
      const anchor = store.anchors.get(key);
      if (!anchor) {
        if (store.last.get(el) !== 'hidden') {
          el.style.opacity = '0';
          store.last.set(el, 'hidden');
        }
        continue;
      }
      anchor.getWorldPosition(v);
      v.y += store.offsets.get(key) ?? 0;
      v.project(camera);
      const visible = v.z < 1 && v.z > -1;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const box = store.sizes.get(el) ?? { w: 80, h: 24 };
      const w = box.w;
      const h = box.h;
      // Kotwica = dolna krawędź etykiety (chmurka rośnie w górę, nick zostaje na miejscu).
      let y = (-v.y * 0.5 + 0.5) * size.height - h / 2;
      // Unikanie nakładania się: spróbuj pozycji bazowej, potem nad, potem pod.
      const collides = (yy: number) => placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 2 && Math.abs(p.y - yy) < (p.h + h) / 2 + 1);
      if (collides(y)) {
        const options = [y - h - 3, y + h + 3, y - 2 * (h + 3)];
        const free = options.find((yy) => !collides(yy) && yy > 56); // nie pod banerem etapu
        if (free !== undefined) y = free;
      }
      placed.push({ el, x, y, w, h });
      // Zapis do DOM tylko, gdy pozycja faktycznie się zmieniła.
      const sig = `${Math.round(x - w / 2)},${Math.round(y - h / 2)},${visible ? 1 : 0}`;
      if (store.last.get(el) !== sig) {
        store.last.set(el, sig);
        el.style.transform = `translate3d(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px, 0)`;
        el.style.opacity = visible ? '1' : '0';
      }
    }
  });
  return null;
}

export interface TagData {
  key: string;
  kind: 'player' | 'free';
  nickname?: string;
  color?: string;
  isHost?: boolean;
  ready?: boolean;
  connected?: boolean;
  speaking?: boolean;
  isMe?: boolean;
  eliminated?: boolean;
  /** Słowo w chmurce nad nickiem. */
  word?: string | null;
  /** Ikona odgrywanej emotki. */
  emoteIcon?: string | null;
  emoteKey?: number;
}

/** Warstwa HTML z nickami (poza <Canvas>). */
export function TagLayer({ tags, store, compact, tiny }: { tags: TagData[]; store: TagStore; compact: boolean; tiny?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {tags.filter((t) => !(compact && t.kind === 'free')).map((t) => (
        <div
          key={t.key}
          ref={(el) => store.setElement(t.key, el)}
          className="absolute left-0 top-0 opacity-0 transition-opacity duration-300 will-change-transform"
          style={{ zIndex: t.speaking ? 3 : t.kind === 'player' ? 2 : 1 }}
        >
          {t.kind === 'free' ? (
            <div
              className={cn(
                'flex select-none items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-white/15 bg-ink-950/40 font-medium text-white/45',
                compact ? 'px-1.5 py-[2px] text-[9px]' : 'px-2 py-0.5 text-[11px]',
              )}
            >
              <UserPlus size={compact ? 9 : 11} /> Wolne
            </div>
          ) : (
            <div className="flex flex-col items-center">
            {t.emoteIcon && (
              <div key={t.emoteKey} className={cn('mb-1 select-none leading-none drop-shadow-lg animate-pop', tiny ? 'text-lg' : 'text-3xl')} data-testid="emote-icon">
                {t.emoteIcon}
              </div>
            )}
            {t.word && (
              <div
                key={t.word}
                className={cn(
                  'relative mb-1.5 max-w-[170px] select-none truncate rounded-2xl bg-white font-bold text-ink-950 shadow-lg animate-pop',
                  tiny ? 'max-w-[64px] px-1.5 py-0.5 text-[9px]' : compact ? 'max-w-[96px] px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-sm',
                  t.word === '…' && 'font-normal text-ink-950/50',
                )}
                data-testid="bubble"
              >
                {t.word}
                <span className="absolute left-1/2 top-full -ml-1.5 h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-white" />
              </div>
            )}
            <div
              className={cn(
                'flex select-none items-center gap-1 whitespace-nowrap rounded-full border font-semibold shadow-lg backdrop-blur-md transition-[background-color,transform] duration-300',
                tiny ? 'max-w-[58px] gap-0.5 px-1 py-px text-[9px]' : compact ? 'max-w-[78px] px-1.5 py-[2px] text-[10px]' : 'max-w-[160px] px-2.5 py-1 text-[13px]',
                compact && t.isMe && 'ring-1 ring-white/70',
                t.speaking ? 'scale-110 border-white/60 bg-accent/90 text-white' : 'border-white/15 bg-ink-950/75 text-white',
                !t.connected && 'opacity-60',
                t.eliminated && 'opacity-70',
              )}
              style={{ boxShadow: t.speaking ? '0 0 24px rgba(124,92,255,.7)' : undefined }}
              data-testid="nametag"
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
              {t.isHost && !compact && <Crown size={12} className="shrink-0 text-[#ffd43b]" />}
              <span className={cn('truncate', t.eliminated && 'line-through decoration-white/50')}>{t.nickname}</span>
              {t.isMe && !compact && <span className={cn('shrink-0 rounded bg-white/15 px-1 font-bold uppercase text-white/80', compact ? 'text-[8px]' : 'text-[9px]')}>Ty</span>}
              {t.speaking && <Mic size={compact ? 10 : 12} className="shrink-0" />}
              {t.ready && !tiny && <Check size={compact ? 10 : 13} className="shrink-0 text-ok" />}
              {!t.connected && <WifiOff size={compact ? 10 : 12} className="shrink-0 text-[#ff9db0]" />}
            </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
