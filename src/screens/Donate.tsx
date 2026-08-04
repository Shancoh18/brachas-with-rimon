/**
 * Donate — a warm, no-pressure page that lets users support the developers
 * and keep the app free. Rendered only when a donation link is configured
 * (src/lib/donate.ts). The payment itself happens on the external page.
 */
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';
import { Rimon } from '../components/Rimon';
import { DONATE_URL } from '../lib/donate';
import { useBracha } from '../store';

export function Donate() {
  const setTab = useBracha((s) => s.setTab);
  return (
    <ScreenShell>
      <div className="pb-24">
        <button
          onClick={() => setTab('bless')}
          className="rise-in pb-4 text-[12.5px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
        >
          ← home
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="rise-in">
            <Rimon pose="hello" size={120} />
          </div>

          <header className="rise-in rise-in-1 space-y-3 pb-6 pt-3">
            <Eyebrow>Keep Rimon running</Eyebrow>
            <h1 className="font-display text-[32px] leading-[1.12] text-espresso">
              Help keep the app free for everyone
            </h1>
            <p className="mx-auto max-w-[310px] text-[13px] leading-relaxed text-mocha">
              Brachas with Rimon is free, with no ads and no subscriptions.
              Every meal photo runs real AI, and the streaks, reminders and
              friends league run on real servers. Donations from people who
              love the app are what keep it that way.
            </p>
          </header>

          <div className="rise-in rise-in-2 w-full max-w-[340px]">
            <Bezel>
              <div className="space-y-4 p-5">
                <p className="text-[12.5px] leading-relaxed text-espresso">
                  Whatever amount feels right — every bit goes to server and
                  AI costs first, and new features second.
                </p>
                <PillButton
                  variant="rimon"
                  icon="♥"
                  onClick={() => window.open(DONATE_URL, '_blank', 'noopener')}
                >
                  Donate to the developers
                </PillButton>
                <p className="text-[10.5px] leading-snug text-mocha">
                  Donations are a gift to the developers and don’t unlock
                  anything — the whole app stays free for everyone either way.
                </p>
              </div>
            </Bezel>
          </div>

          <p className="rise-in rise-in-3 max-w-[300px] pt-6 text-[11.5px] leading-relaxed text-mocha">
            Can’t donate? Sharing the app with a friend helps just as much. 🍎
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}
