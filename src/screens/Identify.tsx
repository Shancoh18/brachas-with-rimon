/** Screen 2 — analyzing. Rimon thinks while Claude vision identifies. */
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { ScreenShell } from '../components/ui';

export function Identify() {
  const { photo } = useBracha();
  return (
    <ScreenShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10">
        {photo && (
          <div className="rise-in overflow-hidden rounded-[2rem] ring-1 ring-espresso/10">
            <img src={photo} alt="your meal" className="max-h-[38dvh] w-auto object-cover opacity-90" />
          </div>
        )}
        <div className="rise-in rise-in-1 relative">
          <span className="pulse-ring absolute inset-0 rounded-full" />
          <Rimon pose="thinking" say="Hmm… let me look closely at what’s on your plate." size={140} float={false} />
        </div>
        <p className="rise-in rise-in-2 text-[12px] font-medium uppercase tracking-[0.2em] text-mocha">
          identifying your meal…
        </p>
      </div>
    </ScreenShell>
  );
}
