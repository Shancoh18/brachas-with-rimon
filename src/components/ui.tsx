/**
 * Editorial-luxury primitives: double-bezel cards, island pill buttons with
 * nested trailing icons, eyebrow tags. (See the design-system rules in
 * CLAUDE.md — no raw gray borders, no harsh shadows, custom easing only.)
 */
import { useState, type ReactNode } from 'react';
import type { WhyEntry } from '../data/why';
import { useSplit } from '../lib/duo';

const EASE = 'transition-[background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]';

/** Double-bezel: outer shell tray + inner core with concentric radii. */
export function Bezel({
  children,
  className = '',
  innerClassName = '',
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] bg-espresso/[0.045] p-1.5 ring-1 ring-espresso/[0.06] ${className}`}
    >
      <div
        className={`rounded-[calc(2rem-0.375rem)] bg-white/75 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_18px_50px_-24px_rgba(43,33,26,0.25)] ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-gold/30 bg-gold/[0.07] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-gold">
      {children}
    </span>
  );
}

/** Island pill CTA with the nested button-in-button trailing icon. */
export function PillButton({
  children,
  icon = '→',
  onClick,
  variant = 'primary',
  className = '',
  disabled,
}: {
  children: ReactNode;
  icon?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'rimon';
  className?: string;
  disabled?: boolean;
}) {
  const base =
    variant === 'primary'
      ? 'bg-espresso text-cream hover:bg-espresso/90'
      : variant === 'rimon'
        ? 'bg-rimon text-cream hover:bg-rimon-deep'
        : 'bg-transparent text-espresso ring-1 ring-espresso/15 hover:ring-espresso/30';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex items-center gap-3 rounded-full py-2.5 pl-6 pr-2.5 text-[14px] font-semibold ${EASE} active:scale-[0.98] disabled:opacity-40 ${base} ${className}`}
    >
      {children}
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] ${EASE} group-hover:translate-x-0.5 group-hover:scale-105 ${
          variant === 'ghost' ? 'bg-espresso/5' : 'bg-white/15'
        }`}
      >
        {icon}
      </span>
    </button>
  );
}

/**
 * "Why" disclosure — the click-to-open explainer on each bracha page.
 * Collapsed: a single quiet gold line. Open: labeled sections + the
 * chabad.org source link. Animates with the grid-rows trick so height is
 * fully fluid, on the house easing only.
 */
export function WhyDropdown({
  entry,
  intro,
  className = '',
}: {
  entry: WhyEntry;
  intro?: { text: string; sourceTitle: string; sourceUrl: string };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl bg-gold/[0.05] ring-1 ring-gold/20 ${className}`} data-why>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ${EASE}`}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          Why this bracha?
        </span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-[11px] text-gold transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'max-h-[44rem] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div>
          <div className="space-y-4 px-4 pb-4 pt-1">
            {intro && (
              <p className="text-[12px] italic leading-relaxed text-mocha">{intro.text}</p>
            )}
            {entry.sections.map((s) => (
              <div key={s.label}>
                <p className="pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-espresso-soft">
                  {s.label}
                </p>
                <p className="text-[12.5px] leading-relaxed text-espresso">{s.text}</p>
              </div>
            ))}
            <p className="border-t border-gold/15 pt-3 text-[10.5px] leading-snug text-mocha">
              AI makes mistakes, to learn more information please read the article. Learn more:{' '}
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-gold/40 underline-offset-2 hover:text-espresso"
              >
                {entry.sourceTitle}
              </a>
              {intro && (
                <>
                  {' · '}
                  <a
                    href={intro.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-gold/40 underline-offset-2 hover:text-espresso"
                  >
                    {intro.sourceTitle}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Persistent learning-aid disclaimer — required on every screen. */
export function Disclaimer() {
  return (
    <p className="mx-auto max-w-md px-6 pb-6 pt-3 text-center text-[10.5px] leading-relaxed text-mocha">
      This app is a <em>study aid</em>. For any practical halachic question, consult a qualified
      rabbi. Sources: chabad.org · brachos.org · oukosher.org
    </p>
  );
}

/**
 * Every screen's frame, with the required disclaimer.
 *
 * `aside` = the facing page for an open iPhone Duo — the web cousin of
 * SwiftUI's ArrangementView (iOS 27.1, split style). When useSplit() is true
 * the screen becomes two equal pages that meet at the hinge: `aside` on the
 * left, sticky, so the meal photo or Rimon stays in view; the screen's own
 * content scrolls on the right. Otherwise `aside` is not rendered at all
 * (no hidden Rimon video loading on phones); screens render their phone-only
 * bits behind `!useSplit()`, so the phone layout is unchanged.
 *
 * Safety net: open wide, EVERY screen is two pages. A screen that has no
 * `aside` of its own still keeps its content on the right page (left page
 * empty) — no button may ever sit in the crease (owner, 2026-10-29).
 *
 * ONE element tree in both modes (the aside slot is null, not missing):
 * opening or closing the Duo must not remount the screen — Apple asks apps
 * to keep state across fold changes, and a remount would cut off a playing
 * Hear-it clip, reset the Why panel and lose focus mid-search.
 */
export function ScreenShell({
  children,
  wide = false,
  aside,
}: {
  children: ReactNode;
  wide?: boolean;
  aside?: ReactNode;
}) {
  const split = useSplit();
  return (
    <div
      className={
        split
          ? // columns meet at exactly 50vw — the hinge — whatever the side insets
            'grain grid min-h-[var(--page-h)] grid-cols-[calc(50vw_-_var(--safe-left))_minmax(0,1fr)]'
          : // --page-h = 100dvh minus what <body> pads on iOS (index.css)
            'grain flex min-h-[var(--page-h)] flex-col'
      }
    >
      {split ? (
        // my-auto centres the page when it fits and lets it scroll from the
        // top when the window is short — never clipped. No overscroll-contain:
        // a swipe on the left page must still scroll the screen (review
        // 2026-10-29 — contain swallowed it whenever the page fit).
        // a plain <div>, not <aside>: the left page holds the screen's title
        // and instructions — not "complementary" content a screen reader may
        // skip (review 2026-10-29)
        <div
          data-duo-aside={aside != null ? '' : 'empty'}
          aria-hidden={aside != null ? undefined : true}
          className="sticky top-[var(--page-top)] flex h-[var(--page-h)] flex-col overflow-y-auto pl-6 pr-10 text-center"
        >
          {aside != null ? <div className="my-auto flex flex-col items-center gap-5 py-8">{aside}</div> : null}
        </div>
      ) : null}
      {/* right page: a fold gutter on the left; on the right at least 16px, or
          the tab rail's width (--rail-w, .rail-gutter in index.css) when the
          rail floats on the page instead of standing in the Duo's column.
          On phones this wrapper is display:contents — it keeps the element
          tree stable across a fold without adding a box, so <main> and the
          disclaimer lay out exactly as they always have. */}
      <div
        className={
          split ? 'flex min-h-[var(--page-h)] min-w-0 flex-col pl-5 pr-[calc(max(var(--rail-w,0px),16px)_+_4px)]' : 'contents'
        }
      >
        <main
          className={`mx-auto flex w-full flex-1 flex-col ${
            split ? 'max-w-md px-4 pt-10' : `px-5 pt-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`
          }`}
        >
          {children}
        </main>
        <Disclaimer />
      </div>
    </div>
  );
}
