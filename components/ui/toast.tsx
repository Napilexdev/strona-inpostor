'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from './primitives';

type Kind = 'error' | 'success' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const Ctx = createContext<(text: string, kind?: Kind) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 4500 : 2800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-3" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xl backdrop-blur-xl animate-fade-up',
              t.kind === 'error' && 'border-danger/40 bg-[#2a1020]/95 text-[#ffc2cd]',
              t.kind === 'success' && 'border-ok/40 bg-[#0d2a20]/95 text-[#b6f5d8]',
              t.kind === 'info' && 'border-white/15 bg-ink-800/95 text-white',
            )}
          >
            {t.kind === 'error' ? <AlertCircle size={18} className="mt-px shrink-0" /> : t.kind === 'success' ? <CheckCircle2 size={18} className="mt-px shrink-0" /> : <Info size={18} className="mt-px shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
