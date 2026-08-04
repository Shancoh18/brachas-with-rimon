import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealItem } from './lib/classify';
import type { NusachId } from './data/texts';
import { addPoints, badges, EMPTY_PROGRESS, recordMeal, todayStamp, type ProgressState } from './lib/progress';
import { EMPTY_DAY, POINTS_PER_BRACHA, settleChallenges, type DayStats } from './lib/dailyChallenges';
import type { LeagueRow } from './lib/api';
import type { Lesson } from './data/learn';
import type { ParshaReading } from './lib/parsha';

export type Screen = 'welcome' | 'identify' | 'confirm' | 'guide' | 'after' | 'reference';
export type Tab = 'bless' | 'learn' | 'journey' | 'friends' | 'donate' | 'account';
export type TextMode = 'hebrew' | 'translit' | 'english';

export interface Celebration {
  kind: 'meal' | 'lesson';
  streak: number;
  streakExtended: boolean;
  brachosSaid: number;
  newBadges: { id: string; label: string }[];
  /** points banked by this event (brachos + any dailies it completed) */
  pointsEarned?: number;
  /** daily-challenge ids this event completed */
  challengesCompleted?: string[];
}

export interface ReminderSettings {
  enabled: boolean;
  /** "HH:MM" local. Index 0/1/2 are breakfast/lunch/dinner — see MEAL_SLOTS. */
  times: string[];
  /** True once the user has actually set their own mealtimes (vs the defaults).
   *  Drives the home-page nudge copy; absent on stores saved before 2026-08-02. */
  configured?: boolean;
}

/** The three mealtime slots, in `times` index order. */
export const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅', hint: 'when you usually eat in the morning' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️', hint: 'your midday meal' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙', hint: 'your evening meal' },
] as const;

interface BrachaState {
  nusach: NusachId;
  setNusach: (n: NusachId) => void;
  textMode: TextMode;
  setTextMode: (m: TextMode) => void;

  tab: Tab;
  setTab: (t: Tab) => void;
  screen: Screen;
  setScreen: (s: Screen) => void;

  photo: string | null;
  setPhoto: (p: string | null) => void;

  items: MealItem[];
  setItems: (i: MealItem[]) => void;
  updateItem: (id: string, patch: Partial<MealItem>) => void;
  removeItem: (id: string) => void;
  addItem: (i: MealItem) => void;

  unmatched: string[];
  setUnmatched: (u: string[]) => void;
  /** True when a REAL photo's identification failed and the demo meal was
   *  substituted — Confirm must label it so it never poses as a real result. */
  demoFallback: boolean;
  setDemoFallback: (v: boolean) => void;
  /** One-shot message shown on the AuthGate (e.g. "account deleted") — set it
   *  BEFORE clearServerAccount(), since that unmounts the screen that set it. */
  gateNotice: string | null;
  setGateNotice: (m: string | null) => void;

  guideIndex: number;
  setGuideIndex: (i: number) => void;

  // ---------------------------------------------------------- gamification
  progress: ProgressState;
  /** today's counters for the daily challenges (rolls at local midnight) */
  dayStats: DayStats;
  /** called once per completed meal from the After screen */
  completeMeal: (
    brachosSaid: string[],
    sevenSpecies: number,
    meta?: { foodKeys?: string[]; withAfter?: boolean },
  ) => void;
  /** photo-identify flow ran on a real photo (feeds the Snap & Bless daily) */
  notePhotoFlow: () => void;
  /** latest friends-league standings (for the catch-up nudge) */
  leagueSnapshot: LeagueRow[] | null;
  setLeagueSnapshot: (rows: LeagueRow[] | null) => void;
  markLessonRead: (id: string) => void;
  starredLessons: string[];
  toggleStar: (id: string) => void;
  remoteLessons: Lesson[];
  setRemoteLessons: (l: Lesson[]) => void;
  parsha: ParshaReading | null;
  setParsha: (p: ParshaReading) => void;
  /** guards double-counting when the After screen re-renders */
  mealRecorded: boolean;
  setMealRecorded: (v: boolean) => void;
  celebration: Celebration | null;
  clearCelebration: () => void;
  partyTime: boolean;
  setPartyTime: (v: boolean) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;

  reminders: ReminderSettings;
  setReminders: (r: ReminderSettings) => void;

  displayName: string;
  setDisplayName: (n: string) => void;

  serverToken: string | null;
  friendCode: string | null;
  userEmail: string | null;
  setUserEmail: (e: string | null) => void;
  setServerAccount: (token: string, code: string) => void;
  clearServerAccount: () => void;

  reset: () => void;
}

export const useBracha = create<BrachaState>()(
  persist(
    (set) => ({
      nusach: 'ari',
      setNusach: (nusach) => set({ nusach }),
      textMode: 'hebrew',
      setTextMode: (textMode) => set({ textMode }),

      tab: 'bless',
      setTab: (tab) => set({ tab }),
      screen: 'welcome',
      setScreen: (screen) => set({ screen }),

      photo: null,
      setPhoto: (photo) => set({ photo }),

      items: [],
      setItems: (items) => set({ items }),
      updateItem: (id, patch) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),

      unmatched: [],
      setUnmatched: (unmatched) => set({ unmatched }),
      demoFallback: false,
      setDemoFallback: (demoFallback) => set({ demoFallback }),
      gateNotice: null,
      setGateNotice: (gateNotice) => set({ gateNotice }),

      guideIndex: 0,
      setGuideIndex: (guideIndex) => set({ guideIndex }),

      progress: EMPTY_PROGRESS,
      dayStats: EMPTY_DAY(todayStamp()),
      completeMeal: (brachosSaid, sevenSpecies, meta) =>
        set((s) => {
          if (s.mealRecorded) return s;
          const before = badges(s.progress);
          let progress = recordMeal(s.progress, brachosSaid, sevenSpecies);
          const after = badges(progress);
          const newBadges = after
            .filter((b) => b.earned && !before.find((x) => x.id === b.id)?.earned)
            .map((b) => ({ id: b.id, label: b.label }));

          // ------ today's counters → daily challenges → points
          const base = s.dayStats.day === todayStamp() ? s.dayStats : EMPTY_DAY(todayStamp());
          const byBracha = { ...base.byBracha };
          for (const b of brachosSaid) byBracha[b] = (byBracha[b] ?? 0) + 1;
          const day: DayStats = {
            ...base,
            brachos: base.brachos + brachosSaid.length,
            byBracha,
            foodKeys: [...new Set([...base.foodKeys, ...(meta?.foodKeys ?? [])])],
            mealsWithAfter: base.mealsWithAfter + (meta?.withAfter ? 1 : 0),
          };
          const settled = settleChallenges(day);
          day.challengesDone = [...day.challengesDone, ...settled.done];
          const pointsEarned = brachosSaid.length * POINTS_PER_BRACHA + settled.points;
          progress = addPoints(progress, pointsEarned);

          return {
            progress,
            dayStats: day,
            mealRecorded: true,
            celebration: {
              kind: 'meal',
              streak: progress.streakCurrent,
              streakExtended: progress.streakCurrent > s.progress.streakCurrent || s.progress.lastActiveDay == null,
              brachosSaid: brachosSaid.length,
              newBadges,
              pointsEarned,
              challengesCompleted: settled.done,
            },
          };
        }),
      notePhotoFlow: () =>
        set((s) => {
          const base = s.dayStats.day === todayStamp() ? s.dayStats : EMPTY_DAY(todayStamp());
          const day: DayStats = { ...base, photoFlows: base.photoFlows + 1 };
          const settled = settleChallenges(day);
          day.challengesDone = [...day.challengesDone, ...settled.done];
          return {
            dayStats: day,
            progress: settled.points ? addPoints(s.progress, settled.points) : s.progress,
          };
        }),
      leagueSnapshot: null,
      setLeagueSnapshot: (leagueSnapshot) => set({ leagueSnapshot }),
      markLessonRead: (id) =>
        set((s) => {
          if (s.progress.lessonsRead.includes(id)) return s;
          const before = badges(s.progress);
          let progress = { ...s.progress, lessonsRead: [...s.progress.lessonsRead, id] };
          const newBadges = badges(progress)
            .filter((b) => b.earned && !before.find((x) => x.id === b.id)?.earned)
            .map((b) => ({ id: b.id, label: b.label }));
          // lesson counts toward today's dailies (A Little Torah)
          const base = s.dayStats.day === todayStamp() ? s.dayStats : EMPTY_DAY(todayStamp());
          const day: DayStats = { ...base, lessonsRead: base.lessonsRead + 1 };
          const settled = settleChallenges(day);
          day.challengesDone = [...day.challengesDone, ...settled.done];
          if (settled.points) progress = addPoints(progress, settled.points);
          return {
            progress,
            dayStats: day,
            ...(newBadges.length
              ? { celebration: { kind: 'lesson', streak: progress.streakCurrent, streakExtended: false, brachosSaid: 0, newBadges, pointsEarned: settled.points } }
              : {}),
          };
        }),
      mealRecorded: false,
      setMealRecorded: (mealRecorded) => set({ mealRecorded }),
      celebration: null,
      clearCelebration: () => set({ celebration: null, partyTime: false }),
      partyTime: false,
      setPartyTime: (partyTime) => set({ partyTime }),
      onboarded: false,
      setOnboarded: (onboarded) => set({ onboarded }),

      starredLessons: [],
      toggleStar: (id) =>
        set((s) => ({
          starredLessons: s.starredLessons.includes(id)
            ? s.starredLessons.filter((x) => x !== id)
            : [...s.starredLessons, id],
        })),
      remoteLessons: [],
      setRemoteLessons: (remoteLessons) => set({ remoteLessons }),
      parsha: null,
      setParsha: (parsha) => set({ parsha }),

      reminders: { enabled: false, times: ['08:00', '13:00', '19:00'] },
      setReminders: (reminders) => set({ reminders }),

      displayName: '',
      setDisplayName: (displayName) => set({ displayName }),

      serverToken: null,
      friendCode: null,
      userEmail: null,
      setUserEmail: (userEmail) => set({ userEmail }),
      setServerAccount: (serverToken, friendCode) => set({ serverToken, friendCode, gateNotice: null }),
      clearServerAccount: () => set({ serverToken: null, friendCode: null, userEmail: null }),

      reset: () =>
        set({
          screen: 'welcome',
          photo: null,
          items: [],
          unmatched: [],
          guideIndex: 0,
          mealRecorded: false,
        }),
    }),
    {
      name: 'brachas-with-rimon',
      partialize: (s) => ({
        nusach: s.nusach,
        textMode: s.textMode,
        progress: s.progress,
        dayStats: s.dayStats,
        reminders: s.reminders,
        displayName: s.displayName,
        serverToken: s.serverToken,
        friendCode: s.friendCode,
        userEmail: s.userEmail,
        starredLessons: s.starredLessons,
        remoteLessons: s.remoteLessons,
        parsha: s.parsha,
        onboarded: s.onboarded,
      }),
    },
  ),
);
