/**
 * Learn tab — the "why we say it" library, built to grow.
 *
 * AUTO-UPDATE: on mount it pulls extra lessons from the backend
 * (/api/lessons — served from an updatable file on the Railway volume, so new
 * study material can appear any day without an app redeploy). Remote lessons
 * merge with the built-in library by id and are cached for offline.
 *
 * DAILY ROTATION: three lessons are featured as "Today's study", rotated by
 * date so the shelf feels fresh every morning.
 *
 * STARRING: a starred lesson is pinned to the top and NEVER leaves —
 * whatever new content arrives — until the user unstars it.
 */
import { useEffect, useMemo, useState } from 'react';
import { LESSONS, type Lesson } from '../data/learn';
import { apiLessons } from '../lib/api';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

/** date-seeded deterministic rotation */
const dailyPick = (pool: Lesson[], count: number): Set<string> => {
  const day = Math.floor(Date.now() / 86_400_000);
  const picked = new Set<string>();
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    picked.add(pool[(day * 7 + i * 3) % pool.length].id);
  }
  return picked;
};

function Star({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={on ? 'unstar lesson' : 'star lesson — keep it pinned'}
      className={`shrink-0 p-1 text-[18px] leading-none transition-transform duration-150 ease-out active:scale-90 ${
        on ? 'text-gold' : 'text-espresso/20 hover:text-gold/60'
      }`}
    >
      {on ? '★' : '☆'}
    </button>
  );
}

export function Learn() {
  const { progress, markLessonRead, starredLessons, toggleStar, remoteLessons, setRemoteLessons } =
    useBracha();
  const [openId, setOpenId] = useState<string | null>(null);

  // auto-update: merge remote lessons (cached offline via the store)
  useEffect(() => {
    apiLessons()
      .then((r) => Array.isArray(r.lessons) && setRemoteLessons(r.lessons))
      .catch(() => undefined); // offline → cached copy stands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const library = useMemo(() => {
    const byId = new Map<string, Lesson>();
    for (const l of LESSONS) byId.set(l.id, l);
    for (const l of remoteLessons) byId.set(l.id, l); // remote can update built-ins
    return [...byId.values()];
  }, [remoteLessons]);

  const fresh = useMemo(() => dailyPick(library, 3), [library]);
  const lesson = library.find((l) => l.id === openId);

  const starred = library.filter((l) => starredLessons.includes(l.id));
  const todays = library.filter((l) => fresh.has(l.id) && !starredLessons.includes(l.id));
  const rest = library.filter((l) => !fresh.has(l.id) && !starredLessons.includes(l.id));

  const Card = ({ l, idx, badge }: { l: Lesson; idx: number; badge?: string }) => {
    const read = progress.lessonsRead.includes(l.id);
    return (
      <button key={l.id} onClick={() => setOpenId(l.id)} className="w-full text-left">
        <Bezel className={`rise-in rise-in-${Math.min(idx + 1, 4)}`} innerClassName="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14.5px] font-semibold text-espresso">
                  {l.emoji} {l.title}
                </p>
                {badge && (
                  <span className="rounded-full bg-rimon/10 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rimon">
                    {badge}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[11.5px] italic text-mocha">{l.hook}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider ${
                  read ? 'bg-sage/15 text-sage' : 'bg-espresso/[0.06] text-mocha'
                }`}
              >
                {read ? 'read ✓' : `${l.minutes} min`}
              </span>
              <Star on={starredLessons.includes(l.id)} onClick={() => toggleStar(l.id)} />
            </div>
          </div>
        </Bezel>
      </button>
    );
  };

  if (lesson) {
    const starredNow = starredLessons.includes(lesson.id);
    return (
      <ScreenShell>
        <div className="pb-24">
          <div className="rise-in flex items-center justify-between pb-5">
            <button
              onClick={() => setOpenId(null)}
              className="text-[12.5px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
            >
              ← all lessons
            </button>
            <Star on={starredNow} onClick={() => toggleStar(lesson.id)} />
          </div>
          <header className="rise-in flex items-start justify-between gap-3 pb-6">
            <div className="space-y-3">
              <Eyebrow>
                {lesson.emoji} {lesson.minutes} min read
              </Eyebrow>
              <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">
                {lesson.title}
              </h2>
              <p className="font-display text-[16px] italic leading-relaxed text-gold">{lesson.hook}</p>
            </div>
            <Rimon pose="teaching" size={76} className="shrink-0" />
          </header>
          <div className="rise-in rise-in-1 space-y-5">
            {lesson.body.map((p, i) => (
              <p key={i} className="text-[14.5px] leading-[1.75] text-espresso-soft">
                {p}
              </p>
            ))}
            <p className="border-t border-espresso/[0.08] pt-4 text-[11.5px] italic leading-relaxed text-mocha">
              {lesson.source}
            </p>
          </div>
          <div className="flex justify-center py-8">
            <PillButton
              variant="rimon"
              icon="✓"
              onClick={() => {
                markLessonRead(lesson.id);
                setOpenId(null);
              }}
            >
              {progress.lessonsRead.includes(lesson.id) ? 'Read again — done' : 'Mark as read'}
            </PillButton>
          </div>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <div className="pb-24">
        <header className="rise-in flex items-start justify-between gap-4 pb-6">
          <div className="space-y-2">
            <Eyebrow>The why behind the words</Eyebrow>
            <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">Learn</h2>
            <p className="text-[13px] leading-relaxed text-espresso-soft">
              Fresh study every day — {progress.lessonsRead.length} of {library.length} read.
            </p>
          </div>
          <Rimon pose="teaching" size={88} />
        </header>

        {starred.length > 0 && (
          <>
            <h3 className="rise-in pb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              ★ Starred — yours until you let go
            </h3>
            <div className="flex flex-col gap-3 pb-6">
              {starred.map((l, i) => (
                <Card key={l.id} l={l} idx={i} />
              ))}
            </div>
          </>
        )}

        <h3 className="rise-in pb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
          Today's study
        </h3>
        <div className="flex flex-col gap-3 pb-6">
          {todays.map((l, i) => (
            <Card key={l.id} l={l} idx={i} badge="fresh today" />
          ))}
        </div>

        {rest.length > 0 && (
          <>
            <h3 className="rise-in pb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
              The library
            </h3>
            <div className="flex flex-col gap-3">
              {rest.map((l, i) => (
                <Card key={l.id} l={l} idx={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </ScreenShell>
  );
}
