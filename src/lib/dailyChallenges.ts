/**
 * Daily challenges + the points economy.
 *
 * Every day gets a fresh set of 3 challenges, seeded from the DATE alone so
 * every user in a friends league sees the SAME challenges — fair competition
 * with zero server coordination. One of the three is always the food of the
 * day ("eat a [pomegranate] today"), drawn from the everyday end of the
 * vetted food DB.
 *
 * Points (kept deliberately legible):
 *   · every bracha said ............. +2
 *   · every AFTER-blessing said ..... +3 (closing the circle earns extra)
 *   · regular daily challenge ....... +10
 *   · food of the day ............... +20
 */
import { FOODS, type FoodEntry } from '../data/foods';

export const POINTS_PER_BRACHA = 2;
export const POINTS_PER_AFTER_BRACHA = 3;
/** the after-blessing keys completeMeal receives in `brachosSaid` */
export const AFTER_BRACHA_KEYS = new Set(['BirkatHamazon', 'MeeinShalosh', 'BoreiNefashos']);
export const POINTS_DAILY = 10;
export const POINTS_FOOD_OF_DAY = 20;

/** What the store tracks about TODAY (resets at local midnight). */
export interface DayStats {
  day: string; // YYYY-MM-DD
  brachos: number;
  byBracha: Record<string, number>;
  foodKeys: string[]; // every food key blessed today
  mealsWithAfter: number;
  photoFlows: number;
  lessonsRead: number;
  /** ids of dailies already banked (points awarded once) */
  challengesDone: string[];
}

export const EMPTY_DAY = (day: string): DayStats => ({
  day,
  brachos: 0,
  byBracha: {},
  foodKeys: [],
  mealsWithAfter: 0,
  photoFlows: 0,
  lessonsRead: 0,
  challengesDone: [],
});

export interface DailyChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  points: number;
  target: number;
  progress: (d: DayStats) => number;
}

// ------------------------------------------------------- seeded randomness
/** Deterministic PRNG from the date string — same picks for everyone. */
const seedFrom = (day: string): (() => number) => {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
};

// ------------------------------------------------------- food of the day
/** Everyday, attainable foods only — nobody should need a specialty store. */
const EVERYDAY_CATEGORIES = new Set(['Tree Fruit', 'Ground Produce', 'Beverages', 'Grain', 'Bread', 'Sweets']);

const everydayPool = (): FoodEntry[] =>
  FOODS.filter(
    (f) => !('learned' in f) && EVERYDAY_CATEGORIES.has(f.category) && f.names[0].length <= 16,
  );

export const foodOfTheDay = (day: string): FoodEntry => {
  const pool = everydayPool();
  const rand = seedFrom(day + ':food');
  return pool[Math.floor(rand() * pool.length)] ?? FOODS[0];
};

// ------------------------------------------------------- the daily pool
const POOL: Omit<DailyChallenge, 'points'>[] = [
  {
    id: 'daily-three',
    emoji: '🌅',
    title: 'Three Today',
    description: 'Say 3 brachos today.',
    target: 3,
    progress: (d) => d.brachos,
  },
  {
    id: 'daily-five',
    emoji: '✋',
    title: 'High Five',
    description: 'Say 5 brachos today.',
    target: 5,
    progress: (d) => d.brachos,
  },
  {
    id: 'daily-full-circle',
    emoji: '🔄',
    title: 'Full Circle',
    description: 'Close a meal with its after-blessings.',
    target: 1,
    progress: (d) => d.mealsWithAfter,
  },
  {
    id: 'daily-haadama',
    emoji: '🥕',
    title: 'From the Earth',
    description: 'Say Haadama on something that grows in the ground.',
    target: 1,
    progress: (d) => d.byBracha['Haadama'] ?? 0,
  },
  {
    id: 'daily-haetz',
    emoji: '🌳',
    title: 'From the Tree',
    description: 'Say Haetz on a fruit of the tree.',
    target: 1,
    progress: (d) => d.byBracha['Haetz'] ?? 0,
  },
  {
    id: 'daily-shehakol',
    emoji: '🥛',
    title: 'Everything by His Word',
    description: 'Say Shehakol today.',
    target: 1,
    progress: (d) => d.byBracha['Shehakol'] ?? 0,
  },
  {
    id: 'daily-snap',
    emoji: '📸',
    title: 'Snap & Bless',
    description: 'Identify a meal with a photo.',
    target: 1,
    progress: (d) => d.photoFlows,
  },
  {
    id: 'daily-learn',
    emoji: '📖',
    title: 'A Little Torah',
    description: 'Read one lesson in the Learn library.',
    target: 1,
    progress: (d) => d.lessonsRead,
  },
];

/** The 3 challenges for a given day: food-of-the-day + 2 seeded picks. */
export function dailyChallenges(day: string): DailyChallenge[] {
  const rand = seedFrom(day + ':picks');
  const picks: DailyChallenge[] = [];
  const pool = [...POOL];
  while (picks.length < 2 && pool.length) {
    const i = Math.floor(rand() * pool.length);
    picks.push({ ...pool.splice(i, 1)[0], points: POINTS_DAILY });
  }
  const food = foodOfTheDay(day);
  picks.push({
    id: `daily-food-${food.key}`,
    emoji: '🎯',
    title: 'Food of the Day',
    description: `Eat ${aOrAn(food.names[0])} today and say its bracha (${food.brachaRishona}).`,
    points: POINTS_FOOD_OF_DAY,
    target: 1,
    progress: (d) => (d.foodKeys.includes(food.key) ? 1 : 0),
  });
  return picks;
}

const aOrAn = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);

/** Newly finished challenges (not yet banked) + the points they carry. */
export function settleChallenges(d: DayStats): { done: string[]; points: number } {
  let points = 0;
  const done: string[] = [];
  for (const c of dailyChallenges(d.day)) {
    if (d.challengesDone.includes(c.id)) continue;
    if (c.progress(d) >= c.target) {
      done.push(c.id);
      points += c.points;
    }
  }
  return { done, points };
}
