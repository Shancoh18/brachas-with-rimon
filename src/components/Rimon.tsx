/**
 * Rimon — the app's living companion.
 *
 * Life system v3:
 *  - SEVEN motion loops (idle/celebrate/thinking/pointing/teaching/walk/DANCE)
 *  - ambient life ticks: every ~9-15s he wiggles on his own
 *  - tap-boop (squash-and-stretch + cycling reaction lines)
 *  - variants: round (default), WIDE cinematic banner crop
 *  - RimonWalker (guide progress) + RimonPeek (peeks over section edges)
 *  - assets color-matched to the canvas cream; prefers-reduced-motion safe
 */
import { useEffect, useRef, useState } from 'react';

export type RimonPose =
  | 'hello'
  | 'thinking'
  | 'pointing'
  | 'teaching'
  | 'idle'
  | 'celebrate'
  | 'walk'
  | 'dance';

const BASE = import.meta.env.BASE_URL;

const STILL: Record<RimonPose, string> = {
  hello: `${BASE}mascot/rimon-hello.webp`,
  thinking: `${BASE}mascot/rimon-thinking.webp`,
  pointing: `${BASE}mascot/rimon-pointing.webp`,
  teaching: `${BASE}mascot/rimon-teaching.webp`,
  idle: `${BASE}mascot/rimon-hello.webp`,
  celebrate: `${BASE}mascot/rimon-hello.webp`,
  walk: `${BASE}mascot/rimon-hello.webp`,
  dance: `${BASE}mascot/rimon-hello.webp`,
};

const VIDEO: Partial<Record<RimonPose, string>> = {
  idle: `${BASE}mascot/rimon-idle.mp4`,
  celebrate: `${BASE}mascot/rimon-celebrate.mp4`,
  thinking: `${BASE}mascot/rimon-thinking.mp4`,
  pointing: `${BASE}mascot/rimon-pointing.mp4`,
  teaching: `${BASE}mascot/rimon-teaching.mp4`,
  walk: `${BASE}mascot/rimon-walk.mp4`,
  dance: `${BASE}mascot/rimon-dance.mp4`,
};

const BOOP_LINES = [
  'Boop! 🍎',
  'A bracha turns a snack into a thank-you.',
  'Did you know? My crown has exactly five points.',
  'Olive, date, grape, fig, pomegranate — that’s the order!',
  'One hundred brachos a day — we’re on our way.',
  'Ask me after your next meal!',
];

const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Rimon({
  pose = 'idle',
  say,
  size = 132,
  className = '',
  float = true,
  variant = 'round',
}: {
  pose?: RimonPose;
  say?: string;
  size?: number;
  className?: string;
  float?: boolean;
  /** round = the classic blend circle; wide = cinematic 2:1 banner crop */
  variant?: 'round' | 'wide';
}) {
  const [videoOk, setVideoOk] = useState(true);
  const [boops, setBoops] = useState(0);
  const [booping, setBooping] = useState(false);
  const [wiggling, setWiggling] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lineTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const src = reducedMotion() ? undefined : VIDEO[pose];

  useEffect(() => {
    setVideoOk(true);
    videoRef.current?.load();
  }, [pose]);

  // ambient life: a small self-wiggle every 9-15s
  useEffect(() => {
    if (reducedMotion()) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      t = setTimeout(() => {
        if (!alive) return;
        setWiggling(true);
        setTimeout(() => setWiggling(false), 700);
        tick();
      }, 9000 + Math.random() * 6000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => () => clearTimeout(lineTimer.current), []);

  const boop = () => {
    setBooping(true);
    setTimeout(() => setBooping(false), 550);
    setLine(BOOP_LINES[boops % BOOP_LINES.length]);
    setBoops((b) => b + 1);
    clearTimeout(lineTimer.current);
    lineTimer.current = setTimeout(() => setLine(null), 2600);
  };

  const bubble = line ?? say;

  const media = src && videoOk ? (
    <video
      ref={videoRef}
      className={`h-full w-full object-cover ${variant === 'round' ? 'rimon-blend' : 'rimon-wide-blend'}`}
      autoPlay
      loop
      muted
      playsInline
      poster={STILL[pose]}
      onError={() => setVideoOk(false)}
    >
      <source src={src} type="video/mp4" />
    </video>
  ) : (
    <img
      src={STILL[pose]}
      alt=""
      draggable={false}
      className={`h-full w-full object-cover ${variant === 'round' ? 'rimon-blend' : 'rimon-wide-blend'}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = STILL.hello;
      }}
    />
  );

  if (variant === 'wide') {
    return (
      <div className={`rimon-enter ${className}`}>
        <button
          type="button"
          onClick={boop}
          aria-label={`Rimon the pomegranate, ${pose} — tap to say hi`}
          className={`${booping ? 'rimon-boop' : ''} ${wiggling && !booping ? 'rimon-wiggle' : ''} block w-full cursor-pointer border-0 bg-transparent p-0 outline-none`}
          style={{ aspectRatio: '2.2 / 1' }}
        >
          {media}
        </button>
        {bubble && (
          <p key={bubble} className="bubble-pop pt-1 text-center text-[12.5px] text-espresso-soft">
            {bubble}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`rimon-enter flex flex-col items-center gap-3 ${className}`}>
      {bubble && (
        <div
          key={bubble}
          className="bubble-pop relative max-w-[260px] rounded-3xl border border-espresso/10 bg-white/75 px-5 py-3 text-center text-[13.5px] leading-snug text-espresso-soft shadow-[0_12px_40px_rgba(43,33,26,0.08)] backdrop-blur-sm"
        >
          {bubble}
          <span className="absolute -bottom-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b border-r border-espresso/10 bg-white/75" />
        </div>
      )}
      <button
        type="button"
        onClick={boop}
        aria-label={`Rimon the pomegranate, ${pose} — tap to say hi`}
        className={`${float && !reducedMotion() ? 'float-soft' : ''} ${booping ? 'rimon-boop' : ''} ${wiggling && !booping ? 'rimon-wiggle' : ''} relative cursor-pointer select-none border-0 bg-transparent p-0 outline-none`}
        style={{ width: size, height: size }}
      >
        {media}
        {/* dark mode only (CSS-gated): warms the cream render and vignettes
            its rim so the disc reads as candlelight, not a porthole */}
        <span aria-hidden className="rimon-warm" />
      </button>
    </div>
  );
}

/** Rimon walks the guide's progress track; celebrates at the end. */
export function RimonWalker({ progress, done }: { progress: number; done: boolean }) {
  return (
    <div className="relative mx-auto h-16 w-full max-w-[300px]">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-espresso/[0.08]" />
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: `${Math.max(4, progress * 100)}%` }}
      />
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ left: `${6 + progress * 88}%` }}
      >
        <Rimon pose={done ? 'dance' : 'walk'} size={58} float={false} />
      </div>
    </div>
  );
}

/** Rimon peeking over the bottom of a section — half-visible, alive. */
export function RimonPeek({ say }: { say?: string }) {
  return (
    <div className="pointer-events-none relative mt-2 h-20 overflow-hidden">
      <div className="pointer-events-auto absolute -bottom-9 right-8 rotate-[-7deg]">
        <Rimon pose="idle" size={104} float={false} />
      </div>
      {say && (
        <p className="absolute bottom-4 left-6 max-w-[200px] text-left text-[11.5px] italic leading-snug text-mocha">
          {say}
        </p>
      )}
    </div>
  );
}
