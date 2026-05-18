import { useState } from "react";

const PollWidget = ({ poll, isHost, onCreatePoll, onVote }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
      {isHost && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const validOptions = options.map((o) => o.trim()).filter(Boolean);
            if (!question.trim() || validOptions.length < 2) return;
            onCreatePoll(question.trim(), validOptions);
            setQuestion("");
            setOptions(["", ""]);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          {options.map((opt, idx) => (
            <input
              key={idx}
              value={opt}
              onChange={(e) =>
                setOptions((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))
              }
              placeholder={`Option ${idx + 1}`}
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
            />
          ))}
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="text-xs text-cyan-400"
          >
            + Add option
          </button>
          <button className="block rounded bg-cyan-600 px-3 py-1 text-sm">Create Poll</button>
        </form>
      )}

      {poll ? (
        <div className="mt-3 space-y-2">
          <p className="font-semibold">{poll.question}</p>
          {poll.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => onVote(idx)}
              className="flex w-full justify-between rounded bg-slate-800 px-3 py-2 text-sm"
            >
              <span>{option.text}</span>
              <span>{option.votes}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No active poll in this room.</p>
      )}
    </div>
  );
};

export default PollWidget;
