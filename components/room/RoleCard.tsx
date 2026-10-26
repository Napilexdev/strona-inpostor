'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { Button, cn } from '@/components/ui/primitives';
import { CATEGORY_LABELS } from '@/shared/types';
import { useRoom } from './context';

/** Prywatna karta roli wyświetlana po rozdaniu ról. */
export function RoleRevealOverlay() {
  const { room, self, me, act } = useRoom();
  const [busy, setBusy] = useState(false);
  if (room.phase !== 'roles' || !self.role || !me || me.acknowledged) return null;
  const imp = self.role === 'impostor';
  const acked = room.players.filter((p) => p.acknowledged).length;
  const total = room.players.filter((p) => p.inGame).length;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="role-title">
      <div style={{ perspective: '900px' }} className="w-full max-w-sm">
        <div
          className={cn(
            'animate-role-flip rounded-[1.75rem] border p-7 text-center shadow-2xl',
            imp ? 'border-danger/40 bg-gradient-to-b from-[#3a0f1f] to-ink-850' : 'border-accent/40 bg-gradient-to-b from-[#221a4d] to-ink-850',
          )}
          data-testid="role-card"
        >
          <div className={cn('mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl', imp ? 'bg-danger/20 text-danger' : 'bg-accent/20 text-accent-soft')}>
            {imp ? <ShieldAlert size={34} /> : <KeyRound size={34} />}
          </div>
          {imp ? (
            <>
              <h2 id="role-title" className="font-display text-3xl font-bold tracking-tight text-[#ff8da1]">
                Jesteś IMPOSTOREM
              </h2>
              <p className="mt-3 text-white/75">Nie znasz tajnego hasła. Słuchaj innych i nie zdradź się!</p>
              <p className="mt-2 text-sm text-white/45">Kategoria: {CATEGORY_LABELS[room.settings.category]}</p>
            </>
          ) : (
            <>
              <h2 id="role-title" className="font-display text-2xl font-bold tracking-tight">
                Jesteś zwykłym graczem
              </h2>
              <p className="mt-4 text-sm uppercase tracking-widest text-white/50">Tajne hasło:</p>
              <p className="mt-1 break-words font-display text-4xl font-bold text-white" data-testid="secret-word">
                {self.word}
              </p>
              <p className="mt-3 text-sm text-white/55">Podawaj skojarzenia, ale nie zdradzaj hasła impostorowi.</p>
            </>
          )}
          <Button
            className="mt-6 w-full"
            size="lg"
            variant={imp ? 'danger' : 'primary'}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await act('game:ack-role');
              setBusy(false);
            }}
          >
            Rozumiem
          </Button>
          <p className="mt-3 text-xs text-white/40">
            Potwierdziło: {acked}/{total}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Dyskretne przypomnienie roli (domyślnie ukryte przed podglądaczami). */
export function RoleChip() {
  const { self, room } = useRoom();
  const [show, setShow] = useState(false);
  if (!self.role || room.phase === 'lobby' || room.phase === 'ended') return null;
  const imp = self.role === 'impostor';
  return (
    <button
      onClick={() => setShow((s) => !s)}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition',
        show ? (imp ? 'border-danger/40 bg-danger/15 text-[#ff9db0]' : 'border-accent/40 bg-accent/15 text-accent-soft') : 'border-white/10 bg-white/[.05] text-white/60 hover:text-white',
      )}
      aria-pressed={show}
      data-testid="role-chip"
    >
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
      {show ? (imp ? 'Jesteś impostorem' : `Hasło: ${self.word}`) : 'Pokaż moją rolę'}
    </button>
  );
}
