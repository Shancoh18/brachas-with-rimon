/**
 * Named leaderboards — create one (family, shul, chevrusa), share its code,
 * and anyone who enters that code joins the same standings.
 *
 * Ranking matches the friends league: points this week, then brachos.
 */
import { useEffect, useState } from 'react';
import {
  apiBoards,
  apiCreateBoard,
  apiJoinBoard,
  apiLeaveBoard,
  type Board,
} from '../lib/api';
import { useBracha } from '../store';
import { Bezel, PillButton } from './ui';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Boards() {
  const serverToken = useBracha((s) => s.serverToken);
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

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
      const r = await apiCreateBoard(serverToken, clean);
      setTitle('');
      setMode('none');
      setNotice(`“${r.title}” created — share the code ${r.code} to invite people.`);
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
      setNotice(`You’re in “${r.title}”.`);
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

  if (!serverToken) return null;

  return (
    <div className="pt-8">
      <div className="flex items-end justify-between gap-3 pb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
          Your leaderboards
        </h3>
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
      </div>

      {mode === 'create' && (
        <Bezel className="rise-in mb-3" innerClassName="px-5 py-4">
          <p className="pb-2 text-[12px] leading-snug text-espresso-soft">
            Name it something everyone will recognise — “Cohen Family”, “Shul Chevrusa”.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cohen Family"
            maxLength={40}
            className="w-full rounded-2xl border border-espresso/10 bg-white/70 px-4 py-3 text-[14px] text-espresso outline-none placeholder:text-mocha/60 focus:border-rimon/40"
          />
          <div className="pt-3">
            <PillButton variant="rimon" icon="🏆" onClick={() => void create()} disabled={busy}>
              Create leaderboard
            </PillButton>
          </div>
        </Bezel>
      )}

      {mode === 'join' && (
        <Bezel className="rise-in mb-3" innerClassName="px-5 py-4">
          <p className="pb-2 text-[12px] leading-snug text-espresso-soft">
            Enter the code someone shared with you.
          </p>
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

      {boards?.length === 0 && mode === 'none' && (
        <p className="text-[11.5px] leading-relaxed text-mocha">
          Make a leaderboard for your family, your shul, or your chevrusa — then share its code
          so everyone races the same week.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {boards?.map((b) => (
          <Bezel key={b.id} className="rise-in" innerClassName="px-5 py-4">
            <div className="flex items-start justify-between gap-3 pb-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-espresso">{b.title}</p>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mocha">
                  {b.members} {b.members === 1 ? 'member' : 'members'} · code {b.code}
                </p>
              </div>
              <button
                onClick={() => void share(b)}
                className="shrink-0 rounded-full bg-gold/[0.12] px-3 py-1.5 text-[11px] font-bold text-gold"
              >
                {copied === b.id ? 'Copied!' : 'Share'}
              </button>
            </div>

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
                    {row.streak > 0 && row.streak < 999 && (
                      <span className="ml-1.5 text-[10.5px] text-mocha">🔥{row.streak}</span>
                    )}
                  </p>
                  <span className="shrink-0 text-[13px] font-bold text-espresso">
                    ⭐ {row.weekPoints ?? 0}
                  </span>
                </div>
              ))}
            </div>

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
    </div>
  );
}
