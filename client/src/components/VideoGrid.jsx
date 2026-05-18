const VideoGrid = ({ localVideoRef, remoteStreams }) => {
  return (
    <div className="grid h-full grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="h-44 w-full rounded-lg bg-black object-cover sm:h-56"
      />
      {Object.entries(remoteStreams).map(([id, stream]) => (
        <video
          key={id}
          autoPlay
          playsInline
          ref={(el) => {
            if (!el) return;
            el.srcObject = stream;
            el.play().catch(() => {});
          }}
          className="h-44 w-full rounded-lg bg-black object-cover sm:h-56"
        />
      ))}
    </div>
  );
};

export default VideoGrid;
