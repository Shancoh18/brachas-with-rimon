/**
 * The Celebration dispatcher — picks the right full-screen Rimon takeover
 * for the moment (see RimonTakeovers.tsx for the three choreographies):
 *   new badge  → BadgeTakeover (rarest, so it wins)
 *   streak day → StreakTakeover ("the kindling")
 *   otherwise  → ChallengeTakeover (fly-in + thumbs-up)
 * Triggered by the store's `celebration` field (set in completeMeal /
 * markLessonRead), cleared on the CTA. Meal celebrations wait for partyTime.
 */
import { useBracha } from '../store';
import { BadgeTakeover, ChallengeTakeover, StreakTakeover } from './RimonTakeovers';

const LINES_STREAK = [
  'You showed up again — that’s the whole secret.',
  'Consistency is its own blessing. Beautiful work.',
  'Another day of noticing. Rimon is proud of you.',
  'The practice is working. Keep going.',
];

export function Celebration() {
  const { celebration, clearCelebration, reset, partyTime, progress } = useBracha();
  if (!celebration) return null;
  // meal celebrations wait until the after-brachos are said (partyTime)
  if (celebration.kind === 'meal' && !partyTime) return null;

  const { streak, streakExtended, brachosSaid, newBadges, kind } = celebration;
  const points = celebration.pointsEarned ?? 0;
  const onContinue = () => {
    clearCelebration();
    if (kind === 'meal') reset();
  };

  if (newBadges.length > 0) {
    return <BadgeTakeover badges={newBadges} points={points} onContinue={onContinue} />;
  }

  if (streakExtended) {
    return (
      <StreakTakeover
        streak={streak}
        totalBrachos={progress.totalBrachos}
        points={points}
        line={LINES_STREAK[streak % LINES_STREAK.length]}
        onContinue={onContinue}
      />
    );
  }

  const dailies = celebration.challengesCompleted?.length ?? 0;
  return (
    <ChallengeTakeover
      eyebrow={dailies > 0 ? 'Challenge complete' : 'Meal complete'}
      sub={
        (kind === 'meal' && brachosSaid > 0 ? `${brachosSaid} brachos this meal. ` : '') +
        (dailies > 0
          ? `${dailies} daily challenge${dailies === 1 ? '' : 's'} done — that took real intention.`
          : 'Another meal noticed, another thank-you said. Keep going.')
      }
      points={points}
      onContinue={onContinue}
    />
  );
}
