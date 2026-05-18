import { useEffect, useRef, useState } from "react";

const getInitial = (name) => (name?.trim()?.[0] || "?").toUpperCase();

const VideoTile = ({
  name,
  displayLabel,
  stream,
  videoRef,
  isLocal = false,
  camOn = true,
  compact = false,
  isPresenter = false,
  className = "",
}) => {
  const internalRef = useRef(null);
  const ref = videoRef || internalRef;
  const [trackLive, setTrackLive] = useState(true);

  useEffect(() => {
    if (isLocal || !stream) return;
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream, ref, isLocal]);

  useEffect(() => {
    if (isLocal) return;
    if (!stream) {
      setTrackLive(false);
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setTrackLive(false);
      return;
    }
    const update = () => setTrackLive(track.enabled && track.readyState === "live");
    update();
    track.addEventListener("mute", update);
    track.addEventListener("unmute", update);
    track.addEventListener("ended", update);
    return () => {
      track.removeEventListener("mute", update);
      track.removeEventListener("unmute", update);
      track.removeEventListener("ended", update);
    };
  }, [stream, isLocal]);

  const showRemoteVideo = !isLocal && camOn && trackLive;
  const showLocalVideo = isLocal && (camOn || isPresenter);
  const showVideo = isLocal ? showLocalVideo : showRemoteVideo;
  const showPlaceholder = !showVideo;
  const label = displayLabel || name || "Guest";

  return (
    <div
      className={`relative min-h-0 overflow-hidden rounded-lg bg-zinc-800 shadow-md transition-opacity duration-300 ${compact ? "aspect-video w-full shrink-0" : "h-full w-full"} ${className}`}
    >
      {(isLocal || stream) && (
        <video
          ref={ref}
          autoPlay
          muted={isLocal}
          playsInline
          className={`h-full w-full ${showPlaceholder ? "hidden" : ""} ${isPresenter ? "bg-black object-contain" : "object-cover"}`}
        />
      )}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-700">
          <div
            className={`flex items-center justify-center rounded-full bg-zinc-600 font-semibold text-white ${
              compact ? "h-10 w-10 text-sm" : "h-16 w-16 text-2xl sm:h-20 sm:w-20 sm:text-3xl"
            }`}
          >
            {getInitial(name)}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6">
        <span className={`font-medium text-white drop-shadow ${compact ? "text-[10px]" : "text-xs sm:text-sm"}`}>
          {label}
          {isPresenter && !compact ? " · Screen" : ""}
        </span>
      </div>
    </div>
  );
};

export default VideoTile;
