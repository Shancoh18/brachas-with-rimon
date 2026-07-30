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
  parsha: string; // "Parashat Vayechi"
  aliyahNumber: number; // 1..7
  aliyahName: string;
  ref: string; // "Genesis 47:28-48:9"
  hebrew: string[];
  english: string[];
  license: string;
  fetchedDay: string; // YYYY-MM-DD guard
}

const ALIYAH_NAMES = ['Rishon', 'Sheni', 'Shlishi', 'Revi’i', 'Chamishi', 'Shishi', 'Shevi’i'];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const nextShabbat = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); // upcoming Saturday (today if Sat)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ');

export async function fetchDailyParsha(): Promise<ParshaReading> {
  const sat = nextShabbat();
  const ley = (await (
    await fetch(`https://www.hebcal.com/leyning?cfg=json&start=${sat}&end=${sat}`)
  ).json()) as { items?: { name?: { en?: string }; fullkriyah?: Record<string, { k: string; b: string; e: string }> }[] };

  const item = ley.items?.find((i) => i.fullkriyah);
  if (!item?.fullkriyah) throw new Error('no leyning');

  const aliyahNumber = Math.min(new Date().getDay() + 1, 7); // Sun=1 … Sat=7
  const a = item.fullkriyah[String(aliyahNumber)];
  if (!a) throw new Error('no aliyah');
  const ref = `${a.k} ${a.b}-${a.e}`;

  const sef = (await (
    await fetch(
      `https://www.sefaria.org/api/texts/${encodeURIComponent(ref.replace(/ /g, '_'))}?context=0&commentary=0`,
    )
  ).json()) as { he?: unknown; text?: unknown; license?: string; versionTitle?: string };

  const flat = (x: unknown): string[] =>
    Array.isArray(x) ? (x as unknown[]).flatMap(flat) : typeof x === 'string' ? [strip(x)] : [];

  return {
    parsha: item.name?.en ?? 'This week’s parsha',
    aliyahNumber,
    aliyahName: ALIYAH_NAMES[aliyahNumber - 1],
    ref,
    hebrew: flat(sef.he).slice(0, 14),
    english: flat(sef.text).slice(0, 14),
    license: sef.license ? `${sef.versionTitle ?? ''} (${sef.license}) via Sefaria` : 'via Sefaria',
    fetchedDay: todayKey(),
  };
}

export const parshaIsFresh = (p: ParshaReading | null): boolean => p?.fetchedDay === todayKey();
