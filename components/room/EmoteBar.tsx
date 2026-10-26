'use client';

import { useEffect, useState } from 'react';
import { Smile } from 'lucide-react';
import { cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { request } from '@/lib/socket';
import { EMOTES, type EmoteId } from '@/shared/emotes';

/** Przycisk emotek z panelem wyboru i odliczaniem przerwy (30 s, pilnowane przez serwer). */
export function EmoteBar({ serverNow }: { serverNow: () => number }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [readyAt, setReadyAt] = useState(0);
  const [, tick] = useState(0);
  const left = Math.max(0, Math.ceil((readyAt - serverNow()) / 1000));

  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(id);
  }, [left]);

  async function send(emote: EmoteId) {
    setOpen(false);
    const r = await request<{ nextAt: number }>('player:emote', { emote });
    if (r.ok) setReadyAt(r.data.nextAt);
    else {
      toast(r.error, 'error');
      const m = /za (\d+) s/.exec(r.error);
      if (m) setReadyAt(serverNow() + Number(m[1]) * 1000);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => left <= 0 && setOpen((o) => !o)}
        disabled={left > 0}
        className={cn(
          'flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/75 px-3 py-2 text-xs font-semibold backdrop-blur-xl transition',
          left > 0 ? 'cursor-not-allowed text-white/40' : 'text-white/80 hover:border-accent/60 hover:text-white',
        )}
        aria-expanded={open}
        aria-label={left > 0 ? `Emotki dostępne za ${left} sekund` : 'Emotki'}
        data-testid="emote-btn"
      >
        <Smile size={15} />
        {left > 0 ? <span className="tabular-nums">{left} s</span> : 'Emotki'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-1/2 z-40 mb-2 grid w-[17rem] -translate-x-1/2 grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-ink-850/95 p-2 shadow-2xl backdrop-blur-xl animate-pop"
            role="menu"
            aria-label="Wybierz emotkę"
          >
            {EMOTES.map((e) => (
              <button
                key={e.id}
                role="menuitem"
                onClick={() => send(e.id)}
                className="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                data-testid={`emote-${e.id}`}
              >
                <span className="text-xl leading-none">{e.icon}</span>
                {e.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
