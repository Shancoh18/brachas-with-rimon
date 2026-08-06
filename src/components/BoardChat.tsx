/**
 * Board group chat — one room per leaderboard, membership = board membership
 * (the server enforces it, so added/removed members gain/lose the room
 * automatically). Basic by design: text messages, newest at the bottom,
 * 5s polling while open, web-push nudges handled server-side.
 */
import { useEffect, useRef, useState } from 'react';
import { apiBoardMessages, apiSendBoardMessage, type BoardMessage } from '../lib/api';

export function BoardChat({
  boardId,
  title,
  token,
  onClose,
}: {
  boardId: string;
  title: string;
  token: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(0);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  };

  const load = async (since: number) => {
    try {
      const r = await apiBoardMessages(token, boardId, since);
      if (r.messages.length) {
        setMessages((m) => {
          const seen = new Set(m.map((x) => x.id));
          const fresh = r.messages.filter((x) => !seen.has(x.id));
          return fresh.length ? [...m, ...fresh] : m;
        });
        lastRef.current = Math.max(lastRef.current, ...r.messages.map((m) => m.created));
        scrollDown();
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
      setError(
        (e as { status?: number }).status === 429
          ? 'Whoa — a few too many messages at once. Give it a minute.'
          : 'Couldn’t send that — try again.',
      );
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-espresso/30 backdrop-blur-[2px]" data-board-chat>
      <button aria-label="close chat" onClick={onClose} className="min-h-0 flex-1" />
      <div className="sheet-rise flex max-h-[72dvh] flex-col rounded-t-[1.75rem] border-t border-hairline bg-cream shadow-[0_-18px_60px_rgba(43,33,26,0.25)]">
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
          {messages.length === 0 && !error && (
            <p className="pt-6 text-center text-[12px] leading-relaxed text-mocha">
              No messages yet — say shalom! Everyone on “{title}” can read and write here.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
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
            </div>
          ))}
          {error && <p className="pt-2 text-center text-[11px] text-rimon">{error}</p>}
        </div>

        <div
          className="flex items-center gap-2 border-t border-espresso/[0.07] px-4 pt-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
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
      </div>
    </div>
  );
}
