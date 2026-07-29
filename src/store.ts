import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealItem } from './lib/classify';
import type { NusachId } from './data/texts';
import { EMPTY_PROGRESS, recordMeal, type ProgressState } from './lib/progress';

export type Screen = 'welcome' | 'identify' | 'confirm' | 'guide' | 'after';
export type Tab = 'bless' | 'learn' | 'journey' | 'friends';
export type TextMode = 'hebrew' | 'translit' | 'english';

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
  /** guards double-counting when the After screen re-renders */
  mealRecorded: boolean;
  setMealRecorded: (v: boolean) => void;

  reminders: ReminderSettings;
  setReminders: (r: ReminderSettings) => void;

  displayName: string;
  setDisplayName: (n: string) => void;

  serverToken: string | null;
  friendCode: string | null;
  setServerAccount: (token: string, code: string) => void;

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
        set((s) =>
          s.mealRecorded
            ? s
            : {
                progress: recordMeal(s.progress, brachosSaid, sevenSpecies),
                mealRecorded: true,
              },
        ),
      markLessonRead: (id) =>
        set((s) =>
          s.progress.lessonsRead.includes(id)
            ? s
            : { progress: { ...s.progress, lessonsRead: [...s.progress.lessonsRead, id] } },
        ),
      mealRecorded: false,
      setMealRecorded: (mealRecorded) => set({ mealRecorded }),

      reminders: { enabled: false, times: ['08:00', '13:00', '19:00'] },
      setReminders: (reminders) => set({ reminders }),

      displayName: '',
      setDisplayName: (displayName) => set({ displayName }),

      serverToken: null,
      friendCode: null,
      setServerAccount: (serverToken, friendCode) => set({ serverToken, friendCode }),

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
      }),
    },
  ),
);
