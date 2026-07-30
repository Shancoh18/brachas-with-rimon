/** Learn tab — the "why we say it" library. Rimon teaches. */
import { useState } from 'react';
import { LESSONS } from '../data/learn';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

export function Learn() {
  const { progress, markLessonRead } = useBracha();
  const [openId, setOpenId] = useState<string | null>(null);
  const lesson = LESSONS.find((l) => l.id === openId);

  if (lesson) {
    return (
      <ScreenShell>
        <div className="pb-24">
          <button
            onClick={() => setOpenId(null)}
            className="rise-in pb-5 text-[12.5px] font-medium text-mocha hover:text-espresso"
          >
            ← all lessons
          </button>
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
              Short lessons on what a bracha actually does — {progress.lessonsRead.length} of{' '}
              {LESSONS.length} read.
            </p>
          </div>
          <Rimon pose="teaching" size={88} />
        </header>
        <div className="flex flex-col gap-3">
          {LESSONS.map((l, idx) => {
            const read = progress.lessonsRead.includes(l.id);
            return (
              <button key={l.id} onClick={() => setOpenId(l.id)} className="text-left">
                <Bezel className={`rise-in rise-in-${Math.min(idx + 1, 4)}`} innerClassName="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-espresso">
                        {l.emoji} {l.title}
                      </p>
                      <p className="mt-1 truncate text-[11.5px] italic text-mocha">{l.hook}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider ${
                        read ? 'bg-sage/15 text-sage' : 'bg-espresso/[0.06] text-mocha'
                      }`}
                    >
                      {read ? 'read ✓' : `${l.minutes} min`}
                    </span>
                  </div>
                </Bezel>
              </button>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}
