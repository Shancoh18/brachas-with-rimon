/**
 * First-open experience v2 — a full-screen SLIDESHOW.
 * Stories-style: segmented progress bars up top that auto-advance, tap the
 * right side for next / left for back, swipe on touch, every slide a
 * full-bleed scene with a different tint and a different Rimon motion loop.
 * Final slide: account creation (name + email) with a graceful skip.
 */
import { useEffect, useRef, useState } from 'react';
import { apiRegister, apiSignIn } from '../lib/api';
import { useBracha } from '../store';
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
  cta: string;
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
    pose: 'celebrate',
    rimonSize: 190,
    tint: 'radial-gradient(ellipse 90% 62% at 50% 30%, rgba(168,126,47,0.14) 0%, rgba(0,0,0,0) 70%)',
    eyebrow: 'Step three',
    title: 'Make it a practice.',
    body: 'Streaks, challenges, a daily Learn library — and a league where friends see who gathers the most brachos.',
    demo: 'streak',
    cta: 'Next',
  },
];

export function Onboarding() {
  const { setOnboarded, displayName, setDisplayName, setServerAccount, setUserEmail, serverToken } = useBracha();
  const [idx, setIdx] = useState(0);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [codeIn, setCodeIn] = useState('');
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

  const join = async () => {
    const name = displayName.trim();
    const mail = email.trim().toLowerCase();
    if (!name) return setNotice('Pick a name first.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setNotice('That email doesn’t look right.');
    setBusy(true);
    try {
      const r = await apiRegister(name, mail);
      setServerAccount(r.token, r.code);
      setUserEmail(mail);
      setOnboarded(true);
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 409
          ? 'That email already has an account — switch to Sign in above and use your RIMON code.'
          : 'Couldn’t reach the league right now — you can join later from the Friends tab.',
      );
      setBusy(false);
    }
  };

  const signIn = async () => {
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setNotice('That email doesn’t look right.');
    if (!codeIn.trim()) return setNotice('Enter your RIMON friend code — it’s your key.');
    setBusy(true);
    try {
      const r = await apiSignIn(mail, codeIn.trim());
      setServerAccount(r.token, r.code);
      setDisplayName(r.name);
      setUserEmail(r.email);
      setOnboarded(true);
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 404
          ? 'No account matches that email + code pair. Check both, or create a new account.'
          : 'Couldn’t reach the league right now — try again, or continue as guest below.',
      );
      setBusy(false);
    }
  };

  return (
    <div
      className="grain fixed inset-0 overflow-hidden bg-cream"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
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
              <Rimon pose={s.pose} size={s.rimonSize} float={i === idx} />
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
              say={
                mode === 'create'
                  ? 'Last thing — a name and email so friends can find you.'
                  : 'Welcome back! Your email + code, and your streaks come home.'
              }
              size={150}
            />
          </div>
          <header className={`space-y-2.5 ${atAccount ? 'rise-in rise-in-1' : ''}`}>
            <Eyebrow>{mode === 'create' ? 'Join the league' : 'Welcome back'}</Eyebrow>
            <h1 className="font-display text-[36px] font-black leading-[1.05] tracking-tight text-espresso">
              {mode === 'create' ? 'Make it yours.' : 'Sign back in.'}
            </h1>
            <p className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-espresso-soft">
              {mode === 'create'
                ? 'Streaks that sync, friends who can find you by email, a league to lead.'
                : 'Your email plus your RIMON friend code — that pair is your key.'}
            </p>
          </header>

          {/* create / sign-in toggle */}
          <div className={`flex rounded-full bg-espresso/[0.05] p-1 ring-1 ring-espresso/[0.07] ${atAccount ? 'rise-in rise-in-1' : ''}`}>
            {(['create', 'signin'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setNotice(null);
                }}
                className={`rounded-full px-5 py-2 text-[12px] font-semibold transition-[background-color,color,transform] duration-150 ease-out ${
                  mode === m ? 'bg-espresso text-cream' : 'text-espresso-soft'
                }`}
              >
                {m === 'create' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          <div className={`w-full max-w-[320px] space-y-3 text-left ${atAccount ? 'rise-in rise-in-2' : ''}`}>
            {mode === 'create' && (
              <div className="rounded-[1.25rem] bg-white/70 px-5 py-3.5 ring-1 ring-espresso/[0.07]">
                <label className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-mocha">Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Shan"
                  maxLength={20}
                  className="mt-0.5 w-full bg-transparent text-[16px] font-semibold text-espresso outline-none placeholder:text-mocha/40"
                />
              </div>
            )}
            <div className="rounded-[1.25rem] bg-white/70 px-5 py-3.5 ring-1 ring-espresso/[0.07]">
              <label className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-mocha">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-0.5 w-full bg-transparent text-[15px] font-medium text-espresso outline-none placeholder:text-mocha/40"
              />
            </div>
            {mode === 'signin' && (
              <div className="rounded-[1.25rem] bg-white/70 px-5 py-3.5 ring-1 ring-espresso/[0.07]">
                <label className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-mocha">Your friend code</label>
                <input
                  value={codeIn}
                  onChange={(e) => setCodeIn(e.target.value.toUpperCase())}
                  placeholder="RIMON-XXXX"
                  maxLength={10}
                  className="mt-0.5 w-full bg-transparent font-display text-[17px] font-bold tracking-wide text-espresso outline-none placeholder:text-[13px] placeholder:font-sans placeholder:font-medium placeholder:text-mocha/40"
                />
              </div>
            )}
            {notice && <p className="text-center text-[11.5px] font-medium text-rimon">{notice}</p>}
          </div>
          <div className={`flex flex-col items-center gap-2.5 ${atAccount ? 'rise-in rise-in-3' : ''}`}>
            <PillButton
              variant="rimon"
              icon="✓"
              onClick={() => void (mode === 'create' ? join() : signIn())}
              disabled={busy}
            >
              {busy ? 'One moment…' : mode === 'create' ? 'Create my account' : 'Sign in'}
            </PillButton>
            <button
              onClick={() => setOnboarded(true)}
              className="text-[12px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
            >
              maybe later — take me to the app
            </button>
          </div>
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
