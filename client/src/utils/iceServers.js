const FALLBACK_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

let iceServersPromise = null;

const normalizeIceServers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.iceServers)) return data.iceServers;
  return null;
};

export const fetchIceServers = async () => {
  const domain = import.meta.env.VITE_METERED_DOMAIN;
  const apiKey = import.meta.env.VITE_METERED_API_KEY;

  if (!domain || !apiKey) {
    console.warn("Metered TURN credentials not configured. Using Google STUN fallback.");
    return FALLBACK_ICE_SERVERS;
  }

  try {
    const response = await fetch(
      `https://${domain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Metered API responded with ${response.status}`);
    }

    const data = await response.json();
    const iceServers = normalizeIceServers(data);

    if (!iceServers?.length) {
      throw new Error("Metered API returned no ICE servers");
    }

    return iceServers;
  } catch (error) {
    console.warn("Failed to fetch Metered TURN credentials. Using Google STUN fallback.", error);
    return FALLBACK_ICE_SERVERS;
  }
};

/** Cached fetch — credentials are reused for all peer connections in the session. */
export const getIceServers = () => {
  if (!iceServersPromise) {
    iceServersPromise = fetchIceServers();
  }
  return iceServersPromise;
};
