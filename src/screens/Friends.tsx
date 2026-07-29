/**
 * Friends tab — the social layer, adult-Duolingo tone.
 * v1 is local-first: your league card + share/invite. Real cross-device sync
 * needs accounts + a backend (see CLAUDE.md roadmap); everything here is
 * honest about that while still being fun (Rimon holds a spot in your league).
 */
import { useMemo, useState } from 'react';
import { streakAlive } from '../lib/progress';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

export function Friends() {
  const { progress, displayName, setDisplayName } = useBracha();
  const [copied, setCopied] = useState(false);
  const alive = streakAlive(progress);

  // Rimon paces you like a friendly rival: always a nose ahead until you pass 25.
  const rimonScore = useMemo(
    () => (progress.totalBrachos >= 25 ? Math.floor(progress.totalBrachos * 0.8) : progress.totalBrachos + 3),
    [progress.totalBrachos],
  );

  const league = [
    { name: displayName || 'You', score: progress.totalBrachos, streak: alive ? progress.streakCurrent : 0, you: true },
    { name: 'Rimon 🍎', score: rimonScore, streak: 999, you: false },
  ].sort((a, b) => b.score - a.score);

  const invite = async () => {
    const text = `I'm learning brachos with Rimon 🍎 — ${progress.totalBrachos} blessings and a ${progress.streakCurrent}-day streak so far. Join me on Brachas with Rimon!`;
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Brachas with Rimon', text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <ScreenShell>
      <div className="pb-24">
        <header className="rise-in flex items-start justify-between gap-4 pb-6">
          <div className="space-y-2">
            <Eyebrow>Blessings were meant to be heard</Eyebrow>
            <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">Friends</h2>
            <p className="text-[13px] leading-relaxed text-espresso-soft">
              See who's gathered the most brachos this week — and answer Amen to each other.
            </p>
          </div>
          <Rimon pose="pointing" size={88} />
        </header>

        {/* your name */}
        <Bezel className="rise-in rise-in-1" innerClassName="px-5 py-4">
          <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-mocha">
            Your league name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Shan"
            maxLength={20}
            className="mt-1 w-full bg-transparent text-[16px] font-semibold text-espresso outline-none placeholder:text-mocha/50"
          />
        </Bezel>

        {/* league */}
        <h3 className="rise-in rise-in-2 pb-3 pt-7 text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
          This week's league
        </h3>
        <Bezel className="rise-in rise-in-2" innerClassName="divide-y divide-espresso/[0.06] px-2 py-1">
          {league.map((row, i) => (
            <div key={row.name} className={`flex items-center gap-3 px-3 py-3.5 ${row.you ? '' : 'opacity-90'}`}>
              <span className={`w-6 text-center font-display text-[18px] font-bold ${i === 0 ? 'text-gold' : 'text-mocha'}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-espresso">
                  {row.name}
                  {row.you && <span className="ml-2 rounded-full bg-rimon/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rimon">you</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold text-espresso">{row.score}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-mocha">brachos</p>
              </div>
            </div>
          ))}
        </Bezel>
        <p className="pt-3 text-[10.5px] leading-snug text-mocha">
          Rimon keeps pace with you until your first 25 brachos — then it's your league to lose.
          Friend accounts with a real shared league are on the roadmap; invites below reserve your
          crew.
        </p>

        {/* invite */}
        <div className="flex flex-col items-center gap-3 pt-7">
          <PillButton variant="rimon" icon="✉️" onClick={() => void invite()}>
            {copied ? 'Invite copied!' : 'Invite a friend'}
          </PillButton>
          <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-mocha">
            Three who eat together form a zimmun — gratitude was always designed to be social.
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}
