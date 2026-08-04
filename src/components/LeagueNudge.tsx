/**
 * Friendly-competition nudge on the home screen: when a friend leads today's
 * points, show "X is in the lead today — complete N challenges to catch up."
 * Data comes from the last league fetch (boot sync in App, or the Friends tab).
 */
import { useBracha } from '../store';

export function LeagueNudge() {
  const league = useBracha((s) => s.leagueSnapshot);
  const setTab = useBracha((s) => s.setTab);
  if (!league || league.length < 2) return null;

  const byToday = [...league].sort((a, b) => (b.todayPoints ?? 0) - (a.todayPoints ?? 0));
  const leader = byToday[0];
  const me = byToday.find((r) => r.you);
  if (!leader || !me || leader.you || (leader.todayPoints ?? 0) <= 0) return null;

  const gap = (leader.todayPoints ?? 0) - (me.todayPoints ?? 0);
  const challenges = Math.max(1, Math.ceil(gap / 10));

  return (
    <button
      onClick={() => setTab('journey')}
      className="rise-in rise-in-2 mx-auto block w-full max-w-[340px] rounded-[1.25rem] bg-gold/[0.1] px-4 py-3 text-left ring-1 ring-gold/25 transition-transform duration-150 hover:-translate-y-0.5"
    >
      <p className="text-[12px] font-semibold leading-snug text-espresso">
        🏆 {leader.name} is in the lead today with {leader.todayPoints} points — complete{' '}
        {challenges} challenge{challenges === 1 ? '' : 's'} to catch up!
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
        see today’s challenges →
      </p>
    </button>
  );
}
