'use client';

import { useEffect, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowRight, HelpCircle, Plus, RotateCcw, Users } from 'lucide-react';
import { Button, Logo, Panel } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { AppearancePicker, useStoredAppearance } from '@/components/ui/AppearancePicker';
import { request } from '@/lib/socket';
import { adoptRemembered, loadNick, loadRemembered, saveNick, saveSession, type StoredSession } from '@/lib/session';
import { nicknameSchema, roomCodeSchema } from '@/shared/schemas';
import type { JoinResult } from '@/shared/types';
import { HowToPlay, RULES_SHORT } from './HowToPlay';

const ArenaPreview = dynamic(() => import('@/components/arena/ArenaPreview'), { ssr: false });

export function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const [nick, setNick] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [resume, setResume] = useState<StoredSession | null>(null);
  const [appearance, setAppearance] = useStoredAppearance();

  useEffect(() => {
    setNick(loadNick());
    setResume(loadRemembered());
    const q = new URLSearchParams(window.location.search).get('kod');
    if (q) setCode(q.toUpperCase().slice(0, 5));
  }, []);

  function validNick(): string | null {
    const r = nicknameSchema.safeParse(nick);
    if (!r.success) {
      setError(r.error.issues[0].message);
      return null;
    }
    return r.data;
  }

  async function onCreate() {
    setError(null);
    const n = validNick();
    if (!n) return;
    setBusy('create');
    const r = await request<JoinResult>('lobby:create', { nickname: n, appearance });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    saveNick(n);
    saveSession({ ...r.data, nickname: n });
    router.push(`/room/${r.data.code}`);
  }

  async function onJoin(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const n = validNick();
    if (!n) return;
    const c = roomCodeSchema.safeParse(code);
    if (!c.success) return setError(c.error.issues[0].message);
    setBusy('join');
    const r = await request<JoinResult>('lobby:join', { code: c.data, nickname: n, appearance });
    setBusy(null);
    if (!r.ok) {
      setError(r.error);
      toast(r.error, 'error');
      return;
    }
    saveNick(n);
    saveSession({ ...r.data, nickname: n });
    router.push(`/room/${r.data.code}`);
  }

  return (
    <main className="bg-stage relative min-h-dvh overflow-hidden">
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,460px)_1fr] lg:gap-12">
        <div className="animate-fade-up">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-medium text-white/70">
            <Users size={14} /> 3–12 graczy · bez rejestracji
          </div>
          <h1 className="mb-3">
            <Logo size="xl" />
          </h1>
          <p className="mb-7 max-w-md text-[17px] leading-relaxed text-white/70">
            Wszyscy znają tajne hasło. Prawie wszyscy. Podawajcie skojarzenia po kolei i znajdźcie tego, kto tylko udaje.
          </p>

          {resume && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 animate-fade-up">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Masz niedokończoną grę</p>
                <p className="text-sm text-white/60">
                  Pokój <b className="font-mono tracking-widest text-white">{resume.code}</b>
                  {resume.nickname && <> · jako <b className="text-white">{resume.nickname}</b></>}
                </p>
              </div>
              <Button
                onClick={() => {
                  adoptRemembered(resume.code);
                  router.push(`/room/${resume.code}`);
                }}
                icon={<RotateCcw size={17} />}
                data-testid="resume-btn"
              >
                Wróć do gry
              </Button>
            </div>
          )}

          <Panel className="p-5 sm:p-6">
            <form onSubmit={onJoin} noValidate>
              <label htmlFor="nick" className="mb-1.5 block text-sm font-medium text-white/70">
                Twój nick
              </label>
              <input
                id="nick"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                maxLength={16}
                autoComplete="nickname"
                placeholder="np. Kasia"
                className="mb-4 h-12 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 text-base outline-none transition placeholder:text-white/30 focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <div className="mb-5">
                <span className="mb-2 block text-sm font-medium text-white/70">Wygląd postaci</span>
                <AppearancePicker value={appearance} onChange={setAppearance} />
              </div>
              <Button type="button" size="lg" className="w-full" onClick={onCreate} loading={busy === 'create'} disabled={!!busy} icon={<Plus size={18} />}>
                Utwórz lobby
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-white/35">
                <span className="h-px flex-1 bg-white/10" /> lub dołącz <span className="h-px flex-1 bg-white/10" />
              </div>

              <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-white/70">
                Kod pokoju
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                  placeholder="K7XPQ"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-950/60 px-4 font-mono text-lg uppercase tracking-[.3em] outline-none transition placeholder:tracking-[.3em] placeholder:text-white/25 focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <Button type="submit" variant="secondary" size="md" className="h-12" loading={busy === 'join'} disabled={!!busy} icon={<ArrowRight size={18} />}>
                  Dołącz do gry
                </Button>
              </div>
              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-[#ff9db0]">
                  {error}
                </p>
              )}
            </form>
          </Panel>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {RULES_SHORT.map((r) => (
              <div key={r.n} className="rounded-2xl border border-white/[.06] bg-white/[.025] p-3.5">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/25 text-[11px] text-accent-soft">{r.n}</span>
                  {r.t}
                </div>
                <p className="text-[13px] leading-snug text-white/55">{r.d}</p>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-4 -ml-3" onClick={() => setHowOpen(true)} icon={<HelpCircle size={18} />}>
            Jak grać?
          </Button>
        </div>

        <div className="relative hidden h-[560px] lg:block" aria-hidden>
          <ArenaPreview />
        </div>
      </div>
      <HowToPlay open={howOpen} onClose={() => setHowOpen(false)} />
    </main>
  );
}
