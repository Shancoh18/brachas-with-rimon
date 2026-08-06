/**
 * Full-screen Rimon takeovers — the three celebration choreographies from
 * mascot-concepts/rimon-fullscreen-mockups (3-lens design panel + blind QA):
 *
 *  01 ChallengeTakeover — Rimon flies in from the bottom, pose-swaps to a
 *     thumbs-up at touchdown (squash + screen jolt), confetti, text cascade.
 *  02 StreakTakeover — "the kindling": Rimon set down with clay weight, the
 *     flame ignites (glow gathers → flare → one gold halo ripple), embers
 *     rise, stat chips land, then a shared-breath hold.
 *  04 BadgeTakeover — "lowered on its ribbon": the headline prints first,
 *     the medal card descends with a felt stop, swings like a hung medal
 *     (art counter-rotating inside), a shine sweep crosses as the name inks.
 *
 * Choreography timing lives in index.css (tk-* classes). Each plays once and
 * holds; breath loops keep the hold alive. Reduced-motion lands on the still.
 */
import { CHALLENGES } from '../lib/progress';
import { PillButton } from './ui';

const BASE = import.meta.env.BASE_URL;

const CONFETTI = [
  { left: '14%', top: '24%', background: '#c9a45c', rr: '230deg', cd: '1.95s' },
  { left: '30%', top: '18%', background: '#7d8b74', rr: '150deg', cd: '2.07s' },
  { left: '52%', top: '15%', background: '#a13327', rr: '320deg', cd: '2s' },
  { left: '70%', top: '20%', background: '#c9a45c', rr: '120deg', cd: '2.15s' },
  { left: '84%', top: '26%', background: '#7d8b74', rr: '260deg', cd: '2.04s' },
  { left: '42%', top: '28%', background: '#a87e2f', rr: '190deg', cd: '2.11s' },
];

const EMBERS = [
  { dx: '-16px', background: '#c9a45c', ed: '2.1s' },
  { dx: '-6px', background: '#e8c98a', ed: '2.26s', size: 5 },
  { dx: '7px', background: '#a87e2f', ed: '2.4s' },
  { dx: '14px', background: '#fffdf4', ed: '2.54s', size: 3 },
];

/** Per-challenge medal art — every badge gets its own Rimon render (all
 *  identity-locked Higgsfield stills; provenance in mascot-concepts/README.md).
 *  Unknown ids fall back to the generic crown medal. */
const BADGE_ART: Record<string, string> = {
  'first-steps': `${BASE}mascot/eats-apple.webp`, // First Fruits
  'seven-species': `${BASE}mascot/rimon-species.webp`, // the species minis
  'week-of-blessing': `${BASE}mascot/rimon-flame.webp`, // the streak flame
  'all-six': `${BASE}mascot/rimon-teaching.webp`, // teaching the six
  scholar: `${BASE}mascot/rimon-scholar.webp`, // cap + open book
  century: `${BASE}mascot/rimon-podium.webp`, // trophy podium
};

const SPARKS = [
  { sx: '-58px', sy: '-34px', sd: '2.35s' },
  { sx: '52px', sy: '-46px', sd: '2.4s' },
  { sx: '66px', sy: '18px', sd: '2.45s', size: 4 },
  { sx: '-64px', sy: '26px', sd: '2.43s', size: 4 },
  { sx: '8px', sy: '-70px', sd: '2.47s' },
];

function Eyebrow({ children, td }: { children: React.ReactNode; td: string }) {
  return (
    <p
      className="tk-rise text-[10px] font-bold uppercase tracking-[0.26em] text-gold"
      style={{ '--td': td } as React.CSSProperties}
    >
      {children}
    </p>
  );
}

/** 01 — challenge / meal complete. Fly-in → thumbs-up at touchdown. */
export function ChallengeTakeover({
  eyebrow,
  sub,
  points,
  onContinue,
}: {
  eyebrow: string;
  sub: string;
  points: number;
  onContinue: () => void;
}) {
  return (
    <div className="tk-root tk-grain" data-takeover="challenge">
      <div className="tk-jolt">
        <div className="tk-cover">
          <img className="tk-fly" src={`${BASE}mascot/rimon-flying.webp`} alt="" draggable={false} />
          <img className="tk-land" src={`${BASE}mascot/rimon-thumbsup.webp`} alt="" draggable={false} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 z-[18]">
        {CONFETTI.map((c, i) => (
          <i
            key={i}
            className="tk-confetti absolute"
            style={{ left: c.left, top: c.top, background: c.background, '--rr': c.rr, '--cd': c.cd } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 top-[9%] z-20 px-8 text-center">
        <Eyebrow td="2.15s">{eyebrow}</Eyebrow>
        <h2
          className="tk-rise mt-3 font-display text-[33px] font-medium leading-tight text-espresso"
          style={{ '--td': '2.3s' } as React.CSSProperties}
        >
          Kol hakavod!
        </h2>
        <p
          className="tk-rise mx-auto mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-espresso-soft"
          style={{ '--td': '2.45s' } as React.CSSProperties}
        >
          {sub}
        </p>
        {points > 0 && (
          <p
            className="tk-chip mx-auto mt-3 inline-block rounded-full border border-hairline bg-[#fffdf4] px-4 py-1.5 text-[12px] font-semibold text-espresso-soft shadow-[0_6px_18px_rgba(43,33,26,0.07)]"
            style={{ '--td': '2.7s' } as React.CSSProperties}
          >
            <b className="font-bold text-gold">+{points}</b> points
          </p>
        )}
      </div>
      <div
        className="tk-pop absolute inset-x-0 z-20 flex justify-center"
        style={{ bottom: 'calc(40px + env(safe-area-inset-bottom))', '--td': '2.85s' } as React.CSSProperties}
      >
        <PillButton variant="rimon" icon="→" onClick={onContinue}>
          Continue
        </PillButton>
      </div>
    </div>
  );
}

/** 02 — streak milestone: the kindling. */
export function StreakTakeover({
  streak,
  totalBrachos,
  points,
  line,
  onContinue,
}: {
  streak: number;
  totalBrachos: number;
  points: number;
  line: string;
  onContinue: () => void;
}) {
  return (
    <div className="tk-root tk-grain" data-takeover="streak">
      <div className="tk-cover">
        <img className="tk-flame" src={`${BASE}mascot/rimon-flame.webp`} alt="" draggable={false} />
        <div className="tk-floor" />
        <div className="tk-bloom" />
        <div className="tk-core" />
        <div className="tk-halo" />
        <div className="tk-embers pointer-events-none absolute inset-0">
          {EMBERS.map((e, i) => (
            <i
              key={i}
              style={{
                background: e.background,
                width: e.size ?? 4,
                height: e.size ?? 4,
                '--dx': e.dx,
                '--ed': e.ed,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 top-[9%] z-20 px-8 text-center">
        <Eyebrow td="1.1s">Streak · Day {streak}</Eyebrow>
        <h2
          className="tk-rise mt-3 font-display text-[31px] font-medium leading-tight text-espresso"
          style={{ '--td': '2.2s' } as React.CSSProperties}
        >
          {streak === 1 ? 'The flame is lit.' : 'The flame is burning.'}
        </h2>
        <p
          className="tk-rise mx-auto mt-2.5 max-w-[290px] text-[13px] leading-relaxed text-espresso-soft"
          style={{ '--td': '2.45s' } as React.CSSProperties}
        >
          {line}
        </p>
      </div>
      <div
        className="absolute inset-x-0 z-20 flex justify-center gap-2 px-4"
        style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
      >
        <span className="tk-chip rounded-full border border-hairline bg-[#fffdf4] px-3.5 py-2 text-[11.5px] font-semibold text-espresso-soft shadow-[0_6px_18px_rgba(43,33,26,0.07)]" style={{ '--td': '2.9s' } as React.CSSProperties}>
          <b className="font-bold text-gold">{streak}</b> day{streak === 1 ? '' : 's'} in a row
        </span>
        <span className="tk-chip rounded-full border border-hairline bg-[#fffdf4] px-3.5 py-2 text-[11.5px] font-semibold text-espresso-soft shadow-[0_6px_18px_rgba(43,33,26,0.07)]" style={{ '--td': '3.2s' } as React.CSSProperties}>
          <b className="font-bold text-gold">{totalBrachos}</b> brachos
        </span>
        {points > 0 && (
          <span className="tk-chip rounded-full border border-hairline bg-[#fffdf4] px-3.5 py-2 text-[11.5px] font-semibold text-espresso-soft shadow-[0_6px_18px_rgba(43,33,26,0.07)]" style={{ '--td': '3.5s' } as React.CSSProperties}>
            <b className="font-bold text-gold">+{points}</b> pts
          </span>
        )}
      </div>
      <div
        className="tk-pop absolute inset-x-0 z-20 flex justify-center"
        style={{ bottom: 'calc(34px + env(safe-area-inset-bottom))', '--td': '3.8s' } as React.CSSProperties}
      >
        <PillButton variant="rimon" icon="→" onClick={onContinue}>
          Keep it going
        </PillButton>
      </div>
    </div>
  );
}

/** 04 — badge earned: lowered on its ribbon. */
export function BadgeTakeover({
  badges,
  points,
  onContinue,
}: {
  badges: { id: string; label: string }[];
  points: number;
  onContinue: () => void;
}) {
  const first = badges[0];
  const meta = CHALLENGES.find((c) => c.id === first.id);
  return (
    <div className="tk-root tk-grain flex flex-col items-center" data-takeover="badge">
      <div className="z-20 px-8 pt-[9vh] text-center">
        <Eyebrow td="0.35s">Journey</Eyebrow>
        <h2
          className="tk-rise mt-3 font-display text-[31px] font-medium leading-tight text-espresso"
          style={{ '--td': '0.55s' } as React.CSSProperties}
        >
          A new badge.
        </h2>
      </div>
      <div className="z-20 flex w-full flex-1 flex-col items-center justify-center pb-[11vh]">
      <div className="relative w-[min(58vw,218px)]">
        <div className="tk-aura" />
        <div className="tk-card-shadow" />
        <div className="tk-card relative">
          <div className="tk-ring" />
          <div className="tk-swing">
            <div className="rounded-[26px] border border-hairline bg-white/90 p-[7px] shadow-[0_18px_44px_rgba(43,33,26,0.09)]">
              <div className="relative overflow-hidden rounded-[20px] border border-hairline">
                <span className="tk-shine" />
                <img
                  className={`tk-inner block aspect-[3/4] w-full bg-[#fdfbf7] ${
                    first.id === 'seven-species' ? 'object-contain' : 'object-cover'
                  }`}
                  style={{ objectPosition: '50% 70%' }}
                  src={BADGE_ART[first.id] ?? `${BASE}mascot/rimon-medal.webp`}
                  alt=""
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="tk-sparks pointer-events-none absolute inset-0 z-[21]">
          {SPARKS.map((s, i) => (
            <i
              key={i}
              style={{
                width: s.size ?? 5,
                height: s.size ?? 5,
                '--sx': s.sx,
                '--sy': s.sy,
                '--sd': s.sd,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      <div className="mt-[3.5vh] px-9 text-center">
        <h3
          className="tk-rise font-display text-[23px] font-medium text-espresso"
          style={{ '--td': '2.85s' } as React.CSSProperties}
        >
          {/* serif name only — emoji glyphs read off-canon on this screen */}
          {meta?.title ?? first.label.replace(/^\S+\s+/, '')}
        </h3>
        <p
          className="tk-rise mx-auto mt-2 max-w-[290px] text-[12px] leading-relaxed text-mocha"
          style={{ '--td': '3.25s' } as React.CSSProperties}
        >
          {meta?.description ?? 'Earned, not given. Kol hakavod!'}
          {points > 0 && <> · +{points} points</>}
        </p>
        {badges.length > 1 && (
          <div
            className="tk-rise mt-3 flex flex-wrap justify-center gap-2"
            style={{ '--td': '3.4s' } as React.CSSProperties}
          >
            {badges.slice(1).map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-gold/40 bg-gold/[0.1] px-3.5 py-1.5 text-[12px] font-bold text-gold"
              >
                {b.label} ✓
              </span>
            ))}
          </div>
        )}
      </div>
      </div>
      <div
        className="tk-pop absolute inset-x-0 z-20 flex justify-center"
        style={{ bottom: 'calc(34px + env(safe-area-inset-bottom))', '--td': '3.9s' } as React.CSSProperties}
      >
        <PillButton variant="rimon" icon="→" onClick={onContinue}>
          Continue
        </PillButton>
      </div>
    </div>
  );
}
