/**
 * Floating island tab bar — visible on root screens only.
 * Icons are hand-drawn 1.5px-stroke SVGs (chrome never uses emoji); the
 * high-frequency tab switch animates fast (150ms) per the Emil rule —
 * this control is hit dozens of times a day.
 */
import type { ReactNode } from 'react';
import { useBracha, type Tab } from '../store';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ICONS: Record<Tab, ReactNode> = {
  bless: (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" {...stroke}>
      {/* fork + plate */}
      <circle cx="14.5" cy="12" r="6.5" />
      <circle cx="14.5" cy="12" r="2.8" />
      <path d="M4.5 3.5v5.2M2.8 3.5v3.4a1.7 1.7 0 0 0 3.4 0V3.5M4.5 8.7V20.5" />
    </svg>
  ),
  learn: (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" {...stroke}>
      <path d="M12 5.5c-1.8-1.6-4.4-2-8-1.4v14.4c3.6-.6 6.2-.2 8 1.4 1.8-1.6 4.4-2 8-1.4V4.1c-3.6-.6-6.2-.2-8 1.4Z" />
      <path d="M12 5.5v14.4" />
    </svg>
  ),
  journey: (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" {...stroke}>
      <path d="M12 3.5c.6 2.8-.9 4.3-2.4 5.9C8 11.1 6.5 12.9 6.5 15.4a5.5 5.5 0 0 0 11 0c0-2-1-3.5-2-4.9-.8 1-1.2 1.9-1.1 3.1-1.4-.7-2.4-2.6-2.4-4.6 0-1.9.5-3.6 0-5.5Z" />
    </svg>
  ),
  friends: (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" {...stroke}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.3 2.7-5 5.5-5s4.9 1.7 5.5 5" />
      <circle cx="16.8" cy="9.5" r="2.5" />
      <path d="M16.5 14.6c2.3.2 3.7 1.7 4.2 4.2" />
    </svg>
  ),
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'bless', label: 'Bless' },
  { id: 'learn', label: 'Learn' },
  { id: 'journey', label: 'Journey' },
  { id: 'friends', label: 'Friends' },
];

export function TabBar() {
  const { tab, setTab, reset } = useBracha();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-6">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-espresso/10 bg-white/80 p-1.5 shadow-[0_18px_50px_-12px_rgba(43,33,26,0.28)] backdrop-blur-xl">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'bless') reset();
              setTab(t.id);
            }}
            className={`flex flex-col items-center gap-1 rounded-full px-4 py-2 transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96] ${
              tab === t.id ? 'bg-espresso text-cream' : 'text-espresso-soft hover:bg-espresso/[0.05]'
            }`}
          >
            {ICONS[t.id]}
            <span className="text-[9px] font-bold uppercase tracking-[0.14em]">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
