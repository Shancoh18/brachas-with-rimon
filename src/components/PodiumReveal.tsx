/**
 * Podium reveal — plays ONCE per finished leaderboard round, the first time
 * a member opens the app after the clock ran out. Choreography (tk-* clock):
 * headline prints, 3rd place rises, 2nd place rises, a suspense beat… then
 * the champion bursts in — crown drop, gold halo ripple, confetti — and the
 * CTA marks the reveal watched server-side so it never replays.
 * Reduced-motion lands on the finished podium still (see index.css).
 */
import type { Board } from '../lib/api';
import { PillButton } from './ui';

const BASE = import.meta.env.BASE_URL;

const CONFETTI = [
  { left: '16%', top: '20%', background: '#c9a45c', rr: '230deg', cd: '4.55s' },
  { left: '32%', top: '14%', background: '#7d8b74', rr: '150deg', cd: '4.67s' },
  { left: '52%', top: '11%', background: '#a13327', rr: '320deg', cd: '4.6s' },
  { left: '70%', top: '16%', background: '#c9a45c', rr: '120deg', cd: '4.75s' },
  { left: '84%', top: '22%', background: '#7d8b74', rr: '260deg', cd: '4.64s' },
  { left: '44%', top: '24%', background: '#a87e2f', rr: '190deg', cd: '4.71s' },
];

export function PodiumReveal({ board, onContinue }: { board: Board; onContinue: () => void }) {
  const result = board.result;
  if (!result?.winnerName) return null;
  const rows = result.standings;
  const first = rows[0];
  const second = rows[1] ?? null;
  const third = rows[2] ?? null;
  const myPlace = rows.findIndex((r) => r.you) + 1; // 0 → not on the list

  return (
    <div className="tk-root tk-grain" data-takeover="podium">
      {/* confetti for the champion moment */}
      <div className="pointer-events-none absolute inset-0 z-[18]">
        {CONFETTI.map((c, i) => (
          <i
            key={i}
            className="tk-confetti absolute"
            style={{ left: c.left, top: c.top, background: c.background, '--rr': c.rr, '--cd': c.cd } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 top-[7%] z-20 px-8 text-center">
        <p
          className="tk-rise text-[10px] font-bold uppercase tracking-[0.26em] text-gold"
          style={{ '--td': '0.3s' } as React.CSSProperties}
        >
          Leaderboard final · {board.title}
        </p>
        <h2
          className="tk-rise mt-3 font-display text-[31px] font-medium leading-tight text-espresso"
          style={{ '--td': '0.5s' } as React.CSSProperties}
        >
          The podium.
        </h2>
        {board.round > 1 && (
          <p
            className="tk-rise mt-1 text-[11px] font-semibold uppercase tracking-wider text-mocha"
            style={{ '--td': '0.65s' } as React.CSSProperties}
          >
            round {board.round}
          </p>
        )}
      </div>

      <div className="absolute inset-x-0 top-[24%] z-20 flex flex-col items-center px-8">
        {/* the champion — big reveal, crown drop, halo, name in serif */}
        <div className="pr-champ relative w-full max-w-[300px]" style={{ '--td': '3.9s' } as React.CSSProperties}>
          <div className="pr-halo" style={{ '--td': '4.45s' } as React.CSSProperties} />
          <div className="rounded-[26px] border border-hairline bg-white/90 p-[7px] shadow-[0_18px_44px_rgba(43,33,26,0.11)]">
            <div className="relative overflow-hidden rounded-[20px] border border-hairline bg-[#fdfbf7]">
              <img
                className="block aspect-[16/9] w-full object-cover"
                style={{ objectPosition: '50% 30%' }}
                src={`${BASE}mascot/rimon-podium.webp`}
                alt=""
                draggable={false}
              />
              <div className="px-4 pb-4 pt-3 text-center">
                <p className="text-[22px] leading-none">
                  <span className="pr-crown" style={{ '--td': '4.6s' } as React.CSSProperties}>
                    👑
                  </span>
                </p>
                <p className="mt-1 truncate font-display text-[24px] font-medium leading-tight text-espresso">
                  {first.name}
                </p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                  takes the crown · ⭐ {first.points}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2nd and 3rd — these actually appear FIRST (3rd, then 2nd), building
            up to the champion; layout keeps the classic podium order */}
        <div className="mt-4 w-full max-w-[300px] space-y-2">
          {second && (
            <div
              className="tk-rise flex items-center gap-3 rounded-2xl border border-hairline bg-white/80 px-4 py-2.5 shadow-[0_6px_18px_rgba(43,33,26,0.06)]"
              style={{ '--td': '2.5s' } as React.CSSProperties}
            >
              <span className="text-[17px]">🥈</span>
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-espresso">
                {second.name}
                {second.you && (
                  <span className="ml-1.5 rounded-full bg-rimon/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rimon">
                    you
                  </span>
                )}
              </p>
              <span className="shrink-0 text-[13px] font-bold text-espresso-soft">⭐ {second.points}</span>
            </div>
          )}
          {third && (
            <div
              className="tk-rise flex items-center gap-3 rounded-2xl border border-hairline bg-white/80 px-4 py-2.5 shadow-[0_6px_18px_rgba(43,33,26,0.06)]"
              style={{ '--td': '1.3s' } as React.CSSProperties}
            >
              <span className="text-[17px]">🥉</span>
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-espresso">
                {third.name}
                {third.you && (
                  <span className="ml-1.5 rounded-full bg-rimon/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rimon">
                    you
                  </span>
                )}
              </p>
              <span className="shrink-0 text-[13px] font-bold text-espresso-soft">⭐ {third.points}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span
            className="tk-chip rounded-full border border-hairline bg-[#fffdf4] px-3.5 py-2 text-[11.5px] font-semibold text-espresso-soft shadow-[0_6px_18px_rgba(43,33,26,0.07)]"
            style={{ '--td': '5s' } as React.CSSProperties}
          >
            🏆 <b className="font-bold text-gold">{first.name}</b> +1 win
          </span>
          {myPlace > 0 && !first.you && (
            <span
              className="tk-chip rounded-full border border-hairline bg-[#fffdf4] px-3.5 py-2 text-[11.5px] font-semibold text-espresso-soft shadow-[0_6px_18px_rgba(43,33,26,0.07)]"
              style={{ '--td': '5.2s' } as React.CSSProperties}
            >
              you finished <b className="font-bold text-gold">#{myPlace}</b>
            </span>
          )}
          {first.you && (
            <span
              className="tk-chip rounded-full border border-hairline bg-[#fffdf4] px-3.5 py-2 text-[11.5px] font-semibold text-espresso-soft shadow-[0_6px_18px_rgba(43,33,26,0.07)]"
              style={{ '--td': '5.2s' } as React.CSSProperties}
            >
              that's <b className="font-bold text-gold">you</b> — kol hakavod!
            </span>
          )}
        </div>
      </div>

      <div
        className="tk-pop absolute inset-x-0 z-20 flex justify-center"
        style={{ bottom: 'calc(34px + env(safe-area-inset-bottom))', '--td': '5.5s' } as React.CSSProperties}
      >
        <PillButton variant="rimon" icon="→" onClick={onContinue}>
          Continue
        </PillButton>
      </div>
    </div>
  );
}
