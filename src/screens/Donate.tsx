/**
 * Donate — a warm, no-pressure page that lets users support the developers
 * and keep the app free. Rendered only when a donation link is configured
 * (src/lib/donate.ts). The payment itself happens on the external page.
 */
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';
import { Rimon } from '../components/Rimon';
import { DONATE_URL } from '../lib/donate';
import { useSplit } from '../lib/duo';
import { useBracha } from '../store';

export function Donate() {
  const setTab = useBracha((s) => s.setTab);
  // iPhone Duo open wide: Rimon and the why take the left page; the gift
  // card and its button stay on the right, clear of the hinge
  const split = useSplit();
  const story = (
    <>
      {/* big cinematic Rimon (owner 2026-08-11) — pose 'tzedakah' plays the
          giving-tzedakah loop once mascot/rimon-tzedakah.{mp4,webp} land
          (Higgsfield, identity-locked); until then the chain falls back
          to the hello still, full-size and uncropped. On the left page he
          is capped so the title still fits beside him. */}
      <Rimon
        variant="wide"
        pose="tzedakah"
        className={split ? 'rise-in w-full max-w-[260px]' : 'rise-in w-full'}
        say="Tzedakah and a bracha — both start with a thank-you."
      />

      <header className="rise-in rise-in-1 space-y-3 pb-6 pt-3 split:p-0">
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
    </>
  );

  return (
    <ScreenShell aside={story}>
      <div className="pb-24 split:flex split:flex-1 split:flex-col split:pb-10">
        <button
          onClick={() => setTab('bless')}
          className="rise-in pb-4 text-[12.5px] font-medium text-mocha transition-colors duration-150 hover:text-espresso split:self-start"
        >
          ← home
        </button>

        {/* open wide the card centres on its page, level with the story */}
        <div className="flex flex-col items-center text-center split:my-auto">
          {!split && story}

          <div className="rise-in rise-in-2 w-full max-w-[340px]">
            <Bezel>
              {/* the right page is narrower than a phone (fold gutter + the
                  Duo's status column); split:px-4 keeps the pill on one line */}
              <div className="space-y-4 p-5 split:px-4">
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
