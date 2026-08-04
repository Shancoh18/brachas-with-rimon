/**
 * The Celebration overlay — Rimon DANCES when a streak extends or a challenge
 * completes: full-screen takeover, count-up streak number, badge reveals,
 * a personal congratulation. Triggered by the store's `celebration` field
 * (set in completeMeal / markLessonRead), cleared on Continue.
 */
import { useEffect, useState } from 'react';
import { useBracha } from '../store';
import { Rimon } from './Rimon';
import { PillButton } from './ui';

const LINES_STREAK = [
  'You showed up again — that’s the whole secret.',
  'Consistency is its own blessing. Beautiful work.',
  'Another day of noticing. Rimon is proud of you.',
  'The practice is working. Keep going.',
];
const LINES_BADGE = [
  'That took real intention. Wear it well.',
  'A milestone worth savoring.',
  'Earned, not given. Kol hakavod!',
];

/** count-up that eases to the target */
function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (to <= 0) return setN(0);
    let frame = 0;
    const total = Math.min(40, 12 + to * 2);
    const id = setInterval(() => {
      frame++;
      const t = frame / total;
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (frame >= total) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [to]);
  return <>{n}</>;
}

export function Celebration() {
  const { celebration, clearCelebration, reset, partyTime } = useBracha();
  if (!celebration) return null;
  // meal celebrations wait until the after-brachos are said (partyTime)
  if (celebration.kind === 'meal' && !partyTime) return null;

  const { streak, streakExtended, brachosSaid, newBadges, kind } = celebration;
  const line = streakExtended
    ? LINES_STREAK[streak % LINES_STREAK.length]
    : LINES_BADGE[newBadges.length % LINES_BADGE.length];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 overflow-y-auto bg-cream/95 px-6 py-10 text-center backdrop-blur-sm">
      <div className="rise-in">
        <Rimon pose="dance" size={190} float={false} />
      </div>

      {streakExtended ? (
        <div className="rise-in rise-in-1 space-y-1">
          <p className="font-display text-[92px] font-black leading-none text-rimon">
            <CountUp to={streak} />
            <span className="ml-2 align-super text-[30px]">🔥</span>
          </p>
          <p className="text-[13px] font-bold uppercase tracking-[0.24em] text-mocha">
            day{streak === 1 ? '' : 's'} in a row
          </p>
        </div>
      ) : (
        <h2 className="rise-in rise-in-1 font-display text-[36px] font-bold leading-tight text-espresso">
          Challenge complete!
        </h2>
      )}

      {(celebration.pointsEarned ?? 0) > 0 && (
        <p className="rise-in rise-in-2 rounded-full bg-gold/[0.12] px-5 py-2 text-[16px] font-black text-gold">
          +{celebration.pointsEarned} points ⭐
          {(celebration.challengesCompleted?.length ?? 0) > 0 && (
            <span className="ml-2 text-[12px] font-bold">
              · {celebration.challengesCompleted!.length} daily challenge
              {celebration.challengesCompleted!.length === 1 ? '' : 's'} done!
            </span>
          )}
        </p>
      )}

      {newBadges.length > 0 && (
        <div className="rise-in rise-in-2 flex flex-wrap justify-center gap-2">
          {newBadges.map((b) => (
            <span
              key={b.id}
              className="rounded-full border border-gold/40 bg-gold/[0.1] px-4 py-2 text-[13px] font-bold text-gold shadow-[0_10px_30px_-10px_rgba(168,126,47,0.45)]"
            >
              {b.label} ✓
            </span>
          ))}
        </div>
      )}

      <p className="rise-in rise-in-2 max-w-[300px] text-[14px] leading-relaxed text-espresso-soft">
        {kind === 'meal' && brachosSaid > 0 && (
          <>
            <strong className="text-espresso">{brachosSaid} brachos</strong> this meal.{' '}
          </>
        )}
        {line}
      </p>

      <div className="rise-in rise-in-3">
        <PillButton
          variant="rimon"
          icon="→"
          onClick={() => {
            clearCelebration();
            if (kind === 'meal') reset();
          }}
        >
          Continue
        </PillButton>
      </div>
    </div>
  );
}
