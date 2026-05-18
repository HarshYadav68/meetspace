/**
 * Request display capture with browser hints that reduce meeting-tab feedback loops.
 * Falls back to basic constraints when advanced options are unsupported.
 */
export const requestScreenShare = async () => {
  const preferred = {
    video: true,
    audio: false,
    preferCurrentTab: false,
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
    systemAudio: "exclude",
  };

  try {
    return await navigator.mediaDevices.getDisplayMedia(preferred);
  } catch (error) {
    if (error?.name === "NotSupportedError" || error?.name === "TypeError") {
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    }
    throw error;
  }
};

export const getDisplaySurface = (track) => track?.getSettings?.()?.displaySurface ?? null;

export const isLoopRiskSurface = (surface) => surface === "monitor" || surface === "browser";

export const getLoopPreventionTip = (surface) => {
  if (surface === "monitor") {
    return "You are sharing your full screen. Keep this meeting window out of view, or share a specific app window instead.";
  }
  if (surface === "browser") {
    return "You are sharing a browser tab. Do not share this meeting tab to avoid a feedback loop.";
  }
  return null;
};
