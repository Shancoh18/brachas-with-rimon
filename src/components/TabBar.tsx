/** Floating island tab bar — visible on root screens only. */
import { useBracha, type Tab } from '../store';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'bless', label: 'Bless', icon: '🍽️' },
  { id: 'learn', label: 'Learn', icon: '📖' },
  { id: 'journey', label: 'Journey', icon: '🔥' },
  { id: 'friends', label: 'Friends', icon: '👥' },
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
            className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.96] ${
              tab === t.id ? 'bg-espresso text-cream' : 'text-espresso-soft hover:bg-espresso/[0.05]'
            }`}
          >
            <span className="text-[15px] leading-none">{t.icon}</span>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
