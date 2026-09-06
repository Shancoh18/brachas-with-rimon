/**
 * Daily Parsha reading — the classic daily-Chumash schedule: the coming
 * Shabbat's parsha divided by its seven aliyot, one per weekday
 * (Sunday = rishon … Shabbat = shevi'i).
 *
 * Sources: aliyah ranges from Hebcal's leyning API; the Torah text itself
 * (public domain) from the Sefaria API — same licensed-liturgy channel as
 * the nusach packs. Halachic RULES still come only from the three approved
 * sites; this is Torah text, not psak. Cached in the store for offline.
 */

export interface ParshaReading {
  parsha: string; // "Parashat Vayechi" — or the Yom Tov reading's name
  aliyahNumber: number; // 1..7 (clamped to the aliyot the reading has)
  aliyahName: string;
  ref: string; // "Genesis 47:28-48:9"
  hebrew: string[];
  english: string[];
  license: string;
  fetchedDay: string; // YYYY-MM-DD guard
  /** the coming Shabbat carries a Yom Tov reading, not the weekly parsha —
   *  the reader drops the "one aliyah a day / n of 7" framing */
  holiday?: boolean;
  /** on a Yom Tov week: the NEXT regular parsha, so "this week's takeaway"
   *  still has a parsha to teach from */
  takeawayParsha?: string;
}

const ALIYAH_NAMES = ['Rishon', 'Sheni', 'Shlishi', 'Revi’i', 'Chamishi', 'Shishi', 'Shevi’i'];

/** one Hebcal leyning item — `type` is 'shabbat' for the weekly parsha and
 *  'holiday' when a Yom Tov reading displaces it */
interface LeyningItem {
  type?: string;
  name?: { en?: string };
  fullkriyah?: Record<string, { k: string; b: string; e: string }>;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayKey = () => dayKey(new Date());

const nextShabbat = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); // upcoming Saturday (today if Sat)
  return d;
};

const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ' };

/** Sefaria text → plain verse. Footnote markers and bodies are DROPPED (they
 *  read as stray letters/commentary inside the pasuk), <br> keeps a space so
 *  words don't fuse, then any other tag and the common entities go. */
const strip = (s: string) =>
  s
    .replace(/<sup class="footnote-marker">[\s\S]*?<\/sup>/g, '')
    .replace(/<i class="footnote">[\s\S]*?<\/i>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (_m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : ' ';
      }
      return ENTITIES[e.toLowerCase()] ?? ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

const leyning = async (start: string, end: string): Promise<LeyningItem[]> => {
  const res = await fetch(`https://www.hebcal.com/leyning?cfg=json&start=${start}&end=${end}`);
  if (!res.ok) throw new Error(`hebcal ${res.status}`);
  const ley = (await res.json()) as { items?: LeyningItem[] };
  return ley.items ?? [];
};

export async function fetchDailyParsha(): Promise<ParshaReading> {
  const satDate = nextShabbat();
  const sat = dayKey(satDate);
  const items = await leyning(sat, sat);

  // the weekly parsha first; a Yom Tov that falls on Shabbat replaces it and
  // Hebcal lists that holiday reading (type 'holiday') instead
  const item = items.find((i) => i.type === 'shabbat' && i.fullkriyah) ?? items.find((i) => i.fullkriyah);
  if (!item?.fullkriyah) throw new Error('no leyning');
  const holiday = item.type !== 'shabbat';

  // holiday readings have fewer aliyot (5 on Yom Tov) — clamp so a Friday
  // doesn't ask for a sixth that isn't there
  const available = Object.keys(item.fullkriyah).filter((k) => /^\d+$/.test(k)).length;
  const aliyahNumber = Math.max(1, Math.min(new Date().getDay() + 1, 7, available || 7)); // Sun=1 … Sat=7
  const a = item.fullkriyah[String(aliyahNumber)];
  if (!a) throw new Error('no aliyah');
  const ref = `${a.k} ${a.b}-${a.e}`;

  const res = await fetch(
    `https://www.sefaria.org/api/texts/${encodeURIComponent(ref.replace(/ /g, '_'))}?context=0&commentary=0`,
  );
  if (!res.ok) throw new Error(`sefaria ${res.status}`);
  const sef = (await res.json()) as { he?: unknown; text?: unknown; license?: string; versionTitle?: string; error?: string };
  if (sef.error) throw new Error(`sefaria: ${sef.error}`);

  const flat = (x: unknown): string[] =>
    Array.isArray(x) ? (x as unknown[]).flatMap(flat) : typeof x === 'string' ? [strip(x)] : [];
  const hebrew = flat(sef.he).filter(Boolean).slice(0, 14);
  // an empty Hebrew body is a failed fetch, not a reading — throwing lets
  // Learn's catch keep yesterday's cached reading instead of a blank card
  if (hebrew.length === 0) throw new Error('empty text');

  // Yom Tov week: the takeaway still teaches from a parsha — the next regular
  // one on the calendar (up to three weeks out covers Sukkot/Pesach runs)
  let takeawayParsha: string | undefined;
  if (holiday) {
    try {
      const ahead = await leyning(dayKey(addDays(satDate, 1)), dayKey(addDays(satDate, 21)));
      takeawayParsha = ahead.find((i) => i.type === 'shabbat')?.name?.en;
    } catch {
      /* the takeaway simply falls back to the reading's own name */
    }
  }

  return {
    parsha: (item.name?.en ?? 'This week’s parsha').replace(/\s*\(on Shabbat\)\s*/i, ''),
    aliyahNumber,
    aliyahName: ALIYAH_NAMES[aliyahNumber - 1],
    ref,
    hebrew,
    english: flat(sef.text).slice(0, 14),
    license: sef.license ? `${sef.versionTitle ?? ''} (${sef.license}) via Sefaria` : 'via Sefaria',
    fetchedDay: todayKey(),
    ...(holiday ? { holiday: true } : {}),
    ...(takeawayParsha ? { takeawayParsha } : {}),
  };
}

/** Today's reading is on hand AND has text — a cached reading with an empty
 *  body (a Sefaria hiccup once persisted one) must be refetched. */
export const parshaIsFresh = (p: ParshaReading | null): boolean =>
  p?.fetchedDay === todayKey() && (p?.hebrew?.length ?? 0) > 0;
