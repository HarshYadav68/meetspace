const reactions = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

const ReactionBar = ({ onSend }) => (
  <div className="flex gap-2">
    {reactions.map((emoji) => (
      <button
        key={emoji}
        onClick={() => onSend(emoji)}
        className="rounded-full bg-slate-800 px-3 py-1 text-lg"
      >
        {emoji}
      </button>
    ))}
  </div>
);

export default ReactionBar;
