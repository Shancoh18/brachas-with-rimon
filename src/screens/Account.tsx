/**
 * Account screen — the in-app home for everything sign-in.
 *
 * Signed OUT: create-account / sign-in tabs, so a device that skipped
 * onboarding (or a returning user on a new phone) can join or come back
 * without wiping the app.
 * Signed IN: profile card (name + email, editable, saved to the server),
 * friend code with copy, replay-the-intro, and sign out.
 *
 * No passwords by design — email + RIMON friend code is the key pair.
 * Email verification / recovery ships when a mail provider exists.
 */
import { useEffect, useState } from 'react';
import { apiDeleteAccount, apiMe, apiRegister, apiSignIn, apiUpdateAccount } from '../lib/api';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function Account() {
  const {
    setScreen,
    displayName,
    setDisplayName,
    serverToken,
    friendCode,
    userEmail,
    setUserEmail,
    setServerAccount,
    clearServerAccount,
    setOnboarded,
  } = useBracha();

  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [name, setName] = useState(displayName);
  const [email, setEmail] = useState(userEmail ?? '');
  const [codeIn, setCodeIn] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // restore the profile card from the server (also self-heals a stale token)
  useEffect(() => {
    if (!serverToken) return;
    apiMe(serverToken)
      .then((r) => {
        setName(r.name);
        setEmail(r.email ?? '');
        setDisplayName(r.name);
        setUserEmail(r.email);
      })
      .catch((e) => {
        if ((e as { status?: number }).status === 401) clearServerAccount();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToken]);

  const create = async () => {
    const n = name.trim();
    const mail = email.trim().toLowerCase();
    if (!n) return setNotice('Pick a name first.');
    if (!EMAIL_RE.test(mail)) return setNotice('That email doesn’t look right.');
    setBusy(true);
    try {
      const r = await apiRegister(n, mail);
      setServerAccount(r.token, r.code);
      setDisplayName(n);
      setUserEmail(mail);
      setNotice(null);
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 409
          ? 'That email already has an account — switch to Sign in and use your RIMON code.'
          : 'Couldn’t reach the league right now — try again in a moment.',
      );
    }
    setBusy(false);
  };

  const signIn = async () => {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setNotice('That email doesn’t look right.');
    if (!codeIn.trim()) return setNotice('Enter your RIMON friend code — it’s your key.');
    setBusy(true);
    try {
      const r = await apiSignIn(mail, codeIn.trim());
      setServerAccount(r.token, r.code);
      setDisplayName(r.name);
      setName(r.name);
      setUserEmail(r.email);
      setNotice(null);
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 404
          ? 'No account matches that email + code pair. Check both, or create a new account.'
          : 'Couldn’t reach the league right now — try again in a moment.',
      );
    }
    setBusy(false);
  };

  const saveProfile = async () => {
    if (!serverToken) return;
    const n = name.trim();
    const mail = email.trim().toLowerCase();
    if (!n) return setNotice('Your name can’t be empty.');
    if (!EMAIL_RE.test(mail)) return setNotice('That email doesn’t look right.');
    setBusy(true);
    try {
      const r = await apiUpdateAccount(serverToken, { name: n, email: mail });
      setDisplayName(r.name);
      setUserEmail(r.email);
      setNotice(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setNotice(
        status === 409
          ? 'That email belongs to another account.'
          : status === 401
            ? 'Your session expired — sign in again below.'
            : 'Couldn’t save right now — try again in a moment.',
      );
      if (status === 401) clearServerAccount();
    }
    setBusy(false);
  };

  const field =
    'mt-0.5 w-full bg-transparent text-[15px] font-medium text-espresso outline-none placeholder:text-mocha/40';
  const label = 'text-[9.5px] font-bold uppercase tracking-[0.18em] text-mocha';

  return (
    <ScreenShell wide>
      <div className="pb-24">
        <button
          onClick={() => setScreen('welcome')}
          className="rise-in pb-4 text-[12.5px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
        >
          ← home
        </button>

        <header className="rise-in flex items-start justify-between gap-4 pb-6">
          <div className="space-y-2">
            <Eyebrow>{serverToken ? 'Your account' : 'Join or sign in'}</Eyebrow>
            <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">
              {serverToken ? 'Account' : 'Sign in'}
            </h2>
            <p className="max-w-[300px] text-[13px] leading-relaxed text-espresso-soft">
              {serverToken
                ? 'Your name, your email, your key — all in one place.'
                : 'An account syncs streaks across devices and puts you in the friends league.'}
            </p>
          </div>
          <Rimon pose="pointing" size={88} className="shrink-0" />
        </header>

        {serverToken ? (
          <>
            {/* profile */}
            <Bezel className="rise-in rise-in-1" innerClassName="px-5 py-4">
              <label className={label}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className={field} />
              <label className={`${label} mt-3 block border-t border-espresso/[0.07] pt-3`}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                className={field}
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[10px] leading-snug text-mocha">
                  Friends find you by email or code.
                </p>
                <PillButton icon="✓" onClick={() => void saveProfile()} disabled={busy}>
                  {saved ? 'Saved!' : busy ? 'Saving…' : 'Save changes'}
                </PillButton>
              </div>
            </Bezel>

            {/* the key */}
            <Bezel className="rise-in rise-in-2 mt-3" innerClassName="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={label}>Your friend code — your key</p>
                  <p className="font-display text-[24px] font-bold tracking-wide text-gold">{friendCode}</p>
                </div>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(friendCode ?? '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-full bg-espresso/[0.05] px-4 py-2 text-[11px] font-bold text-espresso-soft transition-colors hover:bg-espresso/10"
                >
                  {copied ? 'copied ✓' : 'copy'}
                </button>
              </div>
              <p className="mt-3 border-t border-espresso/[0.07] pt-3 text-[10.5px] leading-relaxed text-mocha">
                There are no passwords here: your email plus this code signs you in on any device.
                Keep the code private — treat it like a password. Email verification and account
                recovery arrive in a future update.
              </p>
            </Bezel>

            {notice && <p className="rise-in pt-3 text-center text-[12px] font-medium text-rimon">{notice}</p>}

            {/* extras */}
            <div className="rise-in rise-in-3 flex flex-col items-center gap-4 pt-8">
              <PillButton
                variant="rimon"
                icon="▶"
                onClick={() => {
                  setOnboarded(false);
                }}
              >
                Watch the intro again
              </PillButton>
              <button
                onClick={() => {
                  clearServerAccount();
                  setNotice(null);
                  setCodeIn('');
                }}
                className="text-[12px] font-medium text-mocha transition-colors duration-150 hover:text-rimon"
              >
                sign out on this device
              </button>
              <p className="max-w-[290px] text-center text-[10px] leading-snug text-mocha">
                Signing out keeps your local streaks on this device; your league account stays safe
                on the server — sign back in any time with email + code.
              </p>

              {/* permanent deletion — inline two-step confirm */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="pt-2 text-[11px] font-medium text-mocha/70 transition-colors duration-150 hover:text-rimon"
                >
                  delete my account permanently
                </button>
              ) : (
                <div className="mt-2 w-full max-w-[320px] rounded-[1.25rem] bg-rimon/[0.06] px-5 py-4 ring-1 ring-rimon/20">
                  <p className="text-[12px] font-semibold text-espresso">Delete your account?</p>
                  <p className="mt-1 text-[10.5px] leading-snug text-espresso-soft">
                    This erases your league account, friends, and synced progress from the server —
                    permanently. There is no undo, and your friend code stops working.
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-4">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-[11.5px] font-semibold text-espresso-soft hover:text-espresso"
                    >
                      keep my account
                    </button>
                    <button
                      onClick={async () => {
                        if (!serverToken) return;
                        setBusy(true);
                        try {
                          await apiDeleteAccount(serverToken);
                          clearServerAccount();
                          setConfirmDelete(false);
                          setNotice('Your account has been deleted. Local streaks on this device remain yours.');
                        } catch {
                          setNotice('Couldn’t reach the server — try again in a moment.');
                        }
                        setBusy(false);
                      }}
                      disabled={busy}
                      className="rounded-full bg-rimon px-4 py-2 text-[11.5px] font-bold text-cream transition-transform duration-150 ease-out active:scale-95"
                    >
                      {busy ? 'Deleting…' : 'Delete forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* create / sign-in toggle */}
            <div className="rise-in rise-in-1 mb-4 flex w-max rounded-full bg-espresso/[0.05] p-1 ring-1 ring-espresso/[0.07]">
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

            <Bezel className="rise-in rise-in-2" innerClassName="px-5 py-4">
              {mode === 'create' && (
                <>
                  <label className={label}>Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Shan"
                    maxLength={20}
                    className={field}
                  />
                  <div className="mt-3 border-t border-espresso/[0.07]" />
                </>
              )}
              <label className={`${label} ${mode === 'create' ? 'mt-3 block' : ''}`}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={field}
              />
              {mode === 'signin' && (
                <>
                  <label className={`${label} mt-3 block border-t border-espresso/[0.07] pt-3`}>
                    Your friend code
                  </label>
                  <input
                    value={codeIn}
                    onChange={(e) => setCodeIn(e.target.value.toUpperCase())}
                    placeholder="RIMON-XXXX"
                    maxLength={10}
                    className="mt-0.5 w-full bg-transparent font-display text-[17px] font-bold tracking-wide text-espresso outline-none placeholder:text-[13px] placeholder:font-sans placeholder:font-medium placeholder:text-mocha/40"
                  />
                </>
              )}
            </Bezel>

            {notice && <p className="rise-in pt-3 text-center text-[12px] font-medium text-rimon">{notice}</p>}

            <div className="rise-in rise-in-3 flex flex-col items-center gap-3 pt-6">
              <PillButton
                variant="rimon"
                icon="✓"
                onClick={() => void (mode === 'create' ? create() : signIn())}
                disabled={busy}
              >
                {busy ? 'One moment…' : mode === 'create' ? 'Create my account' : 'Sign in'}
              </PillButton>
              <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-mocha">
                No passwords — your email + RIMON friend code is the key pair. Signing in on a new
                device brings your name and league along.
              </p>
            </div>
          </>
        )}

        <p className="pt-8 text-center">
          <a
            href="https://shancoh18.github.io/brachas-with-rimon/privacy.html"
            target="_blank"
            rel="noreferrer"
            className="text-[10.5px] font-medium text-mocha/70 underline-offset-2 hover:text-espresso hover:underline"
          >
            privacy policy
          </a>
        </p>
      </div>
    </ScreenShell>
  );
}
