import { useState } from "react";

const ChatPanel = ({ messages, onSend }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <div className="flex h-full flex-col border-l border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200">Chat</div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg._id || msg.timestamp} className="rounded bg-slate-800 p-2 text-sm">
              <p className="font-semibold">{msg.sender?.name || "User"}</p>
              <p>{msg.text}</p>
            </div>
          ))
        )}
      </div>
      <form
        className="flex gap-2 border-t border-slate-800 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const trimmed = text.trim();
          if (!trimmed || sending) return;
          setSending(true);
          try {
            const ok = await onSend(trimmed);
            if (ok) setText("");
          } finally {
            setSending(false);
          }
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none"
          placeholder="Type a message"
        />
        <button disabled={sending} className="rounded bg-cyan-600 px-3 py-2 text-sm disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
