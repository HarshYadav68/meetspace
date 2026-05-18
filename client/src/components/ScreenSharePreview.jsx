const ScreenSharePreview = ({ label = "You" }) => (
  <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-zinc-900 px-6 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v12a1.5 1.5 0 0 1-1.5 1.5h-5.379a1.5 1.5 0 0 0-1.06.44l-1.122 1.122A1.5 1.5 0 0 1 10.621 21H4.5A1.5 1.5 0 0 1 3 19.5v-15Z" />
      </svg>
    </div>
    <p className="text-base font-medium text-white">You are sharing your screen</p>
    <p className="mt-2 max-w-sm text-sm text-slate-400">
      Others can see your presentation. Your preview is hidden here so the shared screen does not show this meeting
      (prevents a feedback loop).
    </p>
    <p className="mt-4 text-xs text-slate-500">{label}</p>
  </div>
);

export default ScreenSharePreview;
