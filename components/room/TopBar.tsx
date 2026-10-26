'use client';

import { useState } from 'react';
import { Copy, LogOut, Settings2, Users, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button, Logo, Modal, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import type { ConnStatus } from '@/lib/useRoomConnection';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function TopBar({
  code,
  occupied,
  limit,
  conn,
  isHost,
  onSettings,
  onLeave,
  inGame,
}: {
  code: string;
  occupied: number;
  limit: number;
  conn: ConnStatus;
  isHost: boolean;
  onSettings: () => void;
  onLeave: () => void;
  inGame: boolean;
}) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const connInfo = {
    connected: { label: 'Połączono', icon: <Wifi size={14} />, cls: 'text-ok bg-ok/10 border-ok/20' },
    reconnecting: { label: 'Łączenie…', icon: <Loader2 size={14} className="animate-spin" />, cls: 'text-[#ffd43b] bg-[#ffd43b]/10 border-[#ffd43b]/20' },
    offline: { label: 'Brak połączenia', icon: <WifiOff size={14} />, cls: 'text-[#ff9db0] bg-danger/10 border-danger/25' },
  }[conn];

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-white/[.06] bg-ink-950/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-5">
      <div className="hidden sm:block">
        <Logo size="sm" />
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.04] py-1 pl-3 pr-1">
        <span className="hidden text-xs text-white/50 sm:inline">Kod:</span>
        <span className="font-mono text-[15px] font-bold tracking-[.2em]" data-testid="room-code">
          {code}
        </span>
        <button
          onClick={async () => toast((await copyText(code)) ? 'Skopiowano kod pokoju' : 'Nie udało się skopiować', 'success')}
          className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Kopiuj kod pokoju"
          title="Kopiuj kod"
        >
          <Copy size={15} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-2.5 py-1.5 text-sm font-semibold tabular-nums" title="Zajęte miejsca" data-testid="seat-count">
        <Users size={15} className="text-white/55" />
        {occupied}/{limit}
      </div>
      <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', connInfo.cls)} role="status" aria-live="polite">
        {connInfo.icon}
        <span className="hidden md:inline">{connInfo.label}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onSettings} icon={<Settings2 size={17} />} aria-label="Ustawienia pokoju">
          <span className="hidden md:inline">{isHost ? 'Ustawienia' : 'Zasady pokoju'}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} icon={<LogOut size={17} />} aria-label="Opuść pokój">
          <span className="hidden md:inline">Opuść</span>
        </Button>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Opuścić pokój?">
        <p className="mb-5 text-white/70">
          {inGame ? 'Gra jest w toku. Jeśli wyjdziesz, stracisz miejsce w rozgrywce.' : 'Twoje miejsce zostanie zwolnione.'}
          {isHost && ' Rola hosta przejdzie na kolejnego gracza.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Zostań
          </Button>
          <Button variant="danger" onClick={onLeave} icon={<LogOut size={16} />}>
            Opuść pokój
          </Button>
        </div>
      </Modal>
    </header>
  );
}
