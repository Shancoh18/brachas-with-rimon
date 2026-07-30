/**
 * First-open tutorial — Rimon in live action, a different motion loop on
 * every step, ending with account creation (or a graceful skip).
 * Shown once; `onboarded` persists.
 */
import { useEffect, useState } from 'react';
import { apiRegister } from '../lib/api';
import { useBracha } from '../store';
import { Rimon, RimonWalker, type RimonPose } from '../components/Rimon';
import { Eyebrow, PillButton } from '../components/ui';

interface Step {
  pose: RimonPose;
  eyebrow: string;
  title: string;
  body: string;
  demo?: 'walker';
}

const STEPS: Step[] = [
  {
    pose: 'dance',
    eyebrow: 'Shalom!',
    title: 'I’m Rimon.',
    body: 'A pomegranate with one job: helping you thank properly for every bite. Tap me any time — I like it.',
  },
  {
    pose: 'thinking',
    eyebrow: 'Step one',
    title: 'Show me your meal.',
    body: 'Photograph your plate and I’ll work out what’s on it — you confirm, because a photo can’t always tell cooked from raw.',
  },
  {
    pose: 'walk',
    eyebrow: 'Step two',
    title: 'We walk the blessings together.',
    body: 'Every food has its blessing, and the blessings have an order. I walk the path with you — Hebrew, transliteration, audio, and the why.',
    demo: 'walker',
  },
  {
    pose: 'celebrate',
    eyebrow: 'Step three',
    title: 'Finish the meal properly.',
    body: 'When you’re done eating (no rush!), the right after-blessings are ready. Streaks, challenges, and a Learn library keep the practice alive.',
  },
];

export function Onboarding() {
  const { setOnboarded, displayName, setDisplayName, setServerAccount } = useBracha();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [walkerT, setWalkerT] = useState(0);

  // live walker demo — Rimon marches across the track on step 3
  useEffect(() => {
    if (STEPS[step]?.demo !== 'walker') return;
    const id = setInterval(() => setWalkerT((t) => (t >= 1 ? 0 : t + 0.25)), 900);
    return () => clearInterval(id);
  }, [step]);

  const atAccount = step >= STEPS.length;
  const s = STEPS[Math.min(step, STEPS.length - 1)];

  const join = async () => {
    const name = displayName.trim();
    const mail = email.trim().toLowerCase();
    if (!name) return setNotice('Pick a name first.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setNotice('That email doesn’t look right.');
    setBusy(true);
    try {
      const r = await apiRegister(name, mail);
      setServerAccount(r.token, r.code);
      setOnboarded(true);
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 409
          ? 'That email already has an account — recovery is coming soon; use another for now.'
          : 'Couldn’t reach the league right now — you can join later from the Friends tab.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="grain flex min-h-[100dvh] flex-col items-center justify-center gap-7 px-6 pb-10 pt-8 text-center">
      {/* skip — always available, never nags again */}
      <button
        onClick={() => setOnboarded(true)}
        className="fixed right-5 top-5 z-10 rounded-full bg-espresso/[0.05] px-4 py-2 text-[11px] font-bold text-espresso-soft transition-colors duration-150 hover:bg-espresso/10"
      >
        skip
      </button>

      {!atAccount ? (
        <>
          <div key={`r${step}`} className="rise-in">
            <Rimon pose={s.pose} size={200} />
          </div>

          {s.demo === 'walker' && (
            <div key={`w${step}`} className="rise-in rise-in-1 w-full">
              <RimonWalker progress={walkerT} done={walkerT >= 1} />
            </div>
          )}

          <header key={`h${step}`} className="rise-in rise-in-1 space-y-3">
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <h1 className="font-display text-[38px] font-black leading-[1.05] tracking-tight text-espresso">
              {s.title}
            </h1>
            <p className="mx-auto max-w-[310px] text-[14px] leading-relaxed text-espresso-soft">
              {s.body}
            </p>
          </header>

          <div className="flex items-center gap-2">
            {[...STEPS, null].map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  i === step ? 'w-8 bg-rimon' : i < step ? 'w-3 bg-gold' : 'w-3 bg-espresso/15'
                }`}
              />
            ))}
          </div>

          <PillButton variant="rimon" onClick={() => setStep(step + 1)}>
            {step === 0 ? 'Nice to meet you' : 'Next'}
          </PillButton>
        </>
      ) : (
        <>
          <div className="rise-in">
            <Rimon pose="pointing" say="Last thing — a name and email so friends can find you." size={160} />
          </div>
          <header className="rise-in rise-in-1 space-y-3">
            <Eyebrow>Join the league</Eyebrow>
            <h1 className="font-display text-[36px] font-black leading-[1.05] tracking-tight text-espresso">
              Make it yours.
            </h1>
            <p className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-espresso-soft">
              Your streaks sync, and friends can add you by email to see who gathers the most
              brachos each week.
            </p>
          </header>
          <div className="rise-in rise-in-2 w-full max-w-[320px] space-y-3 text-left">
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
            {notice && <p className="text-center text-[11.5px] font-medium text-rimon">{notice}</p>}
          </div>
          <div className="rise-in rise-in-3 flex flex-col items-center gap-3">
            <PillButton variant="rimon" icon="✓" onClick={() => void join()} disabled={busy}>
              {busy ? 'Joining…' : 'Create my account'}
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

      <p className="fixed bottom-4 left-0 right-0 text-center text-[10px] text-mocha">
        A study aid — for practical halachic questions, consult a qualified rabbi.
      </p>
    </div>
  );
}
