/**
 * "Hear it" — plays the ElevenLabs-generated recitation of a bracha.
 * Pronunciations are STT-verified against the Hebrew text but still labeled
 * beta; a native recording pass can replace public/audio/*.mp3 one-to-one.
 */
import { useEffect, useRef, useState } from 'react';

export function HearIt({ src, label = 'Hear it' }: { src: string; label?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setMissing(false);
    audioRef.current?.pause();
    audioRef.current = null;
  }, [src]);

  if (missing) return null;

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onerror = () => {
        setMissing(true);
        setPlaying(false);
      };
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
        playing
          ? 'bg-gold/15 text-gold ring-gold/30'
          : 'bg-transparent text-espresso-soft ring-espresso/15 hover:ring-gold/40 hover:text-gold'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-transform duration-500 ${
          playing ? 'bg-gold/20' : 'bg-espresso/[0.06] group-hover:scale-105'
        }`}
      >
        {playing ? '◼' : '▶'}
      </span>
      {playing ? 'Playing…' : label}
      <span className="text-[8.5px] font-bold uppercase tracking-widest opacity-50">beta</span>
    </button>
  );
}
