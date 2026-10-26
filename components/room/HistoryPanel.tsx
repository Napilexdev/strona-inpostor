'use client';

import { Fragment } from 'react';
import { MessageSquareText, Vote } from 'lucide-react';
import { Dot, cn } from '@/components/ui/primitives';
import type { VoteRecord } from '@/shared/types';
import { useRoom } from './context';

export function VoteLine({ v }: { v: VoteRecord }) {
  const { nick, color } = useRoom();
  return (
    <div className="rounded-xl border border-white/[.06] bg-white/[.03] px-3 py-2 text-[13px]">
      <div className="flex items-center gap-1.5 font-medium text-white/80">
        <Vote size={14} className="text-accent-soft" />
        {v.kind === 'continuation' ? 'Decyzja po rundzie' : v.kind === 'tie-break' ? 'Dogrywka' : 'Głosowanie na impostora'}
      </div>
      {v.kind === 'continuation' && v.continueVotes !== undefined && (
        <div className="mt-0.5 text-white/55">
          Kolejna runda: <b className="text-white/85">{v.continueVotes}</b> · Głosowanie: <b className="text-white/85">{v.eliminateVotes}</b>
        </div>
      )}
      {v.tallies && v.tallies.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-white/60">
          {v.tallies.map((t) => (
            <span key={t.playerId} className="inline-flex items-center gap-1">
              <Dot color={color(t.playerId)} className="h-2 w-2" />
              {nick(t.playerId)}: <b className="text-white/85">{t.votes}</b>
            </span>
          ))}
        </div>
      )}
      {v.ballots && v.ballots.length > 0 && (
        <div className="mt-1 text-xs text-white/45">
          {v.ballots.map((b) => `${nick(b.voterId)} → ${nick(b.targetId)}`).join(' · ')}
        </div>
      )}
      <div className="mt-0.5 text-white/70">{v.outcome}</div>
    </div>
  );
}

export function HistoryList({ className }: { className?: string }) {
  const { room, color } = useRoom();
  const g = room.game;
  if (!g || (g.clues.length === 0 && g.voteHistory.length === 0)) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-white/40', className)}>
        <MessageSquareText size={28} className="opacity-60" />
        {room.phase === 'lobby' ? 'Historia skojarzeń pojawi się po rozpoczęciu gry.' : 'Nikt jeszcze nie podał słowa.'}
      </div>
    );
  }
  const rounds = Array.from(new Set([...g.clues.map((c) => c.round), ...g.voteHistory.map((v) => v.round), ...(room.phase === 'clues' ? [g.round] : [])])).sort((a, b) => a - b);
  return (
    <div className={cn('space-y-4', className)} data-testid="history">
      {rounds.map((r) => {
        const clues = g.clues.filter((c) => c.round === r);
        return (
          <Fragment key={r}>
            <section>
              <h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/45">
                Runda {r}
                {room.phase === 'clues' && r === g.round && <span className="rounded-full bg-accent/25 px-1.5 py-px text-[10px] text-accent-soft">trwa</span>}
              </h4>
              <ol className="space-y-1">
                {clues.map((c, i) => (
                  <li key={`${c.playerId}-${i}`} className="flex items-center gap-2 rounded-lg bg-white/[.035] px-2.5 py-1.5 text-sm animate-fade-up">
                    <Dot color={color(c.playerId)} />
                    <span className="max-w-[40%] truncate text-white/60">{c.nickname}</span>
                    <span className={cn('ml-auto truncate font-semibold', c.skipped && 'font-normal italic text-white/35')}>{c.skipped ? 'pominięto turę' : c.word}</span>
                  </li>
                ))}
                {clues.length === 0 && <li className="text-sm text-white/35">Brak słów w tej rundzie.</li>}
              </ol>
            </section>
            {g.voteHistory
              .filter((v) => v.round === r)
              .map((v, i) => (
                <VoteLine key={`${r}-${i}`} v={v} />
              ))}
          </Fragment>
        );
      })}
    </div>
  );
}
