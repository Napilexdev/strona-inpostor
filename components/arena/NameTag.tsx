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
  setAnchor(key: string, obj: THREE.Object3D | null, offsetY: number) {
    if (obj) {
      this.anchors.set(key, obj);
      this.offsets.set(key, offsetY);
    } else this.anchors.delete(key);
  }
  setElement(key: string, el: HTMLDivElement | null) {
    if (el) this.elements.set(key, el);
    else this.elements.delete(key);
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
        el.style.opacity = '0';
        continue;
      }
      anchor.getWorldPosition(v);
      v.y += store.offsets.get(key) ?? 0;
      v.project(camera);
      const visible = v.z < 1 && v.z > -1;
      const x = (v.x * 0.5 + 0.5) * size.width;
      let y = (-v.y * 0.5 + 0.5) * size.height;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // Unikanie nakładania się: spróbuj pozycji bazowej, potem nad, potem pod.
      const collides = (yy: number) => placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 2 && Math.abs(p.y - yy) < (p.h + h) / 2 + 1);
      if (collides(y)) {
        const options = [y - h - 3, y + h + 3, y - 2 * (h + 3)];
        const free = options.find((yy) => !collides(yy) && yy > 56); // nie pod banerem etapu
        if (free !== undefined) y = free;
      }
      placed.push({ el, x, y, w, h });
      el.style.transform = `translate3d(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px, 0)`;
      el.style.opacity = visible ? '1' : '0';
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
          )}
        </div>
      ))}
    </div>
  );
}
