/**
 * Account screen — the in-app home for everything sign-in (its own tab).
 *
 * Signed OUT: the shared AuthPanel — email+password, Apple, Google, and the
 * legacy RIMON friend-code pair.
 * Signed IN: profile card (name + email, editable, saved to the server),
 * password set/change, friend code with copy, replay-the-intro, sign out.
 */
import { useEffect, useState } from 'react';
import { apiDeleteAccount, apiMe, apiSetPassword, apiUpdateAccount } from '../lib/api';
import { useBracha } from '../store';
import { AuthPanel } from '../components/AuthPanel';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 8;

export function Account() {
  const {
    setTab,
    displayName,
    setDisplayName,
    serverToken,
    friendCode,
    userEmail,
    setUserEmail,
    clearServerAccount,
    setOnboarded,
  } = useBracha();

  const [name, setName] = useState(displayName);
  const [email, setEmail] = useState(userEmail ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  // restore the profile card from the server (also self-heals a stale token)
  useEffect(() => {
    if (!serverToken) return;
    apiMe(serverToken)
      .then((r) => {
        setName(r.name);
        setEmail(r.email ?? '');
        setDisplayName(r.name);
        setUserEmail(r.email);
        setHasPassword(r.hasPassword ?? false);
        setProviders(r.providers ?? []);
      })
      .catch((e) => {
        if ((e as { status?: number }).status === 401) clearServerAccount();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToken]);

  const savePassword = async () => {
    if (!serverToken) return;
    if (pwNew.length < PASSWORD_MIN)
      return setNotice(`Pick a password of at least ${PASSWORD_MIN} characters.`);
    setBusy(true);
    try {
      await apiSetPassword(serverToken, pwNew, hasPassword ? pwCurrent : undefined);
      setHasPassword(true);
      setPwCurrent('');
      setPwNew('');
      setNotice(null);
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 403
          ? 'That current password doesn’t match.'
          : 'Couldn’t save the password right now — try again in a moment.',
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
            ? 'Your session expired — sign in again.'
            : 'Couldn’t save right now — try again in a moment.',
      );
      if (status === 401) {
        // set BEFORE the clear — clearing swaps this screen for the gate
        useBracha.getState().setGateNotice('Your session expired — please sign in again.');
        clearServerAccount();
      }
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
          onClick={() => setTab('bless')}
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
                ? 'Your name, your email, your keys — all in one place.'
                : 'An account syncs streaks across devices and puts you in the friends league.'}
            </p>
            {serverToken && providers.length > 0 && (
              <div className="flex gap-1.5">
                {providers.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-espresso/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-espresso-soft"
                  >
                    {p === 'apple' ? ' Apple linked' : 'G Google linked'}
                  </span>
                ))}
              </div>
            )}
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

            {/* password */}
            <Bezel className="rise-in rise-in-2 mt-3" innerClassName="px-5 py-4">
              <p className={label}>{hasPassword ? 'Change password' : 'Set a password'}</p>
              {hasPassword === false && (
                <p className="mt-1 text-[10.5px] leading-snug text-mocha">
                  Add a password so email + password signs you in on any device.
                </p>
              )}
              {hasPassword && (
                <>
                  <label className={`${label} mt-3 block`}>Current password</label>
                  <input
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className={field}
                  />
                </>
              )}
              <label className={`${label} mt-3 block border-t border-espresso/[0.07] pt-3`}>
                New password
              </label>
              <input
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder={`${PASSWORD_MIN}+ characters`}
                className={field}
              />
              <div className="mt-4 flex justify-end">
                <PillButton icon="✓" onClick={() => void savePassword()} disabled={busy || !pwNew}>
                  {pwSaved ? 'Saved!' : busy ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
                </PillButton>
              </div>
            </Bezel>

            {/* the friend code */}
            <Bezel className="rise-in rise-in-2 mt-3" innerClassName="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={label}>Your friend code</p>
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
                Friends add you with this code, and it still works as a backup sign-in key
                alongside your email. Keep it private — treat it like a password.
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
                }}
                className="text-[12px] font-medium text-mocha transition-colors duration-150 hover:text-rimon"
              >
                sign out on this device
              </button>
              <p className="max-w-[290px] text-center text-[10px] leading-snug text-mocha">
                Signing out keeps your local streaks on this device; your league account stays safe
                on the server — sign back in any time with your email and password, Apple, Google,
                or your friend code.
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
                          // set BEFORE the clear — clearing unmounts this screen
                          useBracha
                            .getState()
                            .setGateNotice(
                              'Your account has been deleted. Local streaks on this device remain yours.',
                            );
                          clearServerAccount();
                          setConfirmDelete(false);
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
          <div className="rise-in rise-in-1 flex flex-col items-center gap-3">
            <AuthPanel />
            <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-mocha">
              Signing in on a new device brings your name, streaks and league along.
            </p>
          </div>
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
