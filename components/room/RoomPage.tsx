'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, Home, Loader2, LogIn, MonitorSmartphone, RotateCcw, X } from 'lucide-react';
import { Button, Countdown, Logo, Panel, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { request } from '@/lib/socket';
import { loadNick, saveNick, type StoredSession } from '@/lib/session';
import { useRoomConnection } from '@/lib/useRoomConnection';
import { PLAYER_COLORS } from '@/shared/constants';
import { nicknameSchema } from '@/shared/schemas';
import type { PublicRoom } from '@/shared/types';
import type { ArenaPlayer } from '@/components/arena/types';
import { buildHelpers, RoomCtx, type RoomCtxValue } from './context';
import { HistoryList } from './HistoryPanel';
import { PhasePanel } from './PhasePanel';
import { RoleRevealOverlay } from './RoleCard';
import { SettingsDrawer } from './SettingsDrawer';
import { TopBar } from './TopBar';
import { HowToPlay } from '@/components/home/HowToPlay';

const Arena = dynamic(() => import('@/components/arena/Arena').then((m) => m.Arena), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-white/40">
      <Loader2 className="animate-spin" />
    </div>
  ),
});

function stageLabel(room: PublicRoom, nick: (id: string | null) => string): string {
  const g = room.game;
  switch (room.phase) {
    case 'lobby':
      return 'Oczekiwanie na graczy';
    case 'roles':
      return 'Rozdawanie ról';
    case 'clues':
      return `Runda ${g?.round} · Teraz mówi: ${nick(g?.currentTurnPlayerId ?? null)}`;
    case 'continuation-vote':
      return `Kolejna runda czy głosowanie? · ${g?.votesCast}/${g?.votesNeeded}`;
    case 'discussion':
      return 'Dyskusja';
    case 'elimination-vote':
      return `${g?.isTieBreak ? 'Dogrywka' : 'Głosowanie na impostora'} · ${g?.votesCast}/${g?.votesNeeded}`;
    case 'reveal':
      return 'Wynik głosowania';
    case 'last-guess':
      return 'Ostatnia próba impostora';
    case 'ended':
      return 'Koniec gry';
  }
}

export function RoomPage({ code }: { code: string }) {
  const router = useRouter();
  const toast = useToast();
  const conn = useRoomConnection(code);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const { payload } = conn;

  const act = useCallback(
    async (event: string, data: unknown = {}) => {
      const r = await request(event, data);
      if (!r.ok) toast(r.error, 'error');
      return r.ok;
    },
    [toast],
  );

  const ctx = useMemo<RoomCtxValue | null>(() => {
    if (!payload) return null;
    const h = buildHelpers(payload.room);
    const me = payload.room.players.find((p) => p.id === payload.self.playerId);
    return {
      room: payload.room,
      self: payload.self,
      me,
      isHost: payload.room.hostId === payload.self.playerId,
      ...h,
      act,
      serverNow: conn.serverNow,
      openSettings: () => setSettingsOpen(true),
      openHistory: () => setHistoryOpen(true),
    };
  }, [payload, act, conn.serverNow]);

  const arenaProps = useMemo(() => {
    const room = payload?.room;
    const players: ArenaPlayer[] =
      room?.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        color: PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length],
        seat: p.seat,
        isHost: p.isHost,
        ready: p.ready || p.isHost,
        connected: p.connected,
        eliminated: p.eliminated,
        isMe: p.id === payload?.self.playerId,
      })) ?? [];
    const result = room?.game?.result;
    const winners =
      room?.phase === 'ended' && result?.winner
        ? new Set(result.roles.filter((r) => (result.winner === 'crew' ? r.role === 'crewmate' : r.role === 'impostor')).map((r) => r.playerId))
        : null;
    const revealedImpostors = new Set<string>([
      ...players.filter((p) => p.eliminated).map((p) => p.id),
      ...(room?.phase === 'ended' && result ? result.roles.filter((r) => r.role === 'impostor').map((r) => r.playerId) : []),
    ]);
    return {
      maxPlayers: room?.settings.maxPlayers ?? 6,
      players,
      phase: room?.phase ?? 'lobby',
      activeId: room?.game?.currentTurnPlayerId ?? null,
      reveal: room?.game?.reveal ? { playerId: room.game.reveal.playerId, role: room.game.reveal.role } : null,
      winners,
      showReady: room?.phase === 'lobby' || room?.phase === 'ended',
      revealedImpostors,
    };
  }, [payload]);

  async function leave() {
    await conn.leave();
    router.push('/');
  }

  if (conn.status === 'kicked' || conn.status === 'closed' || conn.status === 'replaced') {
    return (
      <main className="bg-stage grid min-h-dvh place-items-center p-6">
        <Panel className="max-w-md p-7 text-center">
          <div className="mb-3 flex justify-center">
            {conn.status === 'replaced' ? <MonitorSmartphone size={36} className="text-accent-soft" /> : <Logo />}
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold">
            {conn.status === 'kicked' ? 'Zostałeś usunięty z pokoju' : conn.status === 'closed' ? 'Pokój nie istnieje' : 'Gra otwarta gdzie indziej'}
          </h1>
          <p className="mb-6 text-white/65">{conn.message}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {conn.status === 'replaced' && (
              <Button onClick={conn.reclaim} icon={<LogIn size={17} />}>
                Graj w tej karcie
              </Button>
            )}
            <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/[.07] px-4 font-semibold hover:bg-white/[.12]">
              <Home size={17} /> Strona główna
            </Link>
          </div>
        </Panel>
      </main>
    );
  }

  return (
    <div className="bg-stage flex h-dvh flex-col overflow-hidden">
      {ctx ? (
        <RoomCtx.Provider value={ctx}>
          <TopBar
            code={code}
            occupied={ctx.room.players.length}
            limit={ctx.room.settings.maxPlayers}
            conn={conn.conn}
            isHost={ctx.isHost}
            onSettings={() => setSettingsOpen(true)}
            onLeave={leave}
            inGame={ctx.room.phase !== 'lobby' && ctx.room.phase !== 'ended'}
          />
          <main className="flex min-h-0 flex-1">
            <section className="flex min-w-0 flex-1 flex-col">
              <div className="relative min-h-[240px] flex-1">
                <Arena {...arenaProps} showQualityToggle />
                <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
                  <div
                    className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-ink-950/70 px-4 py-1.5 text-sm font-semibold shadow-lg backdrop-blur-xl animate-fade-up"
                    data-testid="stage-banner"
                    key={ctx.room.phase + (ctx.room.game?.currentTurnPlayerId ?? '')}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', ctx.room.phase === 'lobby' ? 'bg-[#ffd43b]' : 'bg-accent animate-pulse')} />
                    <span className="truncate">{stageLabel(ctx.room, ctx.nick)}</span>
                    {ctx.room.game?.deadline && <Countdown deadline={ctx.room.game.deadline} serverNow={conn.serverNow} className="!py-0 text-xs" />}
                  </div>
                </div>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/75 px-3 py-2 text-xs font-semibold backdrop-blur-xl lg:hidden"
                  aria-label="Pokaż historię skojarzeń"
                >
                  <History size={15} /> Historia
                  {!!ctx.room.game?.clues.length && <span className="rounded-full bg-accent px-1.5 text-[10px]">{ctx.room.game.clues.length}</span>}
                </button>
                <button onClick={() => setHowOpen(true)} className="absolute bottom-3 left-3 z-20 rounded-full border border-white/10 bg-ink-950/75 px-3 py-2 text-xs font-semibold text-white/70 backdrop-blur-xl hover:text-white">
                  Jak grać?
                </button>
              </div>
              <div className="relative z-10 shrink-0 border-t border-white/[.06] bg-ink-900/90 backdrop-blur-xl">
                <div className="scrollbar-thin mx-auto max-h-[52dvh] max-w-4xl overflow-y-auto px-4 py-4 sm:px-6 lg:max-h-[46dvh]">
                  <PhasePanel />
                </div>
              </div>
            </section>
            <aside className="hidden w-80 shrink-0 flex-col border-l border-white/[.06] bg-ink-950/60 lg:flex xl:w-96" aria-label="Historia skojarzeń">
              <h2 className="flex items-center gap-2 border-b border-white/[.06] px-5 py-3.5 font-display font-bold">
                <History size={18} className="text-accent-soft" /> Historia skojarzeń
              </h2>
              <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
                <HistoryList />
              </div>
            </aside>
          </main>
          <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <RoleRevealOverlay />
          {historyOpen && (
            <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Historia skojarzeń">
              <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
              <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-850 p-4 pb-8 animate-fade-up">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                    <History size={18} className="text-accent-soft" /> Historia skojarzeń
                  </h2>
                  <button onClick={() => setHistoryOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10" aria-label="Zamknij historię">
                    <X size={20} />
                  </button>
                </div>
                <HistoryList />
              </div>
            </div>
          )}
        </RoomCtx.Provider>
      ) : (
        <>
          <header className="flex h-14 shrink-0 items-center border-b border-white/[.06] px-4">
            <Logo size="sm" />
          </header>
          <div className="relative flex-1">
            <Arena {...arenaProps} />
            {conn.status === 'need-join' ? (
              <JoinDialog code={code} initialError={conn.message} onJoin={conn.join} remembered={conn.remembered} onRejoin={conn.rejoin} />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex items-center gap-2 rounded-full bg-ink-950/80 px-4 py-2 text-sm text-white/70">
                  <Loader2 size={16} className="animate-spin" /> Łączenie z pokojem {code}…
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <HowToPlay open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
}

function JoinDialog({
  code,
  initialError,
  onJoin,
  remembered,
  onRejoin,
}: {
  code: string;
  initialError: string | null;
  onJoin: (nick: string) => Promise<{ ok: boolean; error?: string }>;
  remembered: StoredSession | null;
  onRejoin: () => Promise<void>;
}) {
  const [nick, setNick] = useState(() => (typeof window !== 'undefined' ? loadNick() : ''));
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = nicknameSchema.safeParse(nick);
    if (!n.success) return setError(n.error.issues[0].message);
    setBusy(true);
    const r = await onJoin(n.data);
    setBusy(false);
    if (!r.ok) setError((r as { error: string }).error);
    else saveNick(n.data);
  }
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-ink-950/50 p-4 backdrop-blur-sm">
      <Panel className="w-full max-w-sm p-6 animate-pop">
        <p className="text-sm text-white/55">Zaproszenie do pokoju</p>
        <h1 className="mb-4 font-mono text-3xl font-bold tracking-[.25em]">{code}</h1>
        {remembered && (
          <div className="mb-4">
            <Button size="lg" className="w-full" onClick={onRejoin} icon={<RotateCcw size={18} />} data-testid="rejoin-btn">
              Wróć do gry{remembered.nickname ? ` jako ${remembered.nickname}` : ''}
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-widest text-white/35">
              <span className="h-px flex-1 bg-white/10" /> lub dołącz jako nowy gracz <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <label htmlFor="join-nick" className="mb-1.5 block text-sm font-medium text-white/70">
            Twój nick
          </label>
          <input
            id="join-nick"
            autoFocus
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={16}
            placeholder="np. Kasia"
            className="mb-3 h-12 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          {error && (
            <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-[#ff9db0]">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" variant={remembered ? 'secondary' : 'primary'} className="w-full" loading={busy} icon={<LogIn size={18} />}>
            Dołącz do gry
          </Button>
        </form>
        <Link href="/" className="mt-3 block text-center text-sm text-white/50 hover:text-white">
          Wróć na stronę główną
        </Link>
      </Panel>
    </div>
  );
}
