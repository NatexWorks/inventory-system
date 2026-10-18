const AUTH_CHANNEL_NAME = "inventory-system-auth";
const AUTH_STORAGE_KEY = "inventory-system-auth-event";

function normalizeMessage(value) {
  if (!value || (value.type !== "login" && value.type !== "logout")) return null;
  return value;
}

// The session token stays in the server-set HttpOnly cookie. This event carries
// no credentials; it only tells sibling tabs/windows to refresh their session UI.
export function broadcastAuthChange(type) {
  if (typeof window === "undefined" || (type !== "login" && type !== "logout")) return;

  const message = {
    type,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).slice(2),
  };

  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.postMessage(message);
      window.setTimeout(() => channel.close(), 100);
    }
  } catch {
    // The localStorage event below is the fallback for browsers without BroadcastChannel.
  }

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(message));
  } catch {
    // Storage may be disabled; BroadcastChannel still works where available.
  }
}

export function subscribeToAuthChanges(callback) {
  if (typeof window === "undefined") return () => {};

  const deliver = (value) => {
    const message = normalizeMessage(value);
    if (message) callback(message);
  };

  const onStorage = (event) => {
    if (event.key !== AUTH_STORAGE_KEY || !event.newValue) return;
    try {
      deliver(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed storage values.
    }
  };

  let channel = null;
  try {
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.addEventListener("message", (event) => deliver(event.data));
    }
  } catch {
    channel = null;
  }

  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    if (channel) channel.close();
  };
}
