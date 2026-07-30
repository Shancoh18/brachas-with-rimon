/**
 * Rimon — the app's living companion (gen-AI character, Higgsfield stills +
 * seedance motion loops rendered on the app's exact cream so he sits IN the
 * page, not on a disc).
 *
 * Life system (design-motion audit: Jakub polish + Jhey delight):
 *  - every pose has a MOTION LOOP (video) with a still fallback chain
 *  - spring entrance on mount, gentle idle float, pose-change crossfade
 *  - INTERACTIVE: tap Rimon → squash-and-stretch boop + a reaction line
 *  - speech bubble pops in with a spring after he lands
 *  - honors prefers-reduced-motion (no float, videos show poster frame)
 */
import { useEffect, useRef, useState } from 'react';

export type RimonPose =
  | 'hello'
  | 'thinking'
  | 'pointing'
  | 'teaching'
  | 'idle'
  | 'celebrate'
  | 'walk';

const BASE = import.meta.env.BASE_URL;

const STILL: Record<RimonPose, string> = {
  hello: `${BASE}mascot/rimon-hello.webp`,
  thinking: `${BASE}mascot/rimon-thinking.webp`,
  pointing: `${BASE}mascot/rimon-pointing.webp`,
  teaching: `${BASE}mascot/rimon-teaching.webp`,
  idle: `${BASE}mascot/rimon-hello.webp`,
  celebrate: `${BASE}mascot/rimon-hello.webp`,
  walk: `${BASE}mascot/rimon-hello.webp`,
};

const VIDEO: Partial<Record<RimonPose, string>> = {
  idle: `${BASE}mascot/rimon-idle.mp4`,
  celebrate: `${BASE}mascot/rimon-celebrate.mp4`,
  thinking: `${BASE}mascot/rimon-thinking.mp4`,
  pointing: `${BASE}mascot/rimon-pointing.mp4`,
  teaching: `${BASE}mascot/rimon-teaching.mp4`,
  walk: `${BASE}mascot/rimon-walk.mp4`,
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
}: {
  pose?: RimonPose;
  say?: string;
  size?: number;
  className?: string;
  float?: boolean;
}) {
  const [videoOk, setVideoOk] = useState(true);
  const [boops, setBoops] = useState(0);
  const [booping, setBooping] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lineTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const src = reducedMotion() ? undefined : VIDEO[pose];

  useEffect(() => {
    setVideoOk(true);
    videoRef.current?.load();
  }, [pose]);

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
        className={`${float && !reducedMotion() ? 'float-soft' : ''} ${booping ? 'rimon-boop' : ''} cursor-pointer select-none border-0 bg-transparent p-0 outline-none`}
        style={{ width: size, height: size }}
      >
        {src && videoOk ? (
          <video
            ref={videoRef}
            className="rimon-blend h-full w-full object-cover"
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
            className="rimon-blend h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = STILL.hello;
            }}
          />
        )}
      </button>
    </div>
  );
}

/**
 * The walkthrough companion: Rimon physically WALKS along the guide's
 * progress track as the user advances, then celebrates at the end.
 * progress: 0..1 across the track width.
 */
export function RimonWalker({ progress, done }: { progress: number; done: boolean }) {
  return (
    <div className="relative mx-auto h-16 w-full max-w-[300px]">
      {/* the path */}
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-espresso/[0.08]" />
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: `${Math.max(4, progress * 100)}%` }}
      />
      {/* Rimon walking the path */}
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ left: `${6 + progress * 88}%` }}
      >
        <Rimon pose={done ? 'celebrate' : 'walk'} size={58} float={false} />
      </div>
    </div>
  );
}
