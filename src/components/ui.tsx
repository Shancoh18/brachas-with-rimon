/**
 * Editorial-luxury primitives: double-bezel cards, island pill buttons with
 * nested trailing icons, eyebrow tags. (See the design-system rules in
 * CLAUDE.md — no raw gray borders, no harsh shadows, custom easing only.)
 */
import type { ReactNode } from 'react';

const EASE = 'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]';

/** Double-bezel: outer shell tray + inner core with concentric radii. */
export function Bezel({
  children,
  className = '',
  innerClassName = '',
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] bg-espresso/[0.045] p-1.5 ring-1 ring-espresso/[0.06] ${className}`}
    >
      <div
        className={`rounded-[calc(2rem-0.375rem)] bg-white/75 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_18px_50px_-24px_rgba(43,33,26,0.25)] ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-gold/30 bg-gold/[0.07] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-gold">
      {children}
    </span>
  );
}

/** Island pill CTA with the nested button-in-button trailing icon. */
export function PillButton({
  children,
  icon = '→',
  onClick,
  variant = 'primary',
  className = '',
  disabled,
}: {
  children: ReactNode;
  icon?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'rimon';
  className?: string;
  disabled?: boolean;
}) {
  const base =
    variant === 'primary'
      ? 'bg-espresso text-cream hover:bg-espresso/90'
      : variant === 'rimon'
        ? 'bg-rimon text-cream hover:bg-rimon-deep'
        : 'bg-transparent text-espresso ring-1 ring-espresso/15 hover:ring-espresso/30';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex items-center gap-3 rounded-full py-2.5 pl-6 pr-2.5 text-[14px] font-semibold ${EASE} active:scale-[0.98] disabled:opacity-40 ${base} ${className}`}
    >
      {children}
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] ${EASE} group-hover:translate-x-0.5 group-hover:scale-105 ${
          variant === 'ghost' ? 'bg-espresso/5' : 'bg-white/15'
        }`}
      >
        {icon}
      </span>
    </button>
  );
}

/** Persistent learning-aid disclaimer — required on every screen. */
export function Disclaimer() {
  return (
    <p className="mx-auto max-w-md px-6 pb-6 pt-3 text-center text-[10.5px] leading-relaxed text-mocha">
      This app is a <em>study aid</em>. For any practical halachic question, consult a qualified
      rabbi. Sources: chabad.org · brachos.org · oukosher.org
    </p>
  );
}

export function ScreenShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="grain flex min-h-[100dvh] flex-col">
      <main className={`mx-auto flex w-full flex-1 flex-col px-5 pt-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        {children}
      </main>
      <Disclaimer />
    </div>
  );
}
