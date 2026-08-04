/**
 * Full-screen sign-in gate shown after onboarding until the user has an
 * account (store.serverToken). The app is account-first: streaks, the
 * friends league and reminders all sync through the server, so sign-in
 * happens before anything else. AuthPanel flips serverToken on success and
 * App re-renders straight into the app — no callback needed.
 */
import { AuthPanel } from '../components/AuthPanel';
import { Rimon } from '../components/Rimon';
import { Eyebrow, ScreenShell } from '../components/ui';

export function AuthGate() {
  return (
    <ScreenShell>
      <div className="flex flex-col items-center pb-16 pt-6 text-center">
        <div className="rise-in">
          <Rimon pose="hello" size={132} />
        </div>

        <header className="rise-in rise-in-1 space-y-3 pb-8 pt-4">
          <Eyebrow>Welcome to Brachas with Rimon</Eyebrow>
          <h1 className="font-display text-[34px] leading-[1.1] text-espresso">
            Sign in to begin
          </h1>
          <p className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-mocha">
            Your account keeps streaks, reminders and the friends league in
            sync on every device.
          </p>
        </header>

        <div className="rise-in rise-in-2 flex w-full flex-col items-center gap-3">
          <AuthPanel />
          <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-mocha">
            Signing in on a new device brings your name, streaks and league along.
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}
