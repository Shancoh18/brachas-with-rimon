/**
 * Client for the /api/analyze proxy (the ANTHROPIC_API_KEY lives ONLY there).
 * Includes the client-side resize per Anthropic's Vision guidance: long edge
 * ≤1568px and ≤~1.15 megapixels before sending.
 *
 * DEMO MODE: when the proxy is unreachable (local dev without a key) the
 * caller can fall back to `demoMeal()` so the whole flow stays testable.
 *
 * FAILURES carry the server's error code ({status, code} — the ApiError shape
 * api.ts throws; a fetch that never got an answer carries status 0 / 'offline')
 * so Confirm can say WHY: the user's own daily allowance, the app-wide daily
 * limit, a busy moment, the per-network rate limit, a dead session, an
 * unreadable photo, or no connection. Only `busy` (short-lived capacity)
 * retries once on its own before failing — `slow_down` is a 10-minute
 * window, not seconds. `photoFailReason` maps EVERY code /api/analyze can
 * answer (server.mjs, 2026-09-22 merge) — keep the two in step.
 */
import { API_BASE, type ApiError } from './api';
import type { IdentifiedItem } from './classify';
import { fetchLearnedFoods, registerLearnedFoods, type LearnedFoodEntry } from './learnedFoods';
import { timeoutSignal } from './timeoutSignal';

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
  const base64 = dataUrl.split(',')[1];
  // a canvas the engine refused (zero-size / over its memory cap) encodes as
  // "data:," — fail here as an unreadable photo instead of uploading nothing
  if (!base64) throw new Error('photo could not be encoded');
  return { dataUrl, base64, mediaType: 'image/jpeg' };
}

export interface AnalyzeResult {
  items: IdentifiedItem[];
  unmatched: string[];
  /** Entries the server just researched from the approved sites for THIS meal. */
  learned_entries?: LearnedFoodEntry[];
  demo?: boolean;
}

/** Why a photo check failed — Confirm picks its copy from this. ONE enum for
 *  every answer the server can give (a guest's 11th photo of the day is NOT
 *  "Rimon is broken"):
 *   daily_limit   429 daily_limit  — the user's own allowance (10 guest / 30 account)
 *   global_limit  429 global_limit — the app-wide daily cap, resets 00:00 UTC
 *   busy          429 busy (capacity, retried once here) · 503 (no vision key)
 *   rate_limited  429 slow_down    — the 10-minute per-network bucket
 *   unauthorized  401              — a session the server no longer knows
 *   offline       fetch failed / timed out · 408 body_timeout (upload stalled)
 *   bad_image     400 bad_image|no_image · 413 too_large · an undecodable file
 *   generic       everything else (5xx, 502 anthropic_error, 504 anthropic_timeout, 400 bad_request) */
export type PhotoFailReason =
  | 'daily_limit'
  | 'global_limit'
  | 'busy'
  | 'rate_limited'
  | 'unauthorized'
  | 'offline'
  | 'bad_image'
  | 'generic';

/** wait before the one automatic retry of a busy photo check */
const BUSY_RETRY_MS = 3_500;

/** non-OK response → ApiError carrying the server's JSON error code */
async function analyzeError(res: Response): Promise<ApiError> {
  let body: { error?: string } = {};
  try { body = await res.json(); } catch { /* non-JSON error (proxy / 5xx page) */ }
  return Object.assign(new Error(`analyze failed: ${res.status}`), { status: res.status, code: body.error });
}

/** 429 busy (vision slots or in-flight uploads full) — clears in seconds, worth one retry */
const isBusy = ({ status, code }: Partial<ApiError>) => status === 429 && code === 'busy';

/** Map whatever analyzePhoto threw to the reason Confirm explains. */
export function photoFailReason(e: unknown): PhotoFailReason {
  const { status, code } = (e as Partial<ApiError> | null) ?? {};
  // fetch never got an answer: no network, or the 45 s client abort
  if (status === 0 || code === 'offline') return 'offline';
  if (status === 429 && code === 'daily_limit') return 'daily_limit';
  if (status === 429 && code === 'global_limit') return 'global_limit';
  if (isBusy({ status, code })) return 'busy';
  // the per-network 10-minute rate limit — a retry in seconds would only hit it again
  if (status === 429 && code === 'slow_down') return 'rate_limited';
  // any other 429, or 503 (the vision key is missing): capacity — "in a minute"
  if (status === 429 || status === 503) return 'busy';
  // a session the server no longer knows (App.tsx's boot sync drops a dead
  // guest token and a fresh one is minted — the next attempt works)
  if (status === 401) return 'unauthorized';
  // no_image: an empty upload, which only an unreadable photo produces;
  // too_large: a photo the client failed to downsize
  if ((status === 400 && (code === 'bad_image' || code === 'no_image')) || status === 413) return 'bad_image';
  // the upload itself stalled for 45 s — a connection problem, not the photo
  if (status === 408) return 'offline';
  return 'generic';
}

export async function analyzePhoto(base64: string, mediaType: string): Promise<AnalyzeResult> {
  // /api/analyze is authenticated (vision costs money per call). Since build
  // 35 the token is a silently minted guest session: a photo taken on a cold
  // start can beat the mint, so wait for it (never throws; a failed mint
  // simply sends the request token-less and the server answers 401).
  const serverToken = await (await import('./guestSession')).waitForSession();
  const post = () =>
    fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(serverToken ? { Authorization: `Bearer ${serverToken}` } : {}),
      },
      body: JSON.stringify({ image: base64, media_type: mediaType }),
      // vision + inline research can legitimately take ~30s; fail crisply after 45
      signal: timeoutSignal(45_000),
    });
  // a fetch that rejects (no network, DNS, the 45 s abort) never reached the
  // server: carry status 0 / 'offline' so Confirm can say "check your connection"
  const send = async (): Promise<Response> => {
    try {
      return await post();
    } catch (e) {
      throw Object.assign(new Error('analyze offline'), { status: 0, code: 'offline', cause: e });
    }
  };
  let res = await send();
  if (!res.ok) {
    const err = await analyzeError(res);
    // busy clears in seconds: retry ONCE, quietly, before failing. Nothing
    // else retries — a limit, slow_down or a bad photo won't change in 3 s.
    if (!isBusy(err)) throw err;
    await new Promise((r) => setTimeout(r, BUSY_RETRY_MS));
    res = await send();
    if (!res.ok) throw await analyzeError(res);
  }
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
