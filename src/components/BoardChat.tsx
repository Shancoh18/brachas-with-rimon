/**
 * Board group chat — one room per leaderboard, membership = board membership
 * (the server enforces it, so added/removed members gain/lose the room
 * automatically). Basic by design: text messages, newest at the bottom,
 * 5s polling while open, web-push nudges handled server-side.
 *
 * MODERATION (App Review 1.2 — user-generated content): every message from
 * someone else carries a ⋯ control → Report (reason → stored for the
 * operator) or Block (global: their messages vanish from every board, server
 * side, from then on). The server also runs a word filter on send; a 400
 * `moderated` is shown in plain words rather than as a generic failure.
 */
import { useEffect, useRef, useState } from 'react';
import {
  apiBlockUser,
  apiBoardMessages,
  apiReportMessage,
  apiSendBoardMessage,
  isTimeout,
  type BoardMessage,
  type ReportReason,
} from '../lib/api';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'inappropriate', label: 'Inappropriate' },
  { id: 'other', label: 'Something else' },
];

export function BoardChat({
  boardId,
  code,
  title,
  token,
  onClose,
}: {
  boardId: string;
  /** the board's share code — how the moderation routes address the room */
  code: string;
  title: string;
  token: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ⋯ menu: which message, and which step of it
  const [menuFor, setMenuFor] = useState<BoardMessage | null>(null);
  const [menuStep, setMenuStep] = useState<'menu' | 'report' | 'block'>('menu');
  const [toast, setToast] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(0);
  const firstScroll = useRef(true);

  // Scroll AFTER React commits the new rows (a lone rAF raced the render, so
  // opening a full room could land at the TOP — owner-reported 2026-08-10).
  // First paint jumps straight to the newest message; later ones glide.
  useEffect(() => {
    const el = listRef.current;
    if (!el || messages.length === 0) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? 'auto' : 'smooth' });
    firstScroll.current = false;
  }, [messages.length]);

  // a toast lives 3s — long enough to read, short enough not to need a close
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const load = async (since: number) => {
    try {
      const r = await apiBoardMessages(token, boardId, since, code);
      if (r.messages.length) {
        setMessages((m) => {
          const seen = new Set(m.map((x) => x.id));
          const fresh = r.messages.filter((x) => !seen.has(x.id));
          return fresh.length ? [...m, ...fresh] : m;
        });
        lastRef.current = Math.max(lastRef.current, ...r.messages.map((m) => m.created));
      }
      setError(null);
    } catch {
      setError('Chat is offline right now — it reconnects automatically.');
    }
  };

  useEffect(() => {
    void load(0);
    const id = setInterval(() => void load(lastRef.current), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const send = async () => {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      await apiSendBoardMessage(token, boardId, clean);
      setText('');
      await load(lastRef.current);
    } catch (e) {
      const { status, code: errCode } = e as { status?: number; code?: string };
      setError(
        status === 400 && errCode === 'moderated'
          ? 'That message was blocked by the chat filter.'
          : status === 429
            ? 'Whoa — a few too many messages at once. Give it a minute.'
            : isTimeout(e)
              ? 'Server is slow — try again.'
              : 'Couldn’t send that — try again.',
      );
    }
    setBusy(false);
  };

  const openMenu = (m: BoardMessage) => {
    setMenuFor(m);
    setMenuStep('menu');
  };
  const closeMenu = () => setMenuFor(null);

  const report = async (reason: ReportReason) => {
    if (!menuFor || busy) return;
    setBusy(true);
    try {
      await apiReportMessage(token, { code, board: boardId, message_id: menuFor.id, reason });
      setToast('Reported — thank you, we will review it.');
      closeMenu();
    } catch (e) {
      const status = (e as { status?: number }).status;
      setToast(
        status === 429
          ? 'That’s a lot of reports at once — give it a few minutes.'
          : isTimeout(e)
            ? 'Server is slow — try again.'
            : 'Couldn’t send that report — try again.',
      );
    }
    setBusy(false);
  };

  const block = async () => {
    if (!menuFor || busy) return;
    const target = menuFor;
    setBusy(true);
    try {
      await apiBlockUser(token, target.user_id);
      // their messages leave this screen now; the server omits them from
      // every board from here on, so a refetch stays clean
      setMessages((m) => m.filter((x) => x.user_id !== target.user_id));
      setToast(`${target.name} is blocked. You won’t see their messages anymore.`);
      closeMenu();
      void load(0);
    } catch (e) {
      setToast(isTimeout(e) ? 'Server is slow — try again.' : 'Couldn’t block right now — try again.');
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-espresso/30 backdrop-blur-[2px]" data-board-chat>
      <button aria-label="close chat" onClick={onClose} className="min-h-0 flex-1" />
      <div className="sheet-rise relative flex max-h-[72dvh] flex-col rounded-t-[1.75rem] border-t border-hairline bg-cream shadow-[0_-18px_60px_rgba(43,33,26,0.25)]">
        <div className="flex items-center justify-between border-b border-espresso/[0.07] px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold">Group chat</p>
            <p className="truncate font-display text-[17px] font-bold text-espresso">💬 {title}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full bg-espresso/[0.06] px-3.5 py-1.5 text-[11.5px] font-bold text-espresso-soft"
          >
            close
          </button>
        </div>

        <div ref={listRef} className="min-h-[200px] flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
          {toast && (
            <p
              data-chat-toast
              className="rise-in mx-auto w-max max-w-full rounded-full bg-espresso px-4 py-1.5 text-center text-[11.5px] font-semibold text-cream"
            >
              {toast}
            </p>
          )}
          {messages.length === 0 && !error && (
            <p className="pt-6 text-center text-[12px] leading-relaxed text-mocha">
              No messages yet — say shalom! Everyone on “{title}” can read and write here.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex items-center ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                  m.mine
                    ? 'rounded-br-md bg-rimon text-cream'
                    : 'rounded-bl-md border border-hairline bg-white/80 text-espresso'
                }`}
              >
                {!m.mine && (
                  <p className="pb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-gold">{m.name}</p>
                )}
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-snug">{m.text}</p>
                <p className={`pt-0.5 text-right text-[8.5px] ${m.mine ? 'text-cream/70' : 'text-mocha'}`}>
                  {new Date(m.created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              {/* 44px tap target (HIG minimum) — quiet until pressed */}
              {!m.mine && (
                <button
                  data-message-menu
                  onClick={() => openMenu(m)}
                  aria-label={`options for ${m.name}’s message`}
                  className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] leading-none text-mocha/70 transition-colors duration-150 hover:bg-espresso/[0.05] hover:text-espresso active:bg-espresso/10"
                >
                  ⋯
                </button>
              )}
            </div>
          ))}
          {error && <p className="pt-2 text-center text-[11px] text-rimon">{error}</p>}
        </div>

        <div
          className="border-t border-espresso/[0.07] px-4 pt-3"
          style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send();
              }}
              placeholder={`Message ${title}…`}
              maxLength={400}
              className="w-full rounded-full border border-espresso/10 bg-white/70 px-4 py-2.5 text-[13.5px] text-espresso outline-none placeholder:text-mocha/60 focus:border-rimon/40"
            />
            <button
              onClick={() => void send()}
              disabled={busy || !text.trim()}
              aria-label="send message"
              className="shrink-0 rounded-full bg-rimon px-4 py-2.5 text-[13px] font-bold text-cream disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <p className="pt-2 text-center text-[10px] text-mocha/80">Be kind. Report or block anyone who is not.</p>
        </div>

        {/* ⋯ menu — in-sheet, over the room; absolute within the sheet so it
            never leaves the compositor layer the fixed sheet already owns */}
        {menuFor && (
          <div
            data-message-menu-sheet
            className="absolute inset-0 z-10 flex flex-col justify-end rounded-t-[1.75rem] bg-espresso/25"
          >
            <button aria-label="close message options" onClick={closeMenu} className="min-h-0 flex-1" />
            <div
              className="sheet-rise rounded-t-[1.5rem] bg-cream px-5 pt-4 ring-1 ring-espresso/[0.08]"
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
            >
              <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold">{menuFor.name}</p>
              <p className="mt-1 truncate text-[12.5px] italic text-espresso-soft">“{menuFor.text}”</p>

              {menuStep === 'menu' && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => setMenuStep('report')}
                    className="min-h-[44px] rounded-2xl bg-white/80 px-4 py-2.5 text-left text-[13.5px] font-semibold text-espresso ring-1 ring-espresso/[0.08]"
                  >
                    🚩 Report message
                  </button>
                  <button
                    onClick={() => setMenuStep('block')}
                    className="min-h-[44px] rounded-2xl bg-white/80 px-4 py-2.5 text-left text-[13.5px] font-semibold text-rimon ring-1 ring-espresso/[0.08]"
                  >
                    ⛔ Block {menuFor.name}
                  </button>
                  <button onClick={closeMenu} className="min-h-[44px] py-2 text-[12.5px] font-semibold text-mocha">
                    Cancel
                  </button>
                </div>
              )}

              {menuStep === 'report' && (
                <div className="mt-4">
                  <p className="text-[12.5px] font-semibold text-espresso">What’s wrong with it?</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => void report(r.id)}
                        disabled={busy}
                        className="min-h-[44px] rounded-full bg-white/80 px-4 text-[12.5px] font-semibold text-espresso ring-1 ring-espresso/[0.1] transition-transform duration-150 ease-out active:scale-95 disabled:opacity-50"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[10.5px] leading-snug text-mocha">
                    Reports go to the app’s team, who review them and act — the sender isn’t told who reported.
                  </p>
                  <button onClick={() => setMenuStep('menu')} className="mt-2 min-h-[44px] text-[12.5px] font-semibold text-mocha">
                    ← back
                  </button>
                </div>
              )}

              {menuStep === 'block' && (
                <div className="mt-4">
                  <p className="text-[12.5px] font-semibold text-espresso">Block {menuFor.name}?</p>
                  <p className="mt-1 text-[11.5px] leading-snug text-espresso-soft">
                    You won’t see their messages on any leaderboard. You can undo this under Account → Blocked people.
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-3">
                    <button onClick={() => setMenuStep('menu')} className="min-h-[44px] px-2 text-[12.5px] font-semibold text-mocha">
                      Cancel
                    </button>
                    <button
                      onClick={() => void block()}
                      disabled={busy}
                      className="min-h-[44px] rounded-full bg-rimon px-5 text-[12.5px] font-bold text-cream transition-transform duration-150 ease-out active:scale-95 disabled:opacity-50"
                    >
                      {busy ? 'Blocking…' : 'Block'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
