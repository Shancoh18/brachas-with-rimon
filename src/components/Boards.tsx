/**
 * Named leaderboards — create one (family, shul, chevrusa), share its code,
 * and anyone who enters that code joins the same standings.
 *
 * Every board is a timed ROUND (owner spec 2026-08-10): pick one week, one
 * month, or one year at creation; everyone starts at 0; a countdown rides the
 * card; when the clock ends the podium freezes, the winner's lifetime wins
 * count goes up, and the owner can "run it back" for a fresh round.
 */
import { useEffect, useState } from 'react';
import {
  apiBoards,
  apiCreateBoard,
  apiJoinBoard,
  apiLeaveBoard,
  apiRestartBoard,
  type Board,
  type BoardDuration,
} from '../lib/api';
import { useBracha } from '../store';
import { Bezel, PillButton } from './ui';
import { BoardChat } from './BoardChat';

const MEDALS = ['🥇', '🥈', '🥉'];

export const DURATIONS: { id: BoardDuration; label: string; blurb: string; icon: string }[] = [
  { id: 'week', label: '1 week', blurb: 'a quick sprint', icon: '⚡' },
  { id: 'month', label: '1 month', blurb: 'the steady race', icon: '🌙' },
  { id: 'year', label: '1 year', blurb: 'the long game', icon: '🏛️' },
];

/** Live countdown chip — ticks every second under an hour, every minute above. */
export function Countdown({ endsAt, ended }: { endsAt: number; ended: boolean }) {
  const [, force] = useState(0);
  const left = (endsAt ?? 0) - Date.now();
  const fast = left > 0 && left < 3_600_000;
  const running = !!endsAt && !ended && left > 0;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => force((n) => n + 1), fast ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [running, fast]);
  if (!endsAt) return null; // API predates timed rounds (mid-deploy) — show nothing
  if (ended || left <= 0)
    return (
      <span
        data-board-countdown
        className="rounded-full bg-espresso/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-espresso-soft"
      >
        🏁 Finished
      </span>
    );
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const text =
    d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const lastDay = left <= 86_400_000;
  return (
    <span
      data-board-countdown
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums tracking-wider ${
        lastDay ? 'animate-pulse bg-rimon/[0.1] text-rimon' : 'bg-gold/[0.12] text-gold'
      }`}
    >
      ⏳ {text}
    </span>
  );
}

export function Boards() {
  const serverToken = useBracha((s) => s.serverToken);
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<BoardDuration>('week');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [chat, setChat] = useState<Board | null>(null);

  const load = async () => {
    if (!serverToken) return;
    try {
      const r = await apiBoards(serverToken);
      setBoards(r.boards);
    } catch {
      setNotice('Couldn’t load your leaderboards — check your connection.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToken]);

  const create = async () => {
    if (!serverToken) return;
    const clean = title.trim();
    if (!clean) return setNotice('Give your leaderboard a name first.');
    setBusy(true);
    try {
      const r = await apiCreateBoard(serverToken, clean, duration);
      setTitle('');
      setMode('none');
      const label = DURATIONS.find((x) => x.id === r.duration)?.label ?? r.duration;
      setNotice(`“${r.title}” is live — ${label} on the clock! Share the code ${r.code} to invite people.`);
      await load();
    } catch {
      setNotice('Couldn’t create that leaderboard — try again in a moment.');
    }
    setBusy(false);
  };

  const join = async () => {
    if (!serverToken) return;
    const clean = joinCode.trim();
    if (!clean) return setNotice('Enter the code someone shared with you.');
    setBusy(true);
    try {
      const r = await apiJoinBoard(serverToken, clean);
      setJoinCode('');
      setMode('none');
      setNotice(`You’re in “${r.title}” — you start at 0. Go!`);
      await load();
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 404
          ? 'No leaderboard with that code — double-check it.'
          : 'Couldn’t join right now — try again in a moment.',
      );
    }
    setBusy(false);
  };

  const share = async (b: Board) => {
    const text = `Join my “${b.title}” bracha leaderboard on Brachas with Rimon — code ${b.code}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(b.id);
        setTimeout(() => setCopied(null), 1800);
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const leave = async (b: Board) => {
    if (!serverToken) return;
    setBusy(true);
    try {
      await apiLeaveBoard(serverToken, b.id);
      setNotice(b.owner ? `“${b.title}” deleted.` : `You left “${b.title}”.`);
    } catch (e) {
      setNotice(
        (e as { status?: number }).status === 404
          ? 'That leaderboard no longer exists.'
          : 'Couldn’t do that right now.',
      );
    }
    await load(); // resync either way — the board may already be gone
    setConfirm(null);
    setBusy(false);
  };

  const runItBack = async (b: Board) => {
    if (!serverToken) return;
    setBusy(true);
    try {
      const r = await apiRestartBoard(serverToken, b.id);
      setNotice(`Round ${r.round} of “${b.title}” is on — everyone's back at 0!`);
      await load();
    } catch {
      setNotice('Couldn’t start the next round — try again in a moment.');
    }
    setBusy(false);
  };

  if (!serverToken) return null;

  // No boards yet → the header pills give way to the big invitation below.
  const empty = boards?.length === 0;

  return (
    <div className="pt-8">
      <div className="flex items-end justify-between gap-3 pb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
          Your leaderboards
        </h3>
        {!empty && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode(mode === 'create' ? 'none' : 'create')}
              className="rounded-full bg-rimon/[0.08] px-3 py-1.5 text-[11px] font-bold text-rimon"
            >
              + New
            </button>
            <button
              onClick={() => setMode(mode === 'join' ? 'none' : 'join')}
              className="rounded-full bg-espresso/[0.06] px-3 py-1.5 text-[11px] font-bold text-espresso-soft"
            >
              Join
            </button>
          </div>
        )}
      </div>

      {mode === 'create' && (
        <Bezel className="rise-in mb-3" innerClassName="px-5 py-4">
          <div className="flex items-start justify-between gap-3 pb-2">
            <p className="text-[12px] leading-snug text-espresso-soft">
              Name it something everyone will recognise — “Cohen Family”, “Shul Chevrusa”.
            </p>
            <button
              aria-label="cancel creating a leaderboard"
              onClick={() => setMode('none')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-espresso/[0.06] text-[13px] font-bold text-espresso-soft transition-colors hover:bg-espresso/10"
            >
              ✕
            </button>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cohen Family"
            maxLength={40}
            className="w-full rounded-2xl border border-espresso/10 bg-white/70 px-4 py-3 text-[14px] text-espresso outline-none placeholder:text-mocha/60 focus:border-rimon/40"
          />
          <p className="pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-mocha">
            How long is the race?
          </p>
          <div data-duration-picker className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d, i) => {
              const active = duration === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  aria-pressed={active}
                  className={`rise-in rise-in-${i + 1} rounded-2xl border px-2 py-3 text-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    active
                      ? 'scale-[1.04] border-rimon/40 bg-rimon/[0.07] shadow-[0_10px_24px_rgba(161,51,39,0.12)]'
                      : 'border-espresso/10 bg-white/60 hover:-translate-y-0.5'
                  }`}
                >
                  <span
                    className={`block text-[20px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${active ? 'scale-110' : ''}`}
                  >
                    {d.icon}
                  </span>
                  <span className={`mt-1 block text-[12.5px] font-bold ${active ? 'text-rimon' : 'text-espresso'}`}>
                    {d.label}
                  </span>
                  <span className="mt-0.5 block text-[9.5px] font-semibold uppercase tracking-wider text-mocha">
                    {d.blurb}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="pt-3 text-[11px] leading-snug text-mocha">
            Everyone starts at 0. Most points when the clock runs out takes the crown 👑
          </p>
          <div className="pt-3">
            <PillButton variant="rimon" icon="🏆" onClick={() => void create()} disabled={busy}>
              Create leaderboard
            </PillButton>
          </div>
        </Bezel>
      )}

      {mode === 'join' && (
        <Bezel className="rise-in mb-3" innerClassName="px-5 py-4">
          <div className="flex items-start justify-between gap-3 pb-2">
            <p className="text-[12px] leading-snug text-espresso-soft">
              Enter the code someone shared with you.
            </p>
            <button
              aria-label="cancel joining a leaderboard"
              onClick={() => setMode('none')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-espresso/[0.06] text-[13px] font-bold text-espresso-soft transition-colors hover:bg-espresso/10"
            >
              ✕
            </button>
          </div>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. 3GWHGH"
            maxLength={10}
            autoCapitalize="characters"
            className="w-full rounded-2xl border border-espresso/10 bg-white/70 px-4 py-3 text-center text-[16px] font-bold tracking-[0.2em] text-espresso outline-none placeholder:tracking-normal placeholder:text-mocha/60 focus:border-rimon/40"
          />
          <div className="pt-3">
            <PillButton variant="rimon" icon="→" onClick={() => void join()} disabled={busy}>
              Join leaderboard
            </PillButton>
          </div>
        </Bezel>
      )}

      {notice && <p className="pb-3 text-[11.5px] leading-snug text-rimon">{notice}</p>}

      {empty && mode === 'none' && (
        <div data-boards-empty className="rise-in">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('create')}
              className="rounded-3xl border border-rimon/25 bg-rimon/[0.07] px-4 py-6 text-center shadow-[0_10px_26px_rgba(161,51,39,0.08)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5"
            >
              <span className="block text-[30px]">🏆</span>
              <span className="mt-2 block text-[16px] font-bold text-rimon">+ New</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-mocha">
                start a leaderboard
              </span>
            </button>
            <button
              onClick={() => setMode('join')}
              className="rounded-3xl border border-espresso/10 bg-white/70 px-4 py-6 text-center shadow-[0_10px_26px_rgba(43,33,26,0.06)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5"
            >
              <span className="block text-[30px]">🎟️</span>
              <span className="mt-2 block text-[16px] font-bold text-espresso">Join</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-mocha">
                enter a friend’s code
              </span>
            </button>
          </div>
          <p className="px-2 pt-3 text-center text-[12px] leading-relaxed text-mocha">
            Challah your friends to a bracha competition 🥖 — pick a week, a month or a year, share
            the code, and race from 0 to the crown 👑
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {boards?.map((b) => (
          <Bezel key={b.id} className="rise-in" innerClassName="px-5 py-4">
            <div className="flex items-start justify-between gap-3 pb-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-espresso">{b.title}</p>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mocha">
                  {b.members} {b.members === 1 ? 'member' : 'members'} · code {b.code}
                  {b.round > 1 ? ` · round ${b.round}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Countdown endsAt={b.endsAt} ended={b.ended} />
                <button
                  onClick={() => {
                    setChat(b);
                    // opening the room reads it — clear the badge optimistically
                    setBoards((all) => all?.map((x) => (x.id === b.id ? { ...x, unread: 0 } : x)) ?? all);
                  }}
                  aria-label={`open ${b.title} group chat`}
                  className="relative rounded-full bg-espresso/[0.06] px-3 py-1.5 text-[11px] font-bold text-espresso-soft"
                >
                  💬 Chat
                  {(b.unread ?? 0) > 0 && (
                    <span
                      data-chat-unread
                      className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rimon px-1 text-[9px] font-black text-cream"
                    >
                      {b.unread! > 9 ? '9+' : b.unread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => void share(b)}
                  className="rounded-full bg-gold/[0.12] px-3 py-1.5 text-[11px] font-bold text-gold"
                >
                  {copied === b.id ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* finished round: the frozen podium + (owner) run it back */}
            {b.ended && b.result ? (
              <div data-board-finished className="border-t border-espresso/[0.07] pt-3">
                <div className="rounded-2xl bg-gold/[0.08] px-4 py-3 text-center ring-1 ring-gold/25">
                  {b.result.winnerName ? (
                    <>
                      <p className="text-[20px] leading-none">👑</p>
                      <p className="mt-1 text-[14px] font-bold text-espresso">
                        {b.result.winnerName} takes the crown!
                      </p>
                    </>
                  ) : (
                    <p className="text-[13px] font-semibold text-espresso-soft">
                      The clock ran out with the podium empty — nobody scored this round.
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                    final standings · round {b.round}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 pt-3">
                  {b.result.standings.slice(0, 10).map((row, i) => (
                    <div key={`${row.name}-${i}`} className="flex items-center gap-2.5">
                      <span className="w-6 shrink-0 text-center text-[12px]">
                        {MEDALS[i] ?? <span className="text-mocha">{i + 1}</span>}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-espresso">
                        {row.name}
                        {row.you && (
                          <span className="ml-1.5 rounded-full bg-rimon/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rimon">
                            you
                          </span>
                        )}
                      </p>
                      <span className="shrink-0 text-[13px] font-bold text-espresso">⭐ {row.points}</span>
                    </div>
                  ))}
                </div>
                {b.owner && (
                  <div className="pt-3" data-run-it-back>
                    <PillButton variant="rimon" icon="🔄" onClick={() => void runItBack(b)} disabled={busy}>
                      Run it back ({DURATIONS.find((d) => d.id === b.duration)?.label ?? b.duration})
                    </PillButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 border-t border-espresso/[0.07] pt-3">
                {b.league.map((row, i) => (
                  <div key={row.code} className="flex items-center gap-2.5">
                    <span className="w-6 shrink-0 text-center text-[12px]">
                      {MEDALS[i] ?? <span className="text-mocha">{i + 1}</span>}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-espresso">
                      {row.name}
                      {row.you && (
                        <span className="ml-1.5 rounded-full bg-rimon/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rimon">
                          you
                        </span>
                      )}
                      {(row.wins ?? 0) > 0 && (
                        <span className="ml-1.5 text-[10.5px] font-semibold text-gold">🏆{row.wins}</span>
                      )}
                      {row.streak > 0 && row.streak < 999 && (
                        <span className="ml-1.5 text-[10.5px] text-mocha">🔥{row.streak}</span>
                      )}
                    </p>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-bold leading-tight text-espresso">
                        ⭐ {row.points ?? 0}
                      </span>
                      {(row.todayPoints ?? 0) > 0 && (
                        <span className="block text-[9px] font-semibold leading-tight text-sage">
                          +{row.todayPoints} today
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {confirm === b.id ? (
              <div className="mt-3 rounded-2xl bg-rimon/[0.06] p-3">
                <p className="text-[11.5px] leading-snug text-espresso">
                  {b.owner
                    ? `Delete “${b.title}” for everyone? Its ${b.members} ${b.members === 1 ? 'member' : 'members'} will lose these standings.`
                    : `Leave “${b.title}”?`}
                </p>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    onClick={() => void leave(b)}
                    disabled={busy}
                    className="text-[11.5px] font-bold text-rimon"
                  >
                    {b.owner ? 'Yes, delete it' : 'Yes, leave'}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="text-[11.5px] font-semibold text-espresso-soft"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(b.id)}
                className="mt-3 text-[10.5px] font-medium text-mocha underline-offset-4 hover:underline"
              >
                {b.owner ? 'delete this leaderboard' : 'leave this leaderboard'}
              </button>
            )}
          </Bezel>
        ))}
      </div>

      {chat && serverToken && (
        <BoardChat
          boardId={chat.id}
          code={chat.code}
          title={chat.title}
          token={serverToken}
          onClose={() => {
            setChat(null);
            void load(); // refresh unread counts + standings on the way out
          }}
        />
      )}
    </div>
  );
}
