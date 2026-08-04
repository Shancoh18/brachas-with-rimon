/**
 * The one sign-in surface — used by the Account tab and the final
 * onboarding slide, so every prompt offers the same full menu:
 *
 *   · create account with email + password
 *   · sign in with email + password
 *   · sign in with the RIMON friend code (legacy accounts, pre-password)
 *   · Sign in with Apple (native iOS)
 *   · Continue with Google (wherever a Google client id is configured)
 *
 * All verification happens server-side; this panel only collects
 * credentials or forwards provider identity tokens.
 */
import { useState } from 'react';
import { apiOauth, apiRegister, apiSignIn } from '../lib/api';
import { appleAvailable, googleAvailable, loginWithApple, loginWithGoogle } from '../lib/socialAuth';
import { useBracha } from '../store';
import { PillButton } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 8;

const CARD = 'rounded-[1.25rem] bg-white/70 px-5 py-3.5 ring-1 ring-espresso/[0.07]';
const LABEL = 'text-[9.5px] font-bold uppercase tracking-[0.18em] text-mocha';
const FIELD =
  'mt-0.5 w-full bg-transparent text-[15px] font-medium text-espresso outline-none placeholder:text-mocha/40';

export function AuthPanel({ onDone }: { onDone?: () => void }) {
  const { displayName, setDisplayName, setUserEmail, setServerAccount, userEmail } = useBracha();

  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [name, setName] = useState(displayName);
  const [email, setEmail] = useState(userEmail ?? '');
  const [password, setPassword] = useState('');
  const [codeIn, setCodeIn] = useState('');
  const [useCode, setUseCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const finish = (r: { token: string; code: string; name?: string; email?: string | null }) => {
    setServerAccount(r.token, r.code);
    if (r.name) setDisplayName(r.name);
    if (r.email !== undefined) setUserEmail(r.email ?? null);
    setNotice(null);
    onDone?.();
  };

  const create = async () => {
    const n = name.trim();
    const mail = email.trim().toLowerCase();
    if (!n) return setNotice('Pick a name first.');
    if (!EMAIL_RE.test(mail)) return setNotice('That email doesn’t look right.');
    if (password.length < PASSWORD_MIN)
      return setNotice(`Pick a password of at least ${PASSWORD_MIN} characters.`);
    setBusy(true);
    try {
      const r = await apiRegister(n, mail, password);
      setDisplayName(n);
      finish({ ...r, name: n, email: mail });
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 409
          ? 'That email already has an account — switch to Sign in.'
          : 'Couldn’t reach the league right now — try again in a moment.',
      );
    }
    setBusy(false);
  };

  const signIn = async () => {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setNotice('That email doesn’t look right.');
    if (useCode && !codeIn.trim()) return setNotice('Enter your RIMON friend code.');
    if (!useCode && !password) return setNotice('Enter your password.');
    setBusy(true);
    try {
      const r = await apiSignIn(mail, useCode ? { code: codeIn.trim() } : { password });
      finish(r);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setNotice(
        status === 403
          ? 'This account has no password yet — sign in with your RIMON friend code below, then set a password in Account.'
          : status === 404
            ? useCode
              ? 'No account matches that email + code pair. Check both, or create a new account.'
              : 'Email or password doesn’t match. Try again, or use your friend code.'
            : 'Couldn’t reach the league right now — try again in a moment.',
      );
      if (status === 403) setUseCode(true);
    }
    setBusy(false);
  };

  const social = async (provider: 'apple' | 'google') => {
    setBusy(true);
    try {
      const id = await (provider === 'apple' ? loginWithApple() : loginWithGoogle());
      const r = await apiOauth(provider, id.idToken, id.name);
      finish(r);
    } catch (e) {
      const status = (e as { status?: number }).status;
      // user closing the provider sheet is not an error worth a red line
      const msg = String((e as Error).message ?? '');
      if (/cancel|dismiss|1001|closed/i.test(msg)) setNotice(null);
      else
        setNotice(
          status === 501
            ? 'Google sign-in isn’t switched on yet — use email instead.'
            : status === 401
              ? 'That sign-in couldn’t be verified — try again.'
              : `Couldn’t complete ${provider === 'apple' ? 'Apple' : 'Google'} sign-in — try again or use email.`,
        );
    }
    setBusy(false);
  };

  const showApple = appleAvailable();
  const showGoogle = googleAvailable();

  return (
    <div className="w-full max-w-[320px] space-y-3">
      {/* create / sign-in toggle */}
      <div className="mx-auto flex w-max rounded-full bg-espresso/[0.05] p-1 ring-1 ring-espresso/[0.07]">
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

      <div className="space-y-2.5 text-left">
        {mode === 'create' && (
          <div className={CARD}>
            <label className={LABEL}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shan"
              maxLength={20}
              className={FIELD}
            />
          </div>
        )}
        <div className={CARD}>
          <label className={LABEL}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={FIELD}
          />
        </div>
        {(mode === 'create' || !useCode) && (
          <div className={CARD}>
            <label className={LABEL}>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              placeholder={mode === 'create' ? `${PASSWORD_MIN}+ characters` : 'your password'}
              className={FIELD}
            />
          </div>
        )}
        {mode === 'signin' && useCode && (
          <div className={CARD}>
            <label className={LABEL}>Your friend code</label>
            <input
              value={codeIn}
              onChange={(e) => setCodeIn(e.target.value.toUpperCase())}
              placeholder="RIMON-XXXX"
              maxLength={10}
              className="mt-0.5 w-full bg-transparent font-display text-[17px] font-bold tracking-wide text-espresso outline-none placeholder:text-[13px] placeholder:font-sans placeholder:font-medium placeholder:text-mocha/40"
            />
          </div>
        )}
        {mode === 'signin' && (
          <button
            onClick={() => {
              setUseCode(!useCode);
              setNotice(null);
            }}
            className="px-1 text-[11px] font-medium text-gold underline-offset-2 hover:underline"
          >
            {useCode ? 'use email + password instead' : 'no password? sign in with your friend code'}
          </button>
        )}
      </div>

      {notice && <p className="text-center text-[11.5px] font-medium text-rimon">{notice}</p>}

      <div className="flex flex-col items-center gap-2.5 pt-1.5">
        <PillButton
          variant="rimon"
          icon="✓"
          onClick={() => void (mode === 'create' ? create() : signIn())}
          disabled={busy}
        >
          {busy ? 'One moment…' : mode === 'create' ? 'Create my account' : 'Sign in'}
        </PillButton>
      </div>

      {(showApple || showGoogle) && (
        <>
          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-espresso/[0.08]" />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-mocha">or</span>
            <span className="h-px flex-1 bg-espresso/[0.08]" />
          </div>
          <div className="flex flex-col items-center gap-2">
            {showApple && (
              <button
                onClick={() => void social('apple')}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-black py-3 text-[13.5px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="currentColor" aria-hidden>
                  <path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.9-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.7-3.8ZM14.4 5.6c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z" />
                </svg>
                Sign in with Apple
              </button>
            )}
            {showGoogle && (
              <button
                onClick={() => void social('google')}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-white py-3 text-[13.5px] font-semibold text-espresso ring-1 ring-espresso/[0.12] transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" aria-hidden>
                  <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.6 2.8c2.2-2 3.8-5 3.8-8.5Z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.6-2.8c-1 .7-2.4 1.2-4.3 1.2-3.3 0-6.1-2.2-7.1-5.2l-3.8 2.9C3.1 21.3 7.2 24 12 24Z" />
                  <path fill="#FBBC05" d="M4.9 14.3c-.3-.8-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.1 6.8C.4 8.4 0 10.1 0 12s.4 3.6 1.1 5.2l3.8-2.9Z" />
                  <path fill="#EA4335" d="M12 4.6c2.3 0 3.9 1 4.8 1.9l3.2-3.2C18 1.3 15.2 0 12 0 7.2 0 3.1 2.7 1.1 6.8l3.8 2.9c1-3 3.8-5.1 7.1-5.1Z" />
                </svg>
                Continue with Google
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
