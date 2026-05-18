import { useMemo } from "react";
import ScreenSharePreview from "./ScreenSharePreview";
import VideoTile from "./VideoTile";

const getGridCols = (count) => {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
};

const buildTiles = ({ socketId, localUser, participants, remoteStreams, participantMedia, media }) => {
  const tiles = [];

  if (socketId && localUser) {
    tiles.push({
      id: socketId,
      name: localUser.name,
      displayLabel: localUser.name ? `You (${localUser.name})` : "You",
      isLocal: true,
      camOn: media.cam,
    });
  }

  const remoteIds = new Set([
    ...Object.keys(participants).filter((id) => id !== socketId),
    ...Object.keys(remoteStreams),
  ]);

  remoteIds.forEach((id) => {
    const user = participants[id];
    const remoteMedia = participantMedia[id];
    tiles.push({
      id,
      name: user?.name || "Guest",
      displayLabel: user?.name || "Guest",
      isLocal: false,
      stream: remoteStreams[id],
      camOn: remoteMedia?.cam !== false,
    });
  });

  return tiles;
};

const VideoGrid = ({
  localVideoRef,
  remoteStreams,
  participants = {},
  localUser,
  socketId,
  media,
  participantMedia = {},
  screenSharingSocketId,
  isLocalScreenSharing = false,
}) => {
  const tiles = useMemo(
    () => buildTiles({ socketId, localUser, participants, remoteStreams, participantMedia, media }),
    [socketId, localUser, participants, remoteStreams, participantMedia, media]
  );

  const isPresentation = Boolean(screenSharingSocketId);
  const presenterFromTiles = tiles.find((t) => t.id === screenSharingSocketId);
  const sharerUser = participants[screenSharingSocketId];
  const presenter =
    presenterFromTiles ||
    (isPresentation && screenSharingSocketId
      ? {
          id: screenSharingSocketId,
          name: sharerUser?.name || (screenSharingSocketId === socketId ? localUser?.name : "Guest"),
          displayLabel:
            screenSharingSocketId === socketId
              ? localUser?.name
                ? `You (${localUser.name})`
                : "You"
              : sharerUser?.name || "Guest",
          isLocal: screenSharingSocketId === socketId,
          stream: remoteStreams[screenSharingSocketId],
          camOn: true,
        }
      : null);
  const sidebarTiles = isPresentation ? tiles.filter((t) => t.id !== screenSharingSocketId) : tiles;

  const gridCols = getGridCols(tiles.length);

  const renderTile = (tile, { compact = false, isPresenter = false, className = "" } = {}) => (
    <VideoTile
      key={tile.id}
      name={tile.name}
      displayLabel={tile.displayLabel}
      stream={tile.stream}
      videoRef={tile.isLocal ? localVideoRef : undefined}
      isLocal={tile.isLocal}
      camOn={isPresenter ? true : tile.camOn}
      compact={compact}
      isPresenter={isPresenter}
      className={className}
    />
  );

  if (!tiles.length) {
    return <div className="flex h-full items-center justify-center p-3 text-sm text-slate-400">Waiting for participants…</div>;
  }

  return (
    <div className="h-full min-h-0 p-3 transition-all duration-300 ease-in-out">
      {isPresentation ? (
        <div className="flex h-full min-h-0 flex-col gap-3 transition-all duration-300 ease-in-out lg:flex-row">
          <div className="min-h-[50vh] flex-[3] min-w-0 transition-all duration-300 ease-in-out lg:min-h-0 lg:h-full">
            {presenter && isLocalScreenSharing && presenter.isLocal ? (
              <ScreenSharePreview label={presenter.displayLabel} />
            ) : presenter ? (
              renderTile(presenter, { isPresenter: true, className: "h-full" })
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg bg-zinc-800 text-sm text-slate-400">
                Screen share starting…
              </div>
            )}
          </div>
          <div className="flex min-h-0 flex-[1] flex-row gap-2 overflow-x-auto transition-all duration-300 ease-in-out lg:max-w-[28%] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
            {sidebarTiles.map((tile) => renderTile(tile, { compact: true }))}
          </div>
        </div>
      ) : (
        <div
          className="grid h-full min-h-0 gap-3 transition-all duration-300 ease-in-out"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gridAutoRows: "1fr",
          }}
        >
          {tiles.map((tile) => renderTile(tile, { className: "h-full min-h-0 w-full" }))}
        </div>
      )}
    </div>
  );
};

export default VideoGrid;
