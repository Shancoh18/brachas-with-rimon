/** Screen 2 — analyzing. Rimon thinks while Claude vision identifies. */
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { ScreenShell } from '../components/ui';
import { useSplit } from '../lib/duo';

export function Identify() {
  const { photo, reset } = useBracha();
  // iPhone Duo open wide: the photo and thinking Rimon take the left page,
  // sized like Confirm's so the hand-off only changes his pose; the status
  // and the way out stay on the right
  const split = useSplit();
  const looking = (
    <>
      {photo && (
        <div className="rise-in overflow-hidden rounded-[2rem] ring-1 ring-espresso/10 split:w-full split:max-w-[360px] split:rounded-[1.75rem] split:shadow-[0_24px_60px_-28px_rgba(43,33,26,0.45)]">
          <img src={photo} alt="your meal" className="max-h-[calc(var(--page-h)*0.38)] w-auto object-cover opacity-90 split:max-h-[calc(var(--page-h)*0.56)] split:w-full" />
        </div>
      )}
      <div className="rise-in rise-in-1 relative">
        <span className="pulse-ring absolute inset-0 rounded-full" />
        <Rimon
          pose="thinking"
          say={split && photo ? undefined : 'Hmm… let me look closely at what’s on your plate.'}
          size={split ? (photo ? 104 : 168) : 140}
          float={false}
        />
      </div>
    </>
  );

  return (
    <ScreenShell aside={looking}>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10 split:gap-4">
        {!split && looking}
        <p className="rise-in rise-in-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.2em] text-mocha">
          identifying your meal
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </p>
        {/* a way out — a photo the WebView can't decode or a stalled network
            used to leave this screen spinning with the tab bar hidden */}
        <button
          data-identify-cancel
          onClick={reset}
          className="rise-in rise-in-3 min-h-[44px] px-4 text-[12px] font-semibold text-mocha underline-offset-2 hover:underline"
        >
          cancel
        </button>
      </div>
    </ScreenShell>
  );
}
