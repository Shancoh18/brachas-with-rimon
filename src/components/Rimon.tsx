/**
 * Rimon — the app's pomegranate companion (gen-AI character, Higgsfield
 * nano-banana stills + seedance video loops on the app-cream background so
 * they blend into the canvas without alpha).
 *
 * Poses: hello (still), thinking (still), pointing (still),
 *        idle (video loop), celebrate (video loop).
 */
import { useEffect, useRef, useState } from 'react';

export type RimonPose = 'hello' | 'thinking' | 'pointing' | 'teaching' | 'idle' | 'celebrate';

const STILL: Record<RimonPose, string> = {
  hello: '/mascot/rimon-hello.webp',
  thinking: '/mascot/rimon-thinking.webp',
  pointing: '/mascot/rimon-pointing.webp',
  teaching: '/mascot/rimon-teaching.webp',
  idle: '/mascot/rimon-hello.webp',
  celebrate: '/mascot/rimon-hello.webp',
};

const VIDEO: Partial<Record<RimonPose, string>> = {
  idle: '/mascot/rimon-idle.mp4',
  celebrate: '/mascot/rimon-celebrate.mp4',
};

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = VIDEO[pose];

  useEffect(() => {
    setVideoOk(true);
    videoRef.current?.load();
  }, [pose]);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {say && (
        <div className="relative max-w-[260px] rounded-3xl border border-espresso/10 bg-white/70 px-5 py-3 text-center text-[13.5px] leading-snug text-espresso-soft shadow-[0_12px_40px_rgba(43,33,26,0.08)] backdrop-blur-sm">
          {say}
          <span className="absolute -bottom-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b border-r border-espresso/10 bg-white/70" />
        </div>
      )}
      <div
        className={float ? 'float-soft' : ''}
        style={{ width: size, height: size }}
        aria-label={`Rimon the pomegranate, ${pose}`}
        role="img"
      >
        {src && videoOk ? (
          <video
            ref={videoRef}
            className="h-full w-full rounded-full object-cover [mask-image:radial-gradient(circle,black_62%,transparent_74%)]"
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
            className="h-full w-full rounded-full object-cover [mask-image:radial-gradient(circle,black_62%,transparent_74%)]"
            onError={(e) => {
              // pose still not generated yet → base pose
              (e.target as HTMLImageElement).src = STILL.hello;
            }}
          />
        )}
      </div>
    </div>
  );
}
