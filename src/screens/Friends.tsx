/**
 * Friends tab — the real social layer.
 * The app is account-first (AuthGate mounts whenever there's no serverToken),
 * so this screen always renders signed-in: friend code (RIMON-XXXX) → trade
 * codes → shared weekly league + boards synced through the Railway backend.
 * Shows the local Rimon-pacer league only while offline / before first sync.
 */
import { useEffect, useMemo, useState } from 'react';
import { apiAddFriend, apiLeague, apiSync, type LeagueRow } from '../lib/api';
import { streakAlive } from '../lib/progress';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';
import { Boards } from '../components/Boards';

export function Friends() {
  const { progress, displayName, setDisplayName, serverToken, friendCode, clearServerAccount } =
    useBracha();
  const [league, setLeagueLocal] = useState<LeagueRow[] | null>(null);
  const setLeagueSnapshot = useBracha((s) => s.setLeagueSnapshot);
  // keep the home-screen catch-up nudge in sync with whatever this tab loads
  const setLeague = (rows: LeagueRow[] | null) => {
    setLeagueLocal(rows);
    setLeagueSnapshot(rows);
  };
  const [status, setStatus] = useState<'idle' | 'busy' | 'offline'>('idle');
  const [codeInput, setCodeInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const alive = streakAlive(progress);

  // sync progress + pull league whenever the tab opens
  useEffect(() => {
    if (!serverToken) return;
    setStatus('busy');
    apiSync(serverToken, progress, displayName || undefined)
      .then((r) => {
        setLeague(r.league);
        setStatus('idle');
      })
      .catch((e) => {
        if ((e as { status?: number }).status === 401) {
          clearServerAccount(); // server no longer knows us — re-join cleanly
          setStatus('idle');
        } else setStatus('offline');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToken]);

  const addFriend = async () => {
    if (!serverToken || !codeInput.trim()) return;
    setStatus('busy');
    try {
      const r = await apiAddFriend(serverToken, codeInput);
      setLeague(r.league);
      setNotice(`${r.added} joined your league! 🎉`);
      setCodeInput('');
      setStatus('idle');
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 404
          ? 'No league member has that code or email yet — invite them below!'
          : 'Couldn’t reach the league — try again in a moment.',
      );
      setStatus('idle');
    }
  };

  const refresh = async () => {
    if (!serverToken) return;
    setStatus('busy');
    try {
      const r = await apiLeague(serverToken);
      setLeague(r.league);
      setStatus('idle');
    } catch {
      setStatus('offline');
    }
  };

  // local fallback rows (offline / not joined): you + Rimon the pacer
  const localLeague: LeagueRow[] = useMemo(() => {
    const rimonScore =
      progress.totalBrachos >= 25 ? Math.floor(progress.totalBrachos * 0.8) : progress.totalBrachos + 3;
    const myPoints = progress.points ?? 0;
    const rimonPoints = rimonScore * 2;
    return [
      { name: displayName || 'You', code: '', totalBrachos: progress.totalBrachos, weekBrachos: progress.totalBrachos, points: myPoints, weekPoints: myPoints, todayPoints: 0, streak: alive ? progress.streakCurrent : 0, you: true },
      { name: 'Rimon 🍎', code: '', totalBrachos: rimonScore, weekBrachos: rimonScore, points: rimonPoints, weekPoints: rimonPoints, todayPoints: 0, streak: 999, you: false },
    ].sort((a, b) => b.weekPoints - a.weekPoints);
  }, [progress, displayName, alive]);

  const rows = league ?? localLeague;

  const invite = async () => {
    const text = `I'm learning brachos with Rimon 🍎 — join my league with code ${friendCode ?? ''} at`;
    const url = 'https://shancoh18.github.io/brachas-with-rimon/';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Brachas with Rimon', text, url });
        return;
      } catch {
        /* cancelled */
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
              Your league syncs across everyone — most brachos this week leads.
            </p>
          </div>
          <Rimon pose="pointing" size={88} />
        </header>

        {/* name + join */}
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
          {friendCode && (
            <div className="mt-3 flex items-center justify-between border-t border-espresso/[0.07] pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mocha">Your friend code</p>
                <p className="font-display text-[22px] font-bold tracking-wide text-gold">{friendCode}</p>
              </div>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(friendCode);
                  setNotice('Code copied — send it to a friend!');
                }}
                className="rounded-full bg-espresso/[0.05] px-4 py-2 text-[11px] font-bold text-espresso-soft transition-colors hover:bg-espresso/10"
              >
                copy
              </button>
            </div>
          )}
        </Bezel>

        {/* add a friend */}
        {serverToken && (
          <Bezel className="rise-in rise-in-2 mt-3" innerClassName="px-5 py-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-mocha">
              Add a friend — code or email
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.includes('@') ? e.target.value.toLowerCase() : e.target.value.toUpperCase())}
                placeholder="RIMON-XXXX or friend@email.com"
                maxLength={254}
                className="w-full bg-transparent font-display text-[16px] font-bold tracking-wide text-espresso outline-none placeholder:text-[12px] placeholder:text-mocha/40"
              />
              <PillButton icon="+" onClick={() => void addFriend()} disabled={status === 'busy' || !codeInput.trim()}>
                Add
              </PillButton>
            </div>
          </Bezel>
        )}

        {notice && (
          <p className="rise-in pt-3 text-center text-[12px] font-medium text-gold">{notice}</p>
        )}
        {status === 'offline' && (
          <p className="pt-3 text-center text-[11px] text-rimon">
            League is offline right now — showing your local practice; it syncs when you're back.
          </p>
        )}

        {/* league */}
        <div className="flex items-center justify-between pb-3 pt-7">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
            This week's league
          </h3>
          {serverToken && (
            <button onClick={() => void refresh()} className="text-[11px] font-semibold text-mocha hover:text-espresso">
              {status === 'busy' ? 'syncing…' : '↻ refresh'}
            </button>
          )}
        </div>
        <Bezel className="rise-in rise-in-2" innerClassName="divide-y divide-espresso/[0.06] px-2 py-1">
          {rows.map((row, i) => (
            <div key={row.code || row.name} className={`flex items-center gap-3 px-3 py-3.5 ${row.you ? '' : 'opacity-90'}`}>
              <span className={`w-6 text-center font-display text-[18px] font-bold ${i === 0 ? 'text-gold' : 'text-mocha'}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-espresso">
                  {row.name}
                  {row.you && (
                    <span className="ml-2 rounded-full bg-rimon/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rimon">
                      you
                    </span>
                  )}
                  {row.streak > 0 && row.streak < 999 && (
                    <span className="ml-2 text-[11px] text-mocha">🔥{row.streak}</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold text-espresso">
                  ⭐ {row.weekPoints ?? 0}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-mocha">
                  pts this week
                </p>
              </div>
              <div className="w-14 text-right">
                <p className="text-[13px] font-bold text-espresso-soft">{row.weekBrachos}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-mocha">brachos</p>
              </div>
            </div>
          ))}
        </Bezel>
        {/* invite */}
        <div className="flex flex-col items-center gap-3 pt-7">
          <PillButton variant="rimon" icon="✉️" onClick={() => void invite()}>
            {copied ? 'Invite copied!' : 'Invite a friend'}
          </PillButton>
          <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-mocha">
            Three who eat together form a zimmun — gratitude was always designed to be social.
          </p>
        </div>

        {/* named leaderboards — create/join by code */}
        <Boards />
      </div>
    </ScreenShell>
  );
}
