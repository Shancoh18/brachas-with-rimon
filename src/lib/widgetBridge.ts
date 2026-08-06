/**
 * iPhone Home Screen widget bridge — pushes streak/today state into the App
 * Group container so the RimonWidgets extension can render it (see
 * ios/widgets-staging/). Safe no-op on the web and until the native plugin
 * is added to the Xcode project: the call simply rejects and we swallow it.
 */
import { registerPlugin } from '@capacitor/core';
import { isNative } from './native';
import { todayStamp, type ProgressState } from './progress';
import type { DayStats } from './dailyChallenges';

interface WidgetBridgePlugin {
  sync(data: {
    streak: number;
    streakBest: number;
    totalBrachos: number;
    brachosToday: number;
    blessedToday: boolean;
    week: boolean[];
    updatedDay: string;
  }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

export async function syncWidgets(progress: ProgressState, dayStats: DayStats): Promise<void> {
  if (!isNative()) return;
  const today = todayStamp();
  const week = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return progress.history.some((h) => h.day === day && h.brachos > 0);
  });
  const brachosToday = dayStats.day === today ? dayStats.brachos : 0;
  try {
    await WidgetBridge.sync({
      streak: progress.streakCurrent,
      streakBest: progress.streakBest,
      totalBrachos: progress.totalBrachos,
      brachosToday,
      blessedToday: progress.lastActiveDay === today || brachosToday > 0,
      week,
      updatedDay: today,
    });
  } catch {
    // plugin not present (web, or widgets not set up yet) — fine
  }
}
