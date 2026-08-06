/**
 * First-open experience v2 — a full-screen SLIDESHOW.
 * Stories-style: segmented progress bars up top that auto-advance, tap the
 * right side for next / left for back, swipe on touch, every slide a
 * full-bleed scene with a different tint and a different Rimon motion loop.
 * Final slide: account creation. The app is account-first, so declining here
 * lands on the sign-in gate (AuthGate) — the skip button says so honestly.
 */
import { useEffect, useRef, useState } from 'react';
import { useBracha } from '../store';
import { AuthPanel } from '../components/AuthPanel';
import { Rimon, RimonWalker, type RimonPose } from '../components/Rimon';
import { Eyebrow, PillButton } from '../components/ui';

const BASE = import.meta.env.BASE_URL;
const AUTO_MS = 8000;

const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Slide {
  pose: RimonPose;
  rimonSize: number;
  tint: string; // full-bleed scene wash
  eyebrow: string;
  title: string;
  body: string;
  demo?: 'walker' | 'foods' | 'streak';
  /** 'eating' replaces the hero Rimon with the chewing food-cycle */
  hero?: 'eating';
  cta: string;
}

/** Rimon happily eating his way through the food groups — the stills cycle
 *  with a chew squash, so the blessing→bite lesson has a living picture. */
const EATS = ['eats-apple', 'eats-bread', 'eats-grape-juice', 'eats-cake', 'eats-carrot', 'eats-treats'];
function EatingRimon({ active, size }: { active: boolean; size: number }) {
  const [bite, setBite] = useState(0);
  useEffect(() => {
    if (!active || reducedMotion()) return;
    const id = setInterval(() => setBite((b) => (b + 1) % EATS.length), 1600);
    return () => clearInterval(id);
  }, [active]);
  return (
    <div className={active && !reducedMotion() ? 'rimon-chew' : ''} style={{ width: size, height: size }}>
      <img
        key={bite}
        src={`${BASE}mascot/${EATS[bite]}.webp`}
        alt="Rimon taking a bite"
        draggable={false}
        className="rimon-blend bubble-pop h-full w-full object-cover"
      />
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    pose: 'dance',
    rimonSize: 230,
    tint: 'radial-gradient(ellipse 90% 62% at 50% 30%, rgba(161,51,39,0.10) 0%, rgba(0,0,0,0) 70%)',
    eyebrow: 'Shalom!',
    title: 'I’m Rimon.',
    body: 'A pomegranate with one job: helping you thank properly for every bite.',
    cta: 'Nice to meet you',
  },
  {
    pose: 'thinking',
    rimonSize: 190,
    tint: 'radial-gradient(ellipse 90% 62% at 50% 30%, rgba(168,126,47,0.12) 0%, rgba(0,0,0,0) 70%)',
    eyebrow: 'Step one',
    title: 'Show me your meal.',
    body: 'Photograph your plate and I’ll work out what’s on it. You confirm every item — a photo can’t always tell cooked from raw.',
    demo: 'foods',
    cta: 'Next',
  },
  {
    pose: 'walk',
    rimonSize: 170,
    tint: 'radial-gradient(ellipse 90% 62% at 50% 30%, rgba(125,139,116,0.14) 0%, rgba(0,0,0,0) 70%)',
    eyebrow: 'Step two',
    title: 'We walk the blessings together.',
    body: 'Every food has its blessing, and the blessings have an order. Hebrew, transliteration, audio — and the why.',
    demo: 'walker',
    cta: 'Next',
  },
  {
    pose: 'idle',
    rimonSize: 200,
    tint: 'radial-gradient(ellipse 90% 62% at 50% 30%, rgba(161,51,39,0.12) 0%, rgba(0,0,0,0) 70%)',
    eyebrow: 'Step three',
    title: 'Then — take a bite!',
    body: 'Right after each blessing, eat from that food — the blessing and the bite belong together, with nothing in between. Then on to the next one.',
    hero: 'eating',
    cta: 'Next',
  },
  {
    pose: 'celebrate',
    rimonSize: 190,
    tint: 'radial-gradient(ellipse 90% 62% at 50% 30%, rgba(168,126,47,0.14) 0%, rgba(0,0,0,0) 70%)',
    eyebrow: 'Step four',
    title: 'Make it a practice.',
    body: 'Streaks, challenges, a daily Learn library — and a league where friends see who gathers the most brachos.',
    demo: 'streak',
    cta: 'Next',
  },
];

export function Onboarding() {
  const { setOnboarded, displayName, serverToken } = useBracha();
  const [idx, setIdx] = useState(0);
  const [walkerT, setWalkerT] = useState(0);
  const touchX = useRef<number | null>(null);
  const total = SLIDES.length + 1; // + account slide
  const atAccount = idx >= SLIDES.length;

  // stories auto-advance (never off the account slide, never under reduced motion)
  useEffect(() => {
    if (atAccount || reducedMotion()) return;
    const id = setTimeout(() => setIdx((i) => Math.min(i + 1, SLIDES.length)), AUTO_MS);
    return () => clearTimeout(id);
  }, [idx, atAccount]);

  // live walker demo
  useEffect(() => {
    if (SLIDES[idx]?.demo !== 'walker') return;
    const id = setInterval(() => setWalkerT((t) => (t >= 1 ? 0 : t + 0.25)), 900);
    return () => clearInterval(id);
  }, [idx]);

  const next = () => setIdx((i) => Math.min(i + 1, SLIDES.length));
  const back = () => setIdx((i) => Math.max(i - 1, 0));

  return (
    <div
      className="grain fixed inset-0 overflow-hidden bg-cream"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        // No swipe-nav on the account slide — dragging a text cursor in the
        // form must never yank the user off it (tap zones are gated the same).
        if (atAccount) return;
        if (Math.abs(dx) < 48) return;
        if (dx < 0) next();
        else back();
      }}
    >
      {/* stories progress rail */}
      <div className="absolute inset-x-4 top-4 z-20 flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-espresso/[0.1]">
            <div
              key={`${i}-${idx}`}
              className={`h-full rounded-full bg-rimon ${
                i < idx ? 'w-full' : i === idx && !atAccount && !reducedMotion() ? 'story-fill' : i === idx ? 'w-full' : 'w-0'
              }`}
              style={i === idx && !atAccount ? { animationDuration: `${AUTO_MS}ms` } : undefined}
            />
          </div>
        ))}
      </div>

      {!atAccount && (
        <button
          onClick={() => setIdx(total - 1)}
          className="absolute right-4 top-8 z-20 rounded-full bg-espresso/[0.06] px-4 py-2 text-[11px] font-bold text-espresso-soft transition-colors duration-150 hover:bg-espresso/10"
        >
          skip
        </button>
      )}

      {/* tap zones (under the interactive layer, not on the account slide) */}
      {!atAccount && (
        <>
          <button aria-label="previous slide" onClick={back} className="absolute inset-y-0 left-0 z-10 w-1/4 cursor-w-resize opacity-0" />
          <button aria-label="next slide" onClick={next} className="absolute inset-y-0 right-0 z-10 w-1/4 cursor-e-resize opacity-0" />
        </>
      )}

      {/* the sliding track */}
      <div
        className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {SLIDES.map((s, i) => (
          <section
            key={s.title}
            className="relative flex h-full w-full shrink-0 flex-col items-center justify-center gap-6 px-8 pb-20 pt-16 text-center"
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: s.tint }} />
            <div className={i === idx ? 'rise-in' : ''}>
              {s.hero === 'eating' ? (
                <EatingRimon active={i === idx} size={s.rimonSize} />
              ) : (
                <Rimon pose={s.pose} size={s.rimonSize} float={i === idx} />
              )}
            </div>

            {s.demo === 'walker' && (
              <div className="w-full max-w-[320px]">
                <RimonWalker progress={i === idx ? walkerT : 0} done={walkerT >= 1 && i === idx} />
              </div>
            )}
            {s.demo === 'foods' && (
              <div className="flex items-center justify-center gap-2">
                {['eats-bread', 'eats-apple', 'eats-carrot'].map((f, k) => (
                  <img
                    key={f}
                    src={`${BASE}mascot/${f}.webp`}
                    alt=""
                    className="rimon-blend h-16 w-16 object-cover"
                    style={{ transform: `rotate(${(k - 1) * 7}deg)` }}
                  />
                ))}
              </div>
            )}
            {s.demo === 'streak' && (
              <div className="flex items-center justify-center gap-2">
                <span className="rounded-full bg-rimon/[0.09] px-4 py-2 text-[14px] font-bold text-rimon">🔥 12-day streak</span>
                <span className="rounded-full border border-gold/35 bg-gold/[0.08] px-4 py-2 text-[13px] font-bold text-gold">🍇 Seven Species ✓</span>
              </div>
            )}

            <header className={`space-y-3 ${i === idx ? 'rise-in rise-in-1' : ''}`}>
              <Eyebrow>{s.eyebrow}</Eyebrow>
              <h1 className="font-display text-[40px] font-black leading-[1.04] tracking-tight text-espresso">
                {s.title}
              </h1>
              <p className="mx-auto max-w-[310px] text-[14px] leading-relaxed text-espresso-soft">{s.body}</p>
            </header>

            <div className="relative z-20">
              <PillButton variant="rimon" onClick={next}>
                {s.cta}
              </PillButton>
            </div>
          </section>
        ))}

        {/* ------------------------------------------------ account slide */}
        <section className="relative flex h-full w-full shrink-0 flex-col items-center justify-center gap-5 overflow-y-auto px-8 pb-16 pt-16 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 90% 62% at 50% 26%, rgba(161,51,39,0.08) 0%, rgba(0,0,0,0) 70%)' }}
          />
          {serverToken ? (
            /* replaying the intro while signed in — no forms, just a bow */
            <>
              <div className={atAccount ? 'rise-in' : ''}>
                <Rimon
                  pose="celebrate"
                  say={`Good to see you again${displayName ? `, ${displayName}` : ''}! Everything is already yours.`}
                  size={170}
                />
              </div>
              <header className={`space-y-2.5 ${atAccount ? 'rise-in rise-in-1' : ''}`}>
                <Eyebrow>All set</Eyebrow>
                <h1 className="font-display text-[36px] font-black leading-[1.05] tracking-tight text-espresso">
                  You’re signed in.
                </h1>
                <p className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-espresso-soft">
                  Streaks, league, reminders — all synced to your account.
                </p>
              </header>
              <div className={atAccount ? 'rise-in rise-in-2' : ''}>
                <PillButton variant="rimon" icon="→" onClick={() => setOnboarded(true)}>
                  Back to the app
                </PillButton>
              </div>
            </>
          ) : (
            <>
          <div className={atAccount ? 'rise-in' : ''}>
            <Rimon
              pose="pointing"
              say="Last thing — an account, so your streaks follow you anywhere."
              size={130}
            />
          </div>
          <header className={`space-y-2 ${atAccount ? 'rise-in rise-in-1' : ''}`}>
            <Eyebrow>Join the league</Eyebrow>
            <h1 className="font-display text-[34px] font-black leading-[1.05] tracking-tight text-espresso">
              Make it yours.
            </h1>
            <p className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-espresso-soft">
              Streaks that sync, friends who can find you, a league to lead.
            </p>
          </header>

          <div className={atAccount ? 'rise-in rise-in-2' : ''}>
            <AuthPanel onDone={() => setOnboarded(true)} />
          </div>
          <button
            onClick={() => setOnboarded(true)}
            className={`text-[12px] font-medium text-mocha transition-colors duration-150 hover:text-espresso ${atAccount ? 'rise-in rise-in-3' : ''}`}
          >
            skip the tour — continue to sign-in
          </button>
            </>
          )}
        </section>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-0 right-0 z-20 text-center text-[9.5px] text-mocha">
        A study aid — for practical halachic questions, consult a qualified rabbi.
      </p>
    </div>
  );
}
