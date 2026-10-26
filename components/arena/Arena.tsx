'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AlertTriangle, Crown, Mic, WifiOff } from 'lucide-react';
import { cn } from '@/components/ui/primitives';
import { Scene } from './Scene';
import { TagLayer, TagStore, type TagData } from './NameTag';
import type { ArenaProps } from './types';

export function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

function detectQuality(): 'high' | 'low' {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || small || weak ? 'low' : 'high';
}

/** Ogranicznik klatek dla słabszych urządzeń (oszczędza baterię telefonu). */
function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (t - last >= 1000 / fps - 2) {
        last = t;
        invalidate();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fps, invalidate]);
  return null;
}

class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('Błąd renderowania sceny 3D:', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Arena(props: ArenaProps & { revealedImpostors?: Set<string>; className?: string }) {
  const [support, setSupport] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const revealed = useMemo(() => props.revealedImpostors ?? new Set<string>(), [props.revealedImpostors]);
  const store = useMemo(() => new TagStore(), []);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [support]);
  const compact = width < 760 || (props.maxPlayers >= 11 && width < 900);
  const tiny = width / props.maxPlayers < 48;
  const tags: TagData[] = useMemo(() => {
    const bySeat = new Set(props.players.map((p) => p.seat));
    const list: TagData[] = [];
    for (let seat = 0; seat < props.maxPlayers; seat++) if (!bySeat.has(seat)) list.push({ key: `seat-${seat}`, kind: 'free' });
    for (const p of props.players)
      list.push({
        key: p.id,
        kind: 'player',
        nickname: p.nickname,
        color: p.color,
        isHost: p.isHost,
        ready: props.showReady && p.ready,
        connected: p.connected,
        speaking: props.phase === 'clues' && p.id === props.activeId,
        isMe: p.isMe,
        eliminated: p.eliminated,
      });
    return list;
  }, [props.players, props.maxPlayers, props.showReady, props.phase, props.activeId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('webgl') === '0';
    setSupport(!forced && detectWebGL() ? 'yes' : 'no');
    // ?quality=low|high — wymuszenie jakości (zapamiętywane w tej przeglądarce).
    let stored: string | null = null;
    try {
      const q = params.get('quality');
      if (q === 'low' || q === 'high') localStorage.setItem('impostor:quality', q);
      stored = localStorage.getItem('impostor:quality');
    } catch {
      /* brak dostępu do localStorage */
    }
    setQuality(props.quality ?? (stored === 'low' || stored === 'high' ? stored : detectQuality()));
  }, [props.quality]);

  const fallback = <FallbackArena {...props} />;
  return (
    <div ref={wrap} className={cn('relative h-full w-full', props.className)} data-testid="arena" data-podiums={props.maxPlayers}>
      {support === 'no' && fallback}
      {support === 'yes' && (
        <CanvasBoundary fallback={fallback}>
          <Canvas
            shadows={quality === 'high' ? { type: THREE.PCFSoftShadowMap } : false}
            dpr={quality === 'high' ? [1, 2] : [1, 1.5]}
            frameloop={quality === 'high' ? 'always' : 'demand'}
            camera={{ fov: 38, near: 0.1, far: 120, position: [0, 6, 18] }}
            gl={{ antialias: quality === 'high', powerPreference: 'high-performance', alpha: false }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
            }}
            aria-label="Arena 3D z podestami graczy"
          >
            {quality === 'low' && <FrameLimiter fps={30} />}
            <Scene {...props} quality={quality} revealedImpostors={revealed} tags={store} />
          </Canvas>
          <TagLayer tags={tags} store={store} compact={compact} tiny={tiny} />
        </CanvasBoundary>
      )}
    </div>
  );
}

/** Uproszczony widok, gdy WebGL jest niedostępny. */
export function FallbackArena({ maxPlayers, players, activeId, phase, showReady }: ArenaProps) {
  const bySeat = new Map(players.map((p) => [p.seat, p]));
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-auto p-4" data-testid="arena-fallback">
      <p className="flex max-w-md items-center gap-2 rounded-xl border border-[#ffd43b]/30 bg-[#ffd43b]/10 px-3 py-2 text-center text-xs text-[#ffe58a]">
        <AlertTriangle size={16} className="shrink-0" />
        Twoja przeglądarka nie obsługuje WebGL — wyświetlamy uproszczony widok areny. Gra działa normalnie.
      </p>
      <div className="flex max-w-3xl flex-wrap items-end justify-center gap-3">
        {Array.from({ length: maxPlayers }, (_, seat) => {
          const p = bySeat.get(seat);
          const active = phase === 'clues' && p && p.id === activeId;
          return (
            <div key={seat} className="flex w-20 flex-col items-center gap-1.5">
              {p ? (
                <>
                  <div
                    className={cn('grid h-12 w-12 place-items-center rounded-full border-2 text-lg font-bold text-ink-950 transition', active && 'scale-110 animate-glow', (p.eliminated || !p.connected) && 'opacity-40')}
                    style={{ background: p.color, borderColor: active ? '#fff' : 'transparent' }}
                  >
                    {p.nickname.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex max-w-full items-center gap-1 truncate text-xs font-semibold">
                    {p.isHost && <Crown size={11} className="text-[#ffd43b]" />}
                    <span className="truncate">{p.nickname}</span>
                    {active && <Mic size={11} />}
                    {!p.connected && <WifiOff size={11} className="text-[#ff9db0]" />}
                  </div>
                  {showReady && <span className={cn('text-[10px]', p.ready ? 'text-ok' : 'text-white/40')}>{p.ready ? 'gotowy' : 'czeka'}</span>}
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full border-2 border-dashed border-white/15" />
                  <span className="text-xs text-white/35">Wolne</span>
                </>
              )}
              <div className={cn('h-6 w-16 rounded-md border border-white/10 bg-ink-800', active && 'border-accent bg-accent/20')} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
