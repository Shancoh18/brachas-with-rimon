/**
 * Full-screen sign-in surface. NO LONGER A WALL: since the guest flow
 * (App Review 5.1.1(v), 2026-09) the app renders straight after onboarding
 * on an anonymous guest session, and every account prompt lives inline —
 * the Friends tab's AccountRequired panel and the Account tab. App.tsx does
 * not mount this screen any more; it stays as a reusable standalone surface
 * (a host mounts it with `onContinue` to offer the way past it) and still
 * shows the one-shot gateNotice. AuthPanel flips serverToken on success.
 */
import { AuthPanel } from '../components/AuthPanel';
import { Rimon } from '../components/Rimon';
import { Eyebrow, ScreenShell } from '../components/ui';
import { useBracha } from '../store';

export function AuthGate({ onContinue }: { onContinue?: () => void }) {
  const gateNotice = useBracha((s) => s.gateNotice);
  return (
    <ScreenShell>
      <div className="flex flex-col items-center pb-16 pt-6 text-center">
        {gateNotice && (
          <div className="rise-in mb-4 w-full max-w-[340px] rounded-[1.25rem] bg-white/70 p-4 text-[12.5px] leading-relaxed text-espresso ring-1 ring-espresso/10">
            {gateNotice}
          </div>
        )}
        <div className="rise-in">
          <Rimon pose="hello" size={132} />
        </div>

        <header className="rise-in rise-in-1 space-y-3 pb-8 pt-4">
          <Eyebrow>Brachas with Rimon</Eyebrow>
          <h1 className="font-display text-[34px] leading-[1.1] text-espresso">Sign in</h1>
          <p className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-mocha">
            An account keeps streaks and the friends league in sync on every device.
            Everything else works without one.
          </p>
        </header>

        <div className="rise-in rise-in-2 flex w-full flex-col items-center gap-3">
          <AuthPanel onDone={onContinue} />
          {onContinue && (
            <button
              onClick={onContinue}
              className="min-h-[44px] px-2 text-[12px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
            >
              continue without an account
            </button>
          )}
          <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-mocha">
            Signing in on a new device brings your name, streaks and league along.
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}
