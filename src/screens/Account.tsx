/**
 * Account screen — the in-app home for everything sign-in (its own tab).
 *
 * GUEST (the default since App Review 5.1.1(v): an anonymous session with no
 * personal information): "You're using Brachas as a guest", what an account
 * adds, and the shared AuthPanel in UPGRADE mode — create / Apple / Google
 * keep the guest's progress in place; sign-in switches to an existing
 * account. Appearance, replay-the-intro and delete-my-data stay available
 * (deleting as a guest removes the guest row; a fresh one is minted).
 * Signed IN: profile card (name + email, editable, saved to the server),
 * password set/change, friend code with copy, blocked people, sign out,
 * delete account.
 * No session at all (guest mint still pending / offline): the same panel,
 * plain — the app keeps working on local progress meanwhile.
 */
import { useEffect, useState } from 'react';
import { apiBlockedUsers, apiDeleteAccount, apiMe, apiPushNative, apiSetPassword, apiUnblockUser, apiUpdateAccount } from '../lib/api';
import { isNative } from '../lib/native';
import { appleAvailable, googleAvailable } from '../lib/socialAuth';
import { useBracha } from '../store';
import { AuthPanel } from '../components/AuthPanel';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 8;

/** what a guest gains by creating an account — the pitch, kept honest */
const ACCOUNT_ADDS = [
  'Your streaks and points on every device — a new phone picks up where you left off.',
  'Friends: trade codes, share leaderboards, chat in your boards.',
  'Sign back in any time with email + password, Apple or Google.',
];

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
    appearance,
    setAppearance,
    isGuest,
    setGuest,
    gateNotice,
  } = useBracha();
  const signedIn = !!serverToken && !isGuest;

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
  // people blocked from chat (App Review 1.2) — the undo lives here
  const [blocked, setBlocked] = useState<{ user_id: string; name: string }[]>([]);

  // restore the profile card from the server (also self-heals a stale token
  // and the guest flag — the server's word on `guest` wins)
  useEffect(() => {
    if (!serverToken) return;
    apiMe(serverToken)
      .then((r) => {
        if (r.guest) {
          // a guest row has no profile to restore — and its placeholder
          // name must never become the user's display name
          setGuest(true);
          return;
        }
        setGuest(false);
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
    if (isGuest) return; // the blocked list is account-only (guests can't chat)
    apiBlockedUsers(serverToken)
      .then((r) => setBlocked(Array.isArray(r.blocked) ? r.blocked : []))
      .catch(() => undefined); // offline → the section simply stays hidden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToken, isGuest]);

  // the one-shot notice ("account deleted", "session expired") is shown once,
  // on this screen — leaving it clears it
  useEffect(() => () => useBracha.getState().setGateNotice(null), []);

  const unblock = async (userId: string) => {
    if (!serverToken) return;
    try {
      await apiUnblockUser(serverToken, userId);
      setBlocked((b) => b.filter((x) => x.user_id !== userId));
    } catch {
      setNotice('Couldn’t unblock right now — try again in a moment.');
    }
  };

  // never advertise a sign-in this build can't offer (Apple is native-only,
  // Google needs a client id) — the same rule AuthPanel's buttons follow
  const signInWays = [
    'your email and password',
    ...(appleAvailable() ? ['Apple'] : []),
    ...(googleAvailable() ? ['Google'] : []),
    'your friend code',
  ];
  const signInWaysCopy = `${signInWays.slice(0, -1).join(', ')}, or ${signInWays[signInWays.length - 1]}`;

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
        // set BEFORE the clear — this screen stays mounted and shows it
        useBracha.getState().setGateNotice('Your session expired — please sign in again.');
        clearServerAccount();
      }
    }
    setBusy(false);
  };

  const deleteAccount = async () => {
    if (!serverToken) return;
    setBusy(true);
    try {
      await apiDeleteAccount(serverToken);
      // set BEFORE the clear — the notice survives the state swap
      useBracha
        .getState()
        .setGateNotice(
          isGuest
            ? 'Your guest data has been deleted from the server. Local streaks on this device remain yours.'
            : 'Your account has been deleted. Local streaks on this device remain yours.',
        );
      clearServerAccount();
      setConfirmDelete(false);
    } catch {
      setNotice('Couldn’t reach the server — try again in a moment.');
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

        {gateNotice && (
          <div
            data-gate-notice
            className="rise-in mb-4 rounded-[1.25rem] bg-white/70 p-4 text-[12.5px] leading-relaxed text-espresso ring-1 ring-espresso/10"
          >
            {gateNotice}
          </div>
        )}

        <header className="rise-in flex items-start justify-between gap-4 pb-6">
          <div className="space-y-2">
            <Eyebrow>{signedIn ? 'Your account' : isGuest ? 'Guest mode' : 'Join or sign in'}</Eyebrow>
            <h2
              className={`font-display font-bold leading-tight text-espresso ${
                signedIn || !isGuest ? 'text-[32px]' : 'text-[28px]'
              }`}
            >
              {signedIn ? 'Account' : isGuest ? 'You’re using Brachas as a guest' : 'Sign in'}
            </h2>
            <p className="max-w-[300px] text-[13px] leading-relaxed text-espresso-soft">
              {signedIn
                ? 'Your name, your email, your keys — all in one place.'
                : 'Everything here works without an account. Create one whenever you want your progress on other devices, or friends.'}
            </p>
            {signedIn && providers.length > 0 && (
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

        {signedIn ? (
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
          </>
        ) : (
          <>
            {/* guest / no session: the pitch, then the panel in upgrade mode */}
            {isGuest && (
              <Bezel className="rise-in rise-in-1" innerClassName="px-5 py-4">
                <p className={label}>What an account adds</p>
                <ul data-account-adds className="mt-2 space-y-2">
                  {ACCOUNT_ADDS.map((line) => (
                    <li key={line} className="flex gap-2.5 text-[12.5px] leading-snug text-espresso">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-espresso/[0.07] pt-3 text-[10.5px] leading-relaxed text-mocha">
                  Nothing you’ve done as a guest is lost — creating an account keeps this
                  progress. Signing in switches this device to that account.
                </p>
              </Bezel>
            )}
            <div className={`rise-in rise-in-2 flex flex-col items-center gap-3 ${isGuest ? 'mt-5' : ''}`}>
              <AuthPanel />
              <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-mocha">
                Signing in on a new device brings your name, streaks and league along.
              </p>
            </div>
          </>
        )}

        {/* appearance — explicit, light by default (never inferred from the OS);
            a setting, so guests have it too */}
        <Bezel className="rise-in rise-in-2 mt-5" innerClassName="px-5 py-4">
          <p className={label}>Appearance</p>
          <div data-appearance-picker className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                { id: 'light', label: 'Light', icon: '☀️' },
                { id: 'dark', label: 'Dark', icon: '🌙' },
                { id: 'system', label: 'Auto', icon: '📱' },
              ] as const
            ).map((o) => {
              const active = appearance === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setAppearance(o.id)}
                  aria-pressed={active}
                  className={`rounded-2xl border px-2 py-2.5 text-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    active
                      ? 'border-rimon/40 bg-rimon/[0.07] text-rimon'
                      : 'border-espresso/10 bg-white/60 text-espresso hover:-translate-y-0.5'
                  }`}
                >
                  <span className="block text-[16px]">{o.icon}</span>
                  <span className="mt-0.5 block text-[11.5px] font-bold">{o.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-mocha">
            Auto follows your device's light/dark setting. The app stays light unless you
            choose otherwise.
          </p>
        </Bezel>

        {/* blocked people — only once there is someone to unblock */}
        {signedIn && blocked.length > 0 && (
          <Bezel className="rise-in rise-in-2 mt-3" innerClassName="px-5 py-4">
            <div data-blocked-people>
              <p className={label}>Blocked people</p>
              <p className="mt-1 text-[10.5px] leading-snug text-mocha">
                You don’t see their chat messages on any leaderboard.
              </p>
              <ul className="mt-2.5 divide-y divide-espresso/[0.07]">
                {blocked.map((b) => (
                  <li key={b.user_id} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate text-[13.5px] font-semibold text-espresso">{b.name}</span>
                    <button
                      onClick={() => void unblock(b.user_id)}
                      className="min-h-[44px] shrink-0 rounded-full bg-espresso/[0.05] px-4 text-[11px] font-bold text-espresso-soft transition-colors hover:bg-espresso/10"
                    >
                      unblock
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Bezel>
        )}

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

          {signedIn && (
            <>
              <button
                onClick={() => {
                  // stop server pushes chasing a signed-out device (best-effort)
                  if (isNative() && serverToken) void apiPushNative(serverToken, null).catch(() => undefined);
                  clearServerAccount();
                  setNotice(null);
                }}
                className="text-[12px] font-medium text-mocha transition-colors duration-150 hover:text-rimon"
              >
                sign out on this device
              </button>
              <p className="max-w-[290px] text-center text-[10px] leading-snug text-mocha">
                Signing out keeps your local streaks on this device; your league account stays safe
                on the server — sign back in any time with {signInWaysCopy}.
              </p>
            </>
          )}

          {/* permanent deletion — inline two-step confirm; a guest deletes
              the guest row the same way (Apple requires in-app deletion) */}
          {serverToken &&
            (!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="pt-2 text-[11px] font-medium text-mocha/70 transition-colors duration-150 hover:text-rimon"
              >
                {isGuest ? 'delete my guest data from the server' : 'delete my account permanently'}
              </button>
            ) : (
              <div className="mt-2 w-full max-w-[320px] rounded-[1.25rem] bg-rimon/[0.06] px-5 py-4 ring-1 ring-rimon/20">
                <p className="text-[12px] font-semibold text-espresso">
                  {isGuest ? 'Delete your guest data?' : 'Delete your account?'}
                </p>
                <p className="mt-1 text-[10.5px] leading-snug text-espresso-soft">
                  {isGuest
                    ? 'This erases the progress this device synced to the server — permanently. Local streaks on this device stay, and a fresh guest session starts on its own.'
                    : 'This erases your league account, friends, and synced progress from the server — permanently. There is no undo, and your friend code stops working.'}
                </p>
                <div className="mt-3 flex items-center justify-end gap-4">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11.5px] font-semibold text-espresso-soft hover:text-espresso"
                  >
                    {isGuest ? 'keep it' : 'keep my account'}
                  </button>
                  <button
                    onClick={() => void deleteAccount()}
                    disabled={busy}
                    className="rounded-full bg-rimon px-4 py-2 text-[11.5px] font-bold text-cream transition-transform duration-150 ease-out active:scale-95"
                  >
                    {busy ? 'Deleting…' : 'Delete forever'}
                  </button>
                </div>
              </div>
            ))}
        </div>

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
