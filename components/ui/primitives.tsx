'use client';

import { createPortal } from 'react-dom';

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-[#8d72ff] shadow-[0_8px_24px_-8px_rgba(124,92,255,.7)]',
  secondary: 'bg-white/[.07] text-white hover:bg-white/[.12] border border-white/10',
  ghost: 'text-white/75 hover:text-white hover:bg-white/[.06]',
  danger: 'bg-danger text-white hover:bg-[#ff6682] shadow-[0_8px_24px_-8px_rgba(255,77,109,.6)]',
  success: 'bg-ok text-ink-950 hover:bg-[#5be7a9]',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode }
>(function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }, ref) {
  const sizes = { sm: 'h-9 px-3 text-sm gap-1.5', md: 'h-11 px-4 text-[15px] gap-2', lg: 'h-13 px-6 text-base gap-2.5 py-3.5' };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft',
        VARIANTS[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-white/[.08] bg-ink-850/85 shadow-2xl shadow-black/30 backdrop-blur-xl', className)}>
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  dismissable = true,
  labelledBy,
}: {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  dismissable?: boolean;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,button:not([data-close]),select')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, dismissable, onClose]);
  if (!open || typeof document === 'undefined') return null;
  // Portal do <body>: okno nie jest uwięzione w kontekście warstw rodzica (np. górnego paska)
  // i zawsze przykrywa arenę oraz jej przyciski.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm animate-fade-up" onClick={() => dismissable && onClose?.()} />
      <div
        ref={ref}
        className={cn(
          'relative max-h-[90dvh] w-full overflow-y-auto rounded-3xl border border-white/10 bg-ink-850 p-5 shadow-2xl animate-pop sm:p-7',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        {(title || (dismissable && onClose)) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            {title && (
              <h2 id={labelledBy} className="font-display text-xl font-bold tracking-tight">
                {title}
              </h2>
            )}
            {dismissable && onClose && (
              <button data-close onClick={onClose} className="-mr-2 -mt-1 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Zamknij">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Odliczanie do terminu z serwera (z korektą przesunięcia zegara). */
export function useCountdown(deadline: number | null | undefined, serverNow: () => number) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - serverNow()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline, serverNow]);
  return left;
}

export function Countdown({ deadline, serverNow, className }: { deadline: number | null | undefined; serverNow: () => number; className?: string }) {
  const left = useCountdown(deadline, serverNow);
  if (left === null) return null;
  const urgent = left <= 5;
  return (
    <span
      className={cn(
        'inline-flex min-w-[3.2rem] items-center justify-center rounded-full px-2.5 py-0.5 font-mono text-sm font-semibold tabular-nums',
        urgent ? 'bg-danger/20 text-[#ff8da1]' : 'bg-white/10 text-white/85',
        className,
      )}
      aria-label={`Pozostało ${left} sekund`}
    >
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </span>
  );
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'xl' }) {
  const s = { sm: 'text-lg', md: 'text-2xl', xl: 'text-5xl sm:text-7xl' }[size];
  return (
    <span className={cn('font-display font-bold tracking-[-0.04em] leading-none', s)} aria-label="IMPOSTOR">
      <span className="text-white">IMPO</span>
      <span className="bg-gradient-to-r from-danger to-accent bg-clip-text text-transparent">STOR</span>
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)} style={{ background: color, boxShadow: `0 0 10px ${color}88` }} />;
}
