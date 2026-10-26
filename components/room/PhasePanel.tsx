'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Crown,
  Gavel,
  History,
  Hourglass,
  KeyRound,
  Link2,
  MessageCircle,
  Play,
  RotateCcw,
  Send,
  Settings2,
  Shirt,
  ShieldAlert,
  Star,
  Skull,
  Trophy,
  UserX,
  Users,
  WifiOff,
} from 'lucide-react';
import { Button, Countdown, Modal, cn } from '@/components/ui/primitives';
import { AppearancePicker } from '@/components/ui/AppearancePicker';
import { useToast } from '@/components/ui/toast';
import { CLUE_MAX, MIN_PLAYERS, PLAYER_COLORS } from '@/shared/constants';
import { CATEGORY_LABELS } from '@/shared/types';
import { useRoom } from './context';
import { HistoryList, VoteLine } from './HistoryPanel';
import { RoleChip } from './RoleCard';
import { copyText } from './TopBar';

function Heading({ icon, title, right, sub }: { icon: React.ReactNode; title: string; right?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight sm:text-xl">
          <span className="text-accent-soft">{icon}</span>
          {title}
        </h2>
        {sub && <div className="mt-0.5 text-sm text-white/55">{sub}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mt-3" aria-label={label}>
      <div className="mb-1 flex justify-between text-xs text-white/55">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-white/80" data-testid="vote-progress">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[.07]">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#b197fc] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ───────────────────────────── poczekalnia ─────────────────────────────

function LobbyPanel() {
  const { room, me, isHost, act, openSettings } = useRoom();
  const toast = useToast();
  const players = room.players;
  const nonHost = players.filter((p) => !p.isHost);
  const readyCount = players.filter((p) => p.isHost || p.ready).length;
  const reasons: string[] = [];
  if (players.length < MIN_PLAYERS) reasons.push(`Potrzeba co najmniej ${MIN_PLAYERS} graczy (jest ${players.length}).`);
  if (nonHost.some((p) => !p.ready)) reasons.push('Nie wszyscy gracze są gotowi.');
  if (players.some((p) => !p.connected)) reasons.push('Ktoś stracił połączenie.');
  if (room.settings.impostorCount === 2 && players.length < 5) reasons.push('Dwóch impostorów wymaga co najmniej 5 graczy.');

  async function invite() {
    const link = `${window.location.origin}/room/${room.code}`;
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'IMPOSTOR', text: `Dołącz do mojej gry IMPOSTOR! Kod: ${room.code}`, url: link });
        return;
      } catch {
        /* anulowano */
      }
    }
    toast((await copyText(link)) ? 'Skopiowano link zaproszenia' : link, 'success');
  }

  return (
    <div data-testid="lobby-panel">
      <Heading
        icon={<Hourglass size={20} />}
        title="Oczekiwanie na graczy"
        sub={
          <>
            W pokoju: <b className="text-white/85">{players.length}</b> z {room.settings.maxPlayers} miejsc · gotowi: <b className="text-white/85">{readyCount}</b>/{players.length}
          </>
        }
        right={
          <Button variant="secondary" size="sm" onClick={invite} icon={<Link2 size={15} />}>
            Zaproś znajomych
          </Button>
        }
      />
      <ul className="mb-4 grid gap-1.5 sm:grid-cols-2" aria-label="Gracze w pokoju">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/[.04] px-3 py-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorOfIndex(p.colorIndex) }} />
            <span className="truncate font-medium">{p.nickname}</span>
            {p.id === me?.id && <span className="rounded bg-white/10 px-1 text-[10px] font-bold uppercase text-white/70">Ty</span>}
            {p.isHost && <Crown size={14} className="shrink-0 text-[#ffd43b]" aria-label="Host" />}
            {!p.connected && <WifiOff size={14} className="shrink-0 text-[#ff9db0]" aria-label="Rozłączony" />}
            <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-md bg-white/[.06] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#ffd43b]" title="Punkty">
              <Star size={11} /> {p.score}
            </span>
            <span className={cn('shrink-0 text-xs font-semibold', p.isHost || p.ready ? 'text-ok' : 'text-white/40')}>
              {p.isHost ? 'host' : p.ready ? 'gotowy' : 'nie gotowy'}
            </span>
            {isHost && p.id !== me?.id && (
              <span className="flex shrink-0">
                <button className="rounded-md p-1 text-white/45 hover:bg-white/10 hover:text-[#ffd43b]" title="Przekaż hosta" aria-label={`Przekaż hosta: ${p.nickname}`} onClick={() => act('lobby:transfer-host', { playerId: p.id })}>
                  <Crown size={15} />
                </button>
                <button className="rounded-md p-1 text-white/45 hover:bg-danger/20 hover:text-danger" title="Usuń z pokoju" aria-label={`Usuń gracza ${p.nickname}`} onClick={() => act('lobby:kick', { playerId: p.id })}>
                  <UserX size={15} />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        {!isHost && me && (
          <Button
            variant={me.ready ? 'success' : 'primary'}
            size="lg"
            className="min-w-[10rem] flex-1 sm:flex-none"
            onClick={() => act('lobby:ready', { ready: !me.ready })}
            icon={me.ready ? <CheckCircle2 size={18} /> : <Check size={18} />}
            aria-pressed={me.ready}
            data-testid="ready-btn"
          >
            {me.ready ? 'Gotowy!' : 'Gotowy'}
          </Button>
        )}
        {isHost && (
          <>
            <Button size="lg" className="min-w-[12rem] flex-1 sm:flex-none" disabled={reasons.length > 0} onClick={() => act('game:start')} icon={<Play size={18} />} data-testid="start-btn">
              Rozpocznij grę
            </Button>
            <Button variant="secondary" size="lg" onClick={openSettings} icon={<Settings2 size={18} />}>
              Ustawienia
            </Button>
          </>
        )}
        <AppearanceButton />
        {isHost && players.some((p) => p.score > 0) && (
          <Button variant="ghost" size="sm" onClick={() => act('lobby:reset-scores')} icon={<Star size={15} />}>
            Wyzeruj punkty
          </Button>
        )}
      </div>
      {isHost && reasons.length > 0 && <p className="mt-2 text-xs text-white/50">{reasons[0]}</p>}
      {!isHost && <p className="mt-2 text-xs text-white/45">Grę rozpoczyna host, gdy wszyscy są gotowi.</p>}
    </div>
  );
}

const colorOfIndex = (i: number) => PLAYER_COLORS[i % PLAYER_COLORS.length];

/** Przycisk + okno zmiany wyglądu postaci (w poczekalni i po grze). */
function AppearanceButton() {
  const { room, me, act } = useRoom();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  const taken = room.players.filter((p) => p.id !== me.id).map((p) => p.colorIndex);
  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)} icon={<Shirt size={18} />} data-testid="appearance-btn">
        Wygląd
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Wygląd postaci" labelledBy="appearance-title">
        <AppearancePicker
          value={{ colorIndex: me.colorIndex, hat: me.hat, face: me.face, shirt: me.shirt }}
          taken={taken}
          onChange={(a) => {
            const patch: Record<string, number> = {};
            if (a.colorIndex !== me.colorIndex) patch.colorIndex = a.colorIndex;
            for (const k of ['hat', 'face', 'shirt'] as const) if (a[k] !== me[k]) patch[k] = a[k];
            if (Object.keys(patch).length) void act('lobby:update-appearance', patch);
            try {
              localStorage.setItem('impostor:appearance', JSON.stringify(a));
            } catch {
              /* ignoruj */
            }
          }}
        />
        <p className="mt-3 text-xs text-white/45">Zmiany widać od razu na arenie u wszystkich graczy.</p>
      </Modal>
    </>
  );
}

// ───────────────────────────── ROLE ─────────────────────────────

function RolesPanel() {
  const { room, serverNow } = useRoom();
  const inGame = room.players.filter((p) => p.inGame);
  const acked = inGame.filter((p) => p.acknowledged).length;
  return (
    <div>
      <Heading icon={<KeyRound size={20} />} title="Rozdawanie ról" right={<Countdown deadline={room.game?.deadline} serverNow={serverNow} />} />
      <p className="text-sm text-white/65">Każdy widzi tylko swoją kartę. Gdy wszyscy potwierdzą, zaczyna się pierwsza runda skojarzeń.</p>
      <Progress value={acked} max={inGame.length} label="Potwierdzone role" />
    </div>
  );
}

// ───────────────────────────── SKOJARZENIA ─────────────────────────────

function CluesPanel() {
  const { room, self, me, nick, color, act, serverNow } = useRoom();
  const g = room.game!;
  const current = g.currentTurnPlayerId;
  const myTurn = current === self.playerId;
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const done = g.turnIndex;
  const waiting = g.turnOrder.length - g.turnIndex - (current ? 1 : 0);

  useEffect(() => {
    if (myTurn) {
      setWord('');
      setTimeout(() => input.current?.focus(), 50);
    }
  }, [myTurn, g.round]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    setBusy(true);
    const ok = await act('game:submit-clue', { word });
    setBusy(false);
    if (ok) setWord('');
  }

  return (
    <div data-testid="clues-panel">
      <Heading
        icon={<MessageCircle size={20} />}
        title={`Runda ${g.round}`}
        sub={
          <>
            Teraz mówi: <b className="text-white" data-testid="current-speaker">{nick(current)}</b>
          </>
        }
        right={
          <>
            <RoleChip />
            <Countdown deadline={g.deadline} serverNow={serverNow} />
          </>
        }
      />
      <ol className="mb-3 flex flex-wrap gap-1.5" aria-label="Kolejność wypowiedzi">
        {g.turnOrder.map((id, i) => (
          <li
            key={id}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
              i < g.turnIndex && 'border-white/5 bg-white/[.03] text-white/40',
              i === g.turnIndex && 'border-accent bg-accent/20 text-white animate-glow',
              i > g.turnIndex && 'border-white/10 text-white/70',
            )}
          >
            <span className="text-[10px] text-white/40">{i + 1}.</span>
            <span className="h-2 w-2 rounded-full" style={{ background: color(id) }} />
            {nick(id)}
            {i < g.turnIndex && <Check size={12} />}
          </li>
        ))}
      </ol>
      <p className="mb-3 text-xs text-white/50">
        Podało słowo: <b className="text-white/80">{done}</b> · Czeka na turę: <b className="text-white/80">{Math.max(0, waiting)}</b>
      </p>

      {me?.eliminated ? (
        <p className="rounded-xl bg-white/[.04] px-4 py-3 text-sm text-white/60">Zostałeś wykryty — obserwujesz dalszą grę.</p>
      ) : myTurn ? (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="clue" className="sr-only">
            Twoje skojarzenie
          </label>
          <input
            ref={input}
            id="clue"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            maxLength={CLUE_MAX}
            autoComplete="off"
            placeholder={self.role === 'impostor' ? 'Wymyśl wiarygodne skojarzenie…' : 'Podaj słowo związane z hasłem…'}
            className="h-12 min-w-0 flex-1 rounded-xl border border-accent/50 bg-ink-950/70 px-4 text-base outline-none ring-2 ring-accent/25 transition placeholder:text-white/35 focus:border-accent focus:ring-accent/40"
            data-testid="clue-input"
          />
          <Button type="submit" size="lg" loading={busy} disabled={!word.trim()} icon={<Send size={17} />} data-testid="clue-submit">
            Zatwierdź słowo
          </Button>
        </form>
      ) : g.turnPaused ? (
        <p className="flex items-center gap-2 rounded-xl border border-[#ffd43b]/25 bg-[#ffd43b]/10 px-4 py-3 text-sm text-[#ffe58a]">
          <WifiOff size={16} /> {nick(current)} stracił połączenie — czekamy chwilę, potem tura przejdzie dalej.
        </p>
      ) : (
        <p className="rounded-xl bg-white/[.04] px-4 py-3 text-sm text-white/60">
          {self.hasSubmittedClue ? 'Twoje słowo zostało zapisane. ' : 'Czekasz na swoją turę. '}
          Słuchaj uważnie skojarzeń innych.
        </p>
      )}
    </div>
  );
}

// ───────────────────────── GŁOSOWANIE DECYZYJNE ─────────────────────────

function ContinuationPanel() {
  const { room, self, act, serverNow } = useRoom();
  const g = room.game!;
  const canVote = g.voters.includes(self.playerId);
  const [busy, setBusy] = useState<string | null>(null);
  const choice = self.continuationVote;
  const opt = (key: 'continue' | 'vote', letter: string, title: string, desc: string) => (
    <button
      disabled={!canVote || !!choice || !!busy}
      onClick={async () => {
        setBusy(key);
        await act('game:submit-continuation-vote', { choice: key });
        setBusy(null);
      }}
      className={cn(
        'group flex flex-1 items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed',
        choice === key ? 'border-accent bg-accent/20' : 'border-white/10 bg-white/[.04] enabled:hover:border-accent/60 enabled:hover:bg-accent/10',
        choice && choice !== key && 'opacity-40',
      )}
      data-testid={`cont-${key}`}
    >
      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display font-bold', choice === key ? 'bg-accent text-white' : 'bg-white/10')}>{letter}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-white/55">{desc}</span>
      </span>
      {busy === key && <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
    </button>
  );
  return (
    <div data-testid="continuation-panel">
      <Heading icon={<Gavel size={20} />} title={`Koniec rundy ${g.round} — co dalej?`} right={<><RoleChip /><Countdown deadline={g.deadline} serverNow={serverNow} /></>} />
      {canVote ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {opt('continue', 'A', 'Kolejna runda słów', 'Chcę usłyszeć więcej skojarzeń.')}
          {opt('vote', 'B', 'Głosujemy na impostora', 'Wiem wystarczająco — wskażmy podejrzanego.')}
        </div>
      ) : (
        <p className="rounded-xl bg-white/[.04] px-4 py-3 text-sm text-white/60">Obserwujesz głosowanie.</p>
      )}
      {choice && <p className="mt-2 text-sm text-white/60">Twój głos został zapisany i nie może być zmieniony. Wybory pozostają tajne.</p>}
      <Progress value={g.votesCast} max={g.votesNeeded} label="Oddane głosy" />
      <p className="mt-2 text-xs text-white/40">Remis oznacza kolejną rundę słów.</p>
    </div>
  );
}

// ───────────────────────────── DYSKUSJA ─────────────────────────────

function DiscussionPanel() {
  const { room, isHost, act, serverNow, openHistory } = useRoom();
  const g = room.game!;
  const active = room.players.filter((p) => p.inGame && !p.eliminated);
  return (
    <div data-testid="discussion-panel">
      <Heading
        icon={<Users size={20} />}
        title="Dyskusja"
        sub={g.roundLimitReached ? 'Osiągnięto limit rund — czas wskazać impostora.' : 'Większość zdecydowała: głosujemy na impostora.'}
        right={<><RoleChip /><Countdown deadline={g.deadline} serverNow={serverNow} /></>}
      />
      <p className="text-sm text-white/65">
        Przeanalizujcie skojarzenia i porozmawiajcie — na żywo, przez telefon lub na Discordzie. Podejrzani: wszyscy aktywni gracze ({active.length}). Kto podał słowo, które nie do końca pasuje?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {isHost ? (
          <Button onClick={() => act('game:start-elimination')} icon={<Gavel size={17} />} data-testid="start-vote-btn">
            Rozpocznij głosowanie
          </Button>
        ) : (
          <p className="text-xs text-white/45">Głosowanie zacznie się po upływie czasu lub gdy host je rozpocznie.</p>
        )}
        <Button variant="secondary" className="lg:hidden" onClick={openHistory} icon={<History size={17} />}>
          Historia skojarzeń
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── GŁOSOWANIE ELIMINACYJNE ─────────────────────────

function EliminationPanel() {
  const { room, self, nick, color, act, serverNow } = useRoom();
  const g = room.game!;
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canVote = g.voters.includes(self.playerId);
  const voted = self.eliminationVote;
  useEffect(() => setPicked(null), [g.isTieBreak]);
  return (
    <div data-testid="elimination-panel">
      <Heading
        icon={<Gavel size={20} />}
        title={g.isTieBreak ? 'Dogrywka' : 'Kto jest impostorem?'}
        sub={g.isTieBreak ? 'Remis! Pozostali gracze wybierają jedną z remisujących osób.' : 'Wskaż osobę, którą podejrzewasz. Nie możesz głosować na siebie.'}
        right={<><RoleChip /><Countdown deadline={g.deadline} serverNow={serverNow} /></>}
      />
      {voted ? (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          Oddałeś głos na <b>{nick(voted)}</b>. Głosu nie można zmienić.
        </p>
      ) : canVote ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Wybierz podejrzanego">
            {g.candidates
              .filter((id) => id !== self.playerId)
              .map((id) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={picked === id}
                  onClick={() => setPicked(id)}
                  className={cn(
                    'flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition',
                    picked === id ? 'border-danger bg-danger/20' : 'border-white/10 bg-white/[.04] hover:border-white/30',
                  )}
                  data-testid="candidate"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color(id) }} />
                  <span className="truncate">{nick(id)}</span>
                </button>
              ))}
          </div>
          <Button
            className="mt-3 w-full sm:w-auto"
            variant="danger"
            size="lg"
            disabled={!picked}
            loading={busy}
            icon={<Gavel size={17} />}
            onClick={async () => {
              if (!picked) return;
              setBusy(true);
              await act('game:submit-elimination-vote', { targetId: picked });
              setBusy(false);
            }}
            data-testid="confirm-vote"
          >
            {picked ? `Zatwierdź głos na: ${nick(picked)}` : 'Wybierz osobę'}
          </Button>
        </>
      ) : (
        <p className="rounded-xl bg-white/[.04] px-4 py-3 text-sm text-white/60">
          {g.isTieBreak && g.candidates.includes(self.playerId) ? 'Jesteś w dogrywce — głosują pozostali gracze.' : 'Obserwujesz głosowanie.'}
        </p>
      )}
      <Progress value={g.votesCast} max={g.votesNeeded} label="Oddane głosy" />
    </div>
  );
}

// ───────────────────────────── UJAWNIENIE ─────────────────────────────

function RevealPanel() {
  const { room } = useRoom();
  const r = room.game!.reveal!;
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    setFlip(false);
    const t = setTimeout(() => setFlip(true), 1400);
    return () => clearTimeout(t);
  }, [r.playerId]);
  const imp = r.role === 'impostor';
  return (
    <div className="py-2 text-center" data-testid="reveal-panel" aria-live="assertive">
      <p className="text-sm uppercase tracking-widest text-white/50">Najwięcej głosów ({r.votes})</p>
      <p className="mt-1 font-display text-3xl font-bold">{r.nickname}</p>
      <div style={{ perspective: 800 }} className="mt-3 min-h-[3.5rem]">
        {flip ? (
          <p className={cn('animate-role-flip font-display text-2xl font-bold', imp ? 'text-[#ff8da1]' : 'text-ok')}>
            {imp ? 'był IMPOSTOREM!' : 'był niewinny…'}
          </p>
        ) : (
          <p className="animate-pulse text-white/40">Ujawnianie roli…</p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── OSTATNIA PRÓBA ─────────────────────────────

function LastGuessPanel() {
  const { room, self, nick, act, serverNow } = useRoom();
  const g = room.game!;
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div data-testid="lastguess-panel">
      <Heading icon={<ShieldAlert size={20} />} title="Ostatnia próba impostora" right={<Countdown deadline={g.deadline} serverNow={serverNow} />} />
      {self.canGuess ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!guess.trim()) return;
            setBusy(true);
            await act('game:guess-word', { guess });
            setBusy(false);
          }}
        >
          <p className="mb-2 text-sm text-white/70">Zostałeś wykryty! Odgadnij tajne hasło, a impostorzy wygrają. Masz jedną próbę.</p>
          {self.hint && <p className="mb-2 text-sm text-white/55">Twoja podpowiedź: <b className="text-white">{self.hint}</b></p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              autoFocus
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              maxLength={40}
              placeholder="Twoja odpowiedź…"
              className="h-12 min-w-0 flex-1 rounded-xl border border-danger/50 bg-ink-950/70 px-4 text-base outline-none ring-2 ring-danger/20 focus:border-danger"
              data-testid="guess-input"
            />
            <Button type="submit" variant="danger" size="lg" loading={busy} disabled={!guess.trim()} icon={<Send size={17} />}>
              Zgaduję
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-xl bg-white/[.04] px-4 py-3 text-sm text-white/65">
          <b>{nick(g.lastGuessPlayerId)}</b> próbuje odgadnąć hasło… Trzymajcie kciuki!
        </p>
      )}
    </div>
  );
}

// ───────────────────────────── KONIEC GRY ─────────────────────────────

function EndPanel() {
  const { room, me, isHost, act, color } = useRoom();
  const res = room.game!.result!;
  const tone =
    res.winner === 'crew'
      ? { cls: 'from-ok/25 border-ok/40', title: 'Wygrywają zwykli gracze!', icon: <Trophy size={26} className="text-ok" /> }
      : res.winner === 'impostors'
        ? { cls: 'from-danger/25 border-danger/40', title: 'Wygrywają impostorzy!', icon: <Skull size={26} className="text-danger" /> }
        : { cls: 'from-white/10 border-white/20', title: 'Gra przerwana', icon: <Hourglass size={26} /> };
  const myRole = res.roles.find((r) => r.playerId === me?.id)?.role;
  const iWon = res.winner && myRole && ((res.winner === 'crew' && myRole === 'crewmate') || (res.winner === 'impostors' && myRole === 'impostor'));
  return (
    <div data-testid="end-panel">
      <div className={cn('mb-4 rounded-2xl border bg-gradient-to-br to-transparent p-4 animate-pop', tone.cls)}>
        <div className="flex items-center gap-3">
          {tone.icon}
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight" data-testid="winner">
              {tone.title}
            </h2>
            <p className="text-sm text-white/70">{res.reason}</p>
          </div>
          {res.winner && myRole && (
            <span className={cn('ml-auto hidden rounded-full px-3 py-1 text-xs font-bold sm:inline', iWon ? 'bg-ok/20 text-ok' : 'bg-white/10 text-white/60')}>{iWon ? 'Wygrałeś!' : 'Przegrałeś'}</span>
          )}
        </div>
        <p className="mt-3 text-sm text-white/60">
          Tajne hasło: <b className="font-display text-lg text-white" data-testid="final-word">{res.word}</b> <span className="text-white/40">({CATEGORY_LABELS[res.category]})</span>
        </p>
        {res.lastGuess && (
          <p className="mt-1 text-sm text-white/60">
            Ostatnia próba: „{res.lastGuess.guess}” — {res.lastGuess.correct ? 'trafiona!' : 'nietrafiona.'}
          </p>
        )}
      </div>

      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">Role</h3>
      <ul className="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {res.roles.map((r) => (
          <li key={r.playerId} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-sm', r.role === 'impostor' ? 'border-danger/40 bg-danger/10' : 'border-white/[.06] bg-white/[.03]')}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color(r.playerId) }} />
            <span className="truncate font-medium">{r.nickname}</span>
            <span className={cn('ml-auto shrink-0 text-xs font-bold', r.role === 'impostor' ? 'text-[#ff8da1]' : 'text-white/45')}>{r.role === 'impostor' ? 'IMPOSTOR' : 'gracz'}</span>
            {(() => {
              const sc = res.scores?.find((x) => x.playerId === r.playerId);
              return sc && sc.delta > 0 ? (
                <span className="shrink-0 rounded-md bg-[#ffd43b]/15 px-1.5 py-0.5 text-[11px] font-bold text-[#ffd43b]" title={sc.reason}>
                  +{sc.delta}
                </span>
              ) : null;
            })()}
          </li>
        ))}
      </ul>

      {room.game!.voteHistory.some((v) => v.kind !== 'continuation') && (
        <>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">Wyniki głosowań</h3>
          <div className="mb-4 space-y-1.5">
            {room.game!.voteHistory
              .filter((v) => v.kind !== 'continuation')
              .map((v, i) => (
                <VoteLine key={i} v={v} />
              ))}
          </div>
        </>
      )}

      <details className="mb-4 lg:hidden">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-white/45">Historia słów ze wszystkich rund</summary>
        <HistoryList className="mt-2" />
      </details>

      <div className="flex flex-wrap gap-2">
        {isHost ? (
          <>
            <Button size="lg" onClick={() => act('game:restart')} icon={<RotateCcw size={18} />} data-testid="restart-btn">
              Zagraj ponownie
            </Button>
            <Button variant="secondary" size="lg" onClick={() => act('game:back-to-lobby')} icon={<Users size={18} />}>
              Wróć do lobby
            </Button>
          </>
        ) : (
          <>
            <Button variant={me?.ready ? 'success' : 'primary'} size="lg" onClick={() => act('lobby:ready', { ready: !me?.ready })} icon={me?.ready ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}>
              {me?.ready ? 'Gotowy na kolejną grę!' : 'Chcę zagrać ponownie'}
            </Button>
            <p className="self-center text-xs text-white/45">Host decyduje, czy gracie od razu, czy wracacie do lobby.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function PhasePanel() {
  const { room } = useRoom();
  switch (room.phase) {
    case 'lobby':
      return <LobbyPanel />;
    case 'roles':
      return <RolesPanel />;
    case 'clues':
      return <CluesPanel />;
    case 'continuation-vote':
      return <ContinuationPanel />;
    case 'discussion':
      return <DiscussionPanel />;
    case 'elimination-vote':
      return <EliminationPanel />;
    case 'reveal':
      return <RevealPanel />;
    case 'last-guess':
      return <LastGuessPanel />;
    case 'ended':
      return <EndPanel />;
    default:
      return null;
  }
}
