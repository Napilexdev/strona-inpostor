'use client';

import { useEffect, useRef, useState } from 'react';
import { FileUp, Lock, Minus, Package, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { CUSTOM_MAX, CUSTOM_MIN, parseWordPack } from '@/shared/schemas';
import { Modal, cn } from '@/components/ui/primitives';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/shared/constants';
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTIES, DIFFICULTY_LABELS, HINT_MODES, HINT_MODE_LABELS, type RoomSettings } from '@/shared/types';
import { useRoom } from './context';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/[.06] py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[15px] font-medium">{label}</div>
        {hint && <div className="text-xs text-white/45">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: { v: T; l: string }[];
  onChange: (v: T) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-ink-950/60 p-1">
      {options.map((o) => (
        <button
          key={String(o.v)}
          role="radio"
          aria-checked={o.v === value}
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={cn(
            'min-h-9 rounded-lg px-3 text-sm font-medium transition disabled:cursor-not-allowed',
            o.v === value ? 'bg-accent text-white shadow' : 'text-white/65 hover:bg-white/[.07] disabled:hover:bg-transparent',
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Select<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: { v: T; l: string }[];
  onChange: (v: T) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={String(value)}
      disabled={disabled}
      onChange={(e) => {
        const o = options.find((x) => String(x.v) === e.target.value);
        if (o) onChange(o.v);
      }}
      className="h-10 min-w-[11rem] rounded-xl border border-white/10 bg-ink-950/60 px-3 text-sm outline-none focus:border-accent disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={String(o.v)} value={String(o.v)} className="bg-ink-900">
          {o.l}
        </option>
      ))}
    </select>
  );
}

export function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { room, isHost, act } = useRoom();
  const s = room.settings;
  const [pending, setPending] = useState(false);
  const editable = isHost && room.phase === 'lobby' && !pending;
  // Kolejna zmiana dopiero po potwierdzeniu poprzedniej przez serwer.
  const set = async (patch: Partial<RoomSettings>) => {
    setPending(true);
    await act('lobby:update-settings', patch);
    setPending(false);
  };
  const occupied = room.players.length;

  return (
    <Modal open={open} onClose={onClose} title={isHost ? 'Ustawienia pokoju' : 'Ustawienia pokoju (podgląd)'} wide labelledBy="settings-title">
      {!(isHost && room.phase === 'lobby') && (
        <p className="mb-2 flex items-center gap-2 rounded-xl bg-white/[.05] px-3 py-2 text-sm text-white/60">
          <Lock size={15} />
          {isHost ? 'Ustawienia są zablokowane w trakcie gry. Zmienisz je po powrocie do poczekalni.' : 'Tylko host może zmieniać ustawienia.'}
        </p>
      )}
      <Row label="Limit graczy" hint={`Liczba mównic na arenie. Obecnie w pokoju: ${occupied}.`}>
        <div className="flex items-center gap-2">
          <button
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.07] hover:bg-white/[.12] disabled:opacity-40"
            disabled={!editable || s.maxPlayers <= Math.max(MIN_PLAYERS, occupied)}
            onClick={() => set({ maxPlayers: s.maxPlayers - 1 })}
            aria-label="Zmniejsz limit graczy"
          >
            <Minus size={16} />
          </button>
          <span className="w-10 text-center font-display text-2xl font-bold tabular-nums" data-testid="limit-value">
            {s.maxPlayers}
          </span>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.07] hover:bg-white/[.12] disabled:opacity-40"
            disabled={!editable || s.maxPlayers >= MAX_PLAYERS}
            onClick={() => set({ maxPlayers: s.maxPlayers + 1 })}
            aria-label="Zwiększ limit graczy"
          >
            <Plus size={16} />
          </button>
        </div>
      </Row>
      <Row label="Liczba impostorów" hint="Dwóch impostorów wymaga co najmniej 5 graczy.">
        <Segmented label="Liczba impostorów" value={s.impostorCount} disabled={!editable} onChange={(v) => set({ impostorCount: v })} options={[{ v: 1 as const, l: '1' }, { v: 2 as const, l: '2' }]} />
      </Row>
      <Row label="Kategoria haseł">
        <Select label="Kategoria haseł" value={s.category} disabled={!editable} onChange={(v) => set({ category: v })} options={CATEGORIES.filter((c) => c !== 'wlasne' || room.customPack).map((c) => ({
            v: c,
            l: c === 'wlasne' && room.customPack ? `${room.customPack.name} (${room.customPack.count})` : CATEGORY_LABELS[c],
          }))} />
      </Row>
      <Row label="Poziom trudności">
        <Segmented label="Poziom trudności" value={s.difficulty} disabled={!editable} onChange={(v) => set({ difficulty: v })} options={DIFFICULTIES.map((d) => ({ v: d, l: DIFFICULTY_LABELS[d] }))} />
      </Row>
      <Row label="Czas na podanie słowa" hint="Po upływie czasu tura przechodzi dalej.">
        <Select
          label="Czas na podanie słowa"
          value={s.clueTimeLimit}
          disabled={!editable}
          onChange={(v) => set({ clueTimeLimit: v })}
          options={[0, 20, 30, 45, 60, 90, 120].map((v) => ({ v, l: v === 0 ? 'Bez limitu' : `${v} s` }))}
        />
      </Row>
      <Row label="Czas dyskusji" hint="Przed głosowaniem na impostora. Host może zakończyć wcześniej.">
        <Select
          label="Czas dyskusji"
          value={s.discussionTime}
          disabled={!editable}
          onChange={(v) => set({ discussionTime: v })}
          options={[0, 30, 60, 90, 120, 180, 300].map((v) => ({ v, l: v === 0 ? 'Pomiń dyskusję' : v >= 60 ? `${v / 60} min${v % 60 ? ` ${v % 60} s` : ''}` : `${v} s` }))}
        />
      </Row>
      <Row label="Maksymalna liczba rund skojarzeń" hint="Po ostatniej rundzie od razu głosujecie na impostora.">
        <Select
          label="Maksymalna liczba rund"
          value={s.maxRounds}
          disabled={!editable}
          onChange={(v) => set({ maxRounds: v })}
          options={[0, 1, 2, 3, 4, 5, 6, 8, 10].map((v) => ({ v, l: v === 0 ? 'Bez limitu' : String(v) }))}
        />
      </Row>
      <Row label="Tryb głosowania" hint="Jawny: po głosowaniu widać, kto na kogo głosował.">
        <Segmented label="Tryb głosowania" value={s.voteMode} disabled={!editable} onChange={(v) => set({ voteMode: v })} options={[{ v: 'tajny' as const, l: 'Tajny' }, { v: 'jawny' as const, l: 'Jawny' }]} />
      </Row>
      <Row label="Ostatnia próba impostora" hint="Wykryty impostor może odgadnąć hasło i wygrać.">
        <Segmented label="Ostatnia próba" value={s.lastGuess} disabled={!editable} onChange={(v) => set({ lastGuess: v })} options={[{ v: true, l: 'Włączona' }, { v: false, l: 'Wyłączona' }]} />
      </Row>
      <Row label="Podpowiedź dla impostora" hint="Impostor widzi ją na swojej karcie, żeby miał szansę wczuć się w temat.">
        <Select label="Podpowiedź dla impostora" value={s.impostorHint} disabled={!editable} onChange={(v) => set({ impostorHint: v })} options={HINT_MODES.map((m) => ({ v: m, l: HINT_MODE_LABELS[m] }))} />
      </Row>
      <Row label="Hasło w turze impostora" hint="Jeśli impostor zamiast skojarzenia wpisze dokładnie tajne hasło, impostorzy od razu wygrywają.">
        <Segmented label="Hasło w turze impostora" value={s.impostorWordWin} disabled={!editable} onChange={(v) => set({ impostorWordWin: v })} options={[{ v: true, l: 'Wygrywa' }, { v: false, l: 'Wyłączone' }]} />
      </Row>
      {isHost && room.phase === 'lobby' && <CustomPackEditor />}
      {!isHost && room.customPack && (
        <p className="mt-3 flex items-center gap-2 text-sm text-white/55">
          <Package size={15} /> Host wgrał własną paczkę: <b className="text-white/80">{room.customPack.name}</b> ({room.customPack.count} haseł)
        </p>
      )}
    </Modal>
  );
}

const PACK_TEXT_KEY = 'impostor:pack-text';
const PACK_NAME_KEY = 'impostor:pack-name';

/** Wgrywanie własnej paczki słów: wklejenie tekstu albo plik .txt / .csv / .json. */
function CustomPackEditor() {
  const { room, act } = useRoom();
  const toast = useToast();
  const [text, setText] = useState('');
  const [name, setName] = useState('Moja paczka');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      setText(localStorage.getItem(PACK_TEXT_KEY) ?? '');
      setName(localStorage.getItem(PACK_NAME_KEY) ?? 'Moja paczka');
    } catch {
      /* ignoruj */
    }
  }, []);
  const parsed = parseWordPack(text);
  const tooMany = parsed.length > CUSTOM_MAX;
  const withHints = parsed.filter((w) => w.hint).length;

  async function upload() {
    setBusy(true);
    try {
      localStorage.setItem(PACK_TEXT_KEY, text);
      localStorage.setItem(PACK_NAME_KEY, name);
    } catch {
      /* ignoruj */
    }
    const ok = await act('lobby:set-custom-words', { name: name.trim() || 'Własna paczka', words: parsed.slice(0, CUSTOM_MAX) });
    setBusy(false);
    if (ok) toast(`Wgrano paczkę „${name.trim() || 'Własna paczka'}” — gracie teraz na Waszych hasłach.`, 'success');
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 200_000) return toast('Plik jest za duży (maks. 200 KB).', 'error');
    const content = await f.text();
    setText(content);
    setName(f.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Moja paczka');
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4" data-testid="pack-editor">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Package size={17} className="text-accent-soft" /> Własna paczka słów
      </h3>
      <p className="mb-3 text-xs leading-relaxed text-white/50">
        Jedno hasło w linii. Opcjonalnie podpowiedzi dla impostora po średniku, oddzielone przecinkami — każdy impostor dostanie inną, np.{' '}
        <code className="rounded bg-white/10 px-1">pizza; ciepłe, dzielone na części</code>. Możesz też wczytać plik
        .txt, .csv lub .json. Od {CUSTOM_MIN} do {CUSTOM_MAX} haseł. Lista haseł nie jest wysyłana innym graczom.
      </p>
      {room.customPack && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-ok/10 px-3 py-2 text-sm text-[#b6f5d8]">
          Wgrana: <b>{room.customPack.name}</b> · {room.customPack.count} haseł
          <button className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white" onClick={() => act('lobby:set-custom-words', { name: '', words: [] })}>
            <Trash2 size={13} /> Usuń
          </button>
        </div>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Nazwa paczki"
        aria-label="Nazwa paczki"
        className="mb-2 h-10 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 text-sm outline-none focus:border-accent"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        spellCheck={false}
        placeholder={'pizza; ciepłe, dzielone na części\npierogi; robione ręcznie, rodzinne\nkino\n…'}
        aria-label="Hasła w paczce"
        className="scrollbar-thin w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        data-testid="pack-text"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={tooMany || (parsed.length > 0 && parsed.length < CUSTOM_MIN) ? 'text-xs text-[#ff9db0]' : 'text-xs text-white/50'}>
          Rozpoznano: <b>{parsed.length}</b> haseł{withHints ? `, ${withHints} z podpowiedzią` : ''}
          {tooMany && ` — zostanie użytych pierwszych ${CUSTOM_MAX}`}
        </span>
        <input ref={file} type="file" accept=".txt,.csv,.json,text/plain,application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => file.current?.click()} icon={<FileUp size={15} />}>
          Wczytaj plik
        </Button>
        <Button size="sm" disabled={parsed.length < CUSTOM_MIN} loading={busy} onClick={upload} icon={<Package size={15} />} data-testid="pack-upload">
          Wgraj paczkę
        </Button>
      </div>
    </section>
  );
}
