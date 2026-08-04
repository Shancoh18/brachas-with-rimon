/**
 * Progress, streaks, challenges & badges — the gamification layer.
 * Local-first (persisted via zustand). Friendly-for-adults tone: growth and
 * mindfulness framing, not candy-crush pressure.
 */

export interface DayStamp {
  /** YYYY-MM-DD in local time */
  day: string;
  brachos: number;
  /** points earned that day (brachos + challenges) — rides along to the
   *  server so the friends league can rank by weekly points */
  points?: number;
}

export const todayStamp = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dayDiff = (a: string, b: string): number => {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round(
    (new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime()) / 86_400_000,
  );
};

export interface ProgressState {
  totalBrachos: number;
  byBracha: Record<string, number>;
  mealsCompleted: number;
  sevenSpeciesBlessed: number;
  streakCurrent: number;
  streakBest: number;
  lastActiveDay: string | null;
  history: DayStamp[];
  lessonsRead: string[];
  /** lifetime points (brachos ×2 + daily challenges) */
  points?: number;
}

export const EMPTY_PROGRESS: ProgressState = {
  totalBrachos: 0,
  byBracha: {},
  mealsCompleted: 0,
  sevenSpeciesBlessed: 0,
  streakCurrent: 0,
  streakBest: 0,
  lastActiveDay: null,
  history: [],
  lessonsRead: [],
  points: 0,
};

/** Bank points onto the running total + today's history stamp. */
export function addPoints(p: ProgressState, pts: number): ProgressState {
  if (pts <= 0) return p;
  const day = todayStamp();
  const history = [...p.history];
  const last = history[history.length - 1];
  if (last?.day === day) history[history.length - 1] = { ...last, points: (last.points ?? 0) + pts };
  else history.push({ day, brachos: 0, points: pts });
  return { ...p, points: (p.points ?? 0) + pts, history: history.slice(-90) };
}

/** Record a completed meal: n brachos said (before + after), update streak. */
export function recordMeal(
  p: ProgressState,
  brachosSaid: string[],
  sevenSpecies: number,
): ProgressState {
  const day = todayStamp();
  const byBracha = { ...p.byBracha };
  for (const b of brachosSaid) byBracha[b] = (byBracha[b] ?? 0) + 1;

  let streakCurrent = p.streakCurrent;
  if (p.lastActiveDay == null) streakCurrent = 1;
  else {
    const gap = dayDiff(p.lastActiveDay, day);
    if (gap === 1) streakCurrent += 1;
    else if (gap > 1) streakCurrent = 1;
    // gap === 0 → same day, streak unchanged
  }

  const history = [...p.history];
  const last = history[history.length - 1];
  if (last?.day === day) last.brachos += brachosSaid.length;
  else history.push({ day, brachos: brachosSaid.length });

  return {
    ...p,
    totalBrachos: p.totalBrachos + brachosSaid.length,
    byBracha,
    mealsCompleted: p.mealsCompleted + 1,
    sevenSpeciesBlessed: p.sevenSpeciesBlessed + sevenSpecies,
    streakCurrent,
    streakBest: Math.max(p.streakBest, streakCurrent),
    lastActiveDay: day,
    history: history.slice(-90),
  };
}

/** Streak is alive if last activity was today or yesterday. */
export function streakAlive(p: ProgressState): boolean {
  if (!p.lastActiveDay) return false;
  return dayDiff(p.lastActiveDay, todayStamp()) <= 1;
}

// ---------------------------------------------------------------- challenges
export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  metric: (p: ProgressState) => number;
  emoji: string;
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'first-steps',
    title: 'First Fruits',
    description: 'Say your first 10 brachos with the app.',
    target: 10,
    metric: (p) => p.totalBrachos,
    emoji: '🌱',
  },
  {
    id: 'seven-species',
    title: 'The Seven Species',
    description: 'Bless 7 foods of the Land of Israel — wheat, barley, grape, fig, pomegranate, olive, date.',
    target: 7,
    metric: (p) => p.sevenSpeciesBlessed,
    emoji: '🍇',
  },
  {
    id: 'week-of-blessing',
    title: 'A Week of Blessing',
    description: 'Keep a 7-day streak — one mindful meal a day.',
    target: 7,
    metric: (p) => p.streakBest,
    emoji: '🕯️',
  },
  {
    id: 'all-six',
    title: 'All Six Brachos',
    description: 'Say every one of the six before-blessings at least once.',
    target: 6,
    metric: (p) =>
      ['Hamotzi', 'Mezonos', 'Hagafen', 'Haetz', 'Haadama', 'Shehakol'].filter(
        (b) => (p.byBracha[b] ?? 0) > 0,
      ).length,
    emoji: '✡️',
  },
  {
    id: 'scholar',
    title: 'The Why Behind the Words',
    description: 'Read all the lessons in the Learn library.',
    target: 8,
    metric: (p) => p.lessonsRead.length,
    emoji: '📖',
  },
  {
    id: 'century',
    title: 'One Hundred Blessings',
    description: 'The Gemara speaks of 100 brachos a day — reach 100 total with Rimon.',
    target: 100,
    metric: (p) => p.totalBrachos,
    emoji: '💯',
  },
];

export interface Badge {
  id: string;
  label: string;
  earned: boolean;
}

export function badges(p: ProgressState): Badge[] {
  return CHALLENGES.map((c) => ({
    id: c.id,
    label: `${c.emoji} ${c.title}`,
    earned: c.metric(p) >= c.target,
  }));
}
