import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealItem } from './lib/classify';
import type { NusachId } from './data/texts';
import { badges, EMPTY_PROGRESS, recordMeal, type ProgressState } from './lib/progress';
import type { Lesson } from './data/learn';
import type { ParshaReading } from './lib/parsha';

export type Screen = 'welcome' | 'identify' | 'confirm' | 'guide' | 'after' | 'reference' | 'account';
export type Tab = 'bless' | 'learn' | 'journey' | 'friends';
export type TextMode = 'hebrew' | 'translit' | 'english';

export interface Celebration {
  kind: 'meal' | 'lesson';
  streak: number;
  streakExtended: boolean;
  brachosSaid: number;
  newBadges: { id: string; label: string }[];
}

export interface ReminderSettings {
  enabled: boolean;
  times: string[]; // "HH:MM" local
}

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

  guideIndex: number;
  setGuideIndex: (i: number) => void;

  // ---------------------------------------------------------- gamification
  progress: ProgressState;
  /** called once per completed meal from the After screen */
  completeMeal: (brachosSaid: string[], sevenSpecies: number) => void;
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

      guideIndex: 0,
      setGuideIndex: (guideIndex) => set({ guideIndex }),

      progress: EMPTY_PROGRESS,
      completeMeal: (brachosSaid, sevenSpecies) =>
        set((s) => {
          if (s.mealRecorded) return s;
          const before = badges(s.progress);
          const progress = recordMeal(s.progress, brachosSaid, sevenSpecies);
          const after = badges(progress);
          const newBadges = after
            .filter((b) => b.earned && !before.find((x) => x.id === b.id)?.earned)
            .map((b) => ({ id: b.id, label: b.label }));
          return {
            progress,
            mealRecorded: true,
            celebration: {
              kind: 'meal',
              streak: progress.streakCurrent,
              streakExtended: progress.streakCurrent > s.progress.streakCurrent || s.progress.lastActiveDay == null,
              brachosSaid: brachosSaid.length,
              newBadges,
            },
          };
        }),
      markLessonRead: (id) =>
        set((s) => {
          if (s.progress.lessonsRead.includes(id)) return s;
          const before = badges(s.progress);
          const progress = { ...s.progress, lessonsRead: [...s.progress.lessonsRead, id] };
          const newBadges = badges(progress)
            .filter((b) => b.earned && !before.find((x) => x.id === b.id)?.earned)
            .map((b) => ({ id: b.id, label: b.label }));
          return {
            progress,
            ...(newBadges.length
              ? { celebration: { kind: 'lesson', streak: progress.streakCurrent, streakExtended: false, brachosSaid: 0, newBadges } }
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
      setServerAccount: (serverToken, friendCode) => set({ serverToken, friendCode }),
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
