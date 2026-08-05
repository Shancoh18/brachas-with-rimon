/**
 * Client for the /api/analyze proxy (the ANTHROPIC_API_KEY lives ONLY there).
 * Includes the client-side resize per Anthropic's Vision guidance: long edge
 * ≤1568px and ≤~1.15 megapixels before sending.
 *
 * DEMO MODE: when the proxy is unreachable (local dev without a key) the
 * caller can fall back to `demoMeal()` so the whole flow stays testable.
 */
import { API_BASE } from './api';
import type { IdentifiedItem } from './classify';
import { fetchLearnedFoods, registerLearnedFoods, type LearnedFoodEntry } from './learnedFoods';

const MAX_EDGE = 1568;
const MAX_PIXELS = 1_150_000;

export async function resizeImage(file: File | Blob): Promise<{ dataUrl: string; base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  const edgeScale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const pixelScale = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)));
  const scale = Math.min(edgeScale, pixelScale);

  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
}

export interface AnalyzeResult {
  items: IdentifiedItem[];
  unmatched: string[];
  /** Entries the server just researched from the approved sites for THIS meal. */
  learned_entries?: LearnedFoodEntry[];
  demo?: boolean;
}

export async function analyzePhoto(base64: string, mediaType: string): Promise<AnalyzeResult> {
  // /api/analyze is authenticated (vision costs money per call) — the app is
  // account-first, so a token always exists by the time a photo can be taken.
  const { serverToken } = (await import('../store')).useBracha.getState();
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(serverToken ? { Authorization: `Bearer ${serverToken}` } : {}),
    },
    body: JSON.stringify({ image: base64, media_type: mediaType }),
    // vision + inline research can legitimately take ~30s; fail crisply after 45
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
  const result = (await res.json()) as AnalyzeResult;
  // Merge freshly learned foods before anything tries to look them up.
  registerLearnedFoods(result.learned_entries);
  // A key the server knows (learned on another device) but this session hasn't
  // synced yet would silently vanish in toMealItems — re-sync once, then let
  // still-unknown keys surface as unmatched instead of disappearing.
  const { FOOD_BY_KEY } = await import('../data/foods');
  if (result.items.some((i) => !FOOD_BY_KEY[i.db_key])) {
    await fetchLearnedFoods();
    const still = result.items.filter((i) => !FOOD_BY_KEY[i.db_key]);
    if (still.length) {
      result.unmatched = [...(result.unmatched ?? []), ...still.map((i) => i.display_name)];
      result.items = result.items.filter((i) => FOOD_BY_KEY[i.db_key]);
    }
  }
  return result;
}

/** A rich demo meal exercising kedima + both after-bracha paths. */
export function demoMeal(): AnalyzeResult {
  return {
    demo: true,
    items: [
      { db_key: 'cake', display_name: 'Chocolate cake', state: 'baked', confidence: 0.95 },
      { db_key: 'grape_juice', display_name: 'Grape juice', state: 'liquid', confidence: 0.92 },
      { db_key: 'date', display_name: 'Medjool dates', state: 'whole', confidence: 0.9 },
      { db_key: 'apple', display_name: 'Apple slices', state: 'cut', confidence: 0.97 },
      { db_key: 'carrot', display_name: 'Baby carrots', state: 'raw', confidence: 0.93 },
      { db_key: 'chicken', display_name: 'Grilled chicken', state: 'cooked', confidence: 0.88 },
    ],
    unmatched: [],
  };
}
