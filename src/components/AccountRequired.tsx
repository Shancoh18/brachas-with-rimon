/**
 * Inline "this needs an account" panel — the guest-mode face of every
 * account-based feature (Friends: friend codes, leaderboards, board chat,
 * report/block). App Review 5.1.1(v): it replaces the FEATURE, never the
 * screen — the tab, its header and the rest of the app stay reachable, and
 * nothing outside the social layer ever asks for personal information.
 *
 * AuthPanel runs in upgrade mode automatically (the store holds a guest
 * token), so "create account" / Apple / Google keep the guest's progress;
 * the secondary link switches the same panel to plain sign-in for people
 * who already have an account.
 */
import { useState } from 'react';
import { AuthPanel } from './AuthPanel';
import { Rimon } from './Rimon';
import { Bezel, Eyebrow } from './ui';

export function AccountRequired({ reason, onDone }: { reason: string; onDone?: () => void }) {
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  return (
    <Bezel className="rise-in rise-in-1" innerClassName="px-5 py-6">
      <div data-account-required className="flex flex-col items-center gap-3 text-center">
        <Rimon pose="pointing" size={84} />
        <Eyebrow>Account needed</Eyebrow>
        <h3 className="font-display text-[26px] font-bold leading-tight text-espresso">
          {mode === 'create' ? 'Create an account' : 'Sign in'}
        </h3>
        <p className="max-w-[300px] text-[13px] leading-relaxed text-espresso-soft">{reason}</p>
        <div className="flex w-full justify-center pt-1">
          {/* re-keyed on mode so the panel opens on the requested form */}
          <AuthPanel key={mode} initialMode={mode} hideToggle onDone={onDone} />
        </div>
        <button
          onClick={() => setMode((m) => (m === 'create' ? 'signin' : 'create'))}
          className="min-h-[44px] px-2 text-[12px] font-medium text-gold underline-offset-2 hover:underline"
        >
          {mode === 'create' ? 'sign in to an existing account' : 'create a new account instead'}
        </button>
        <p className="max-w-[280px] text-[10.5px] leading-snug text-mocha">
          {mode === 'create'
            ? 'Your streaks and points come along — nothing you’ve done as a guest is lost.'
            : 'Signing in switches this device to that account.'}
        </p>
      </div>
    </Bezel>
  );
}
