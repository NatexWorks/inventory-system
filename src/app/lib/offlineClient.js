const DB_NAME = "inventory-system-offline";
const DB_VERSION = 1;
const USER_STORE = "meta";
const CACHE_STORE = "apiCache";
const QUEUE_STORE = "mutationQueue";

function openDatabase() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("Offline storage is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(USER_STORE)) db.createObjectStore(USER_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
  });
}

async function storeRequest(storeName, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try {
      result = operation(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      db.close();
      resolve(result?.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Offline storage transaction failed."));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("Offline storage transaction was aborted."));
    };
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function userIdOf(user) {
  return String(user?._id || user?.id || user?.userId || "");
}

export async function saveOfflineUser(user) {
  const userId = userIdOf(user);
  if (!userId) return;
  const record = { key: "currentUser", user, userId, updatedAt: Date.now() };
  await storeRequest(USER_STORE, "readwrite", (store) => store.put(record));
}

export async function getOfflineUser() {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(USER_STORE, "readonly");
    const record = await requestResult(transaction.objectStore(USER_STORE).get("currentUser"));
    return record?.user ? { user: record.user, userId: record.userId } : null;
  } finally {
    db.close();
  }
}

export async function clearOfflineUserAndCache() {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([USER_STORE, CACHE_STORE], "readwrite");
      transaction.objectStore(USER_STORE).delete("currentUser");
      transaction.objectStore(CACHE_STORE).clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

function cacheKey(url, userId) {
  const parsed = new URL(url, window.location.origin);
  return `${userId}::${parsed.pathname}${parsed.search}`;
}

export async function cacheApiResponse(url, response, userId) {
  if (!userId || !response?.ok || response.status !== 200) return;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return;

  const body = await response.clone().text();
  if (body.length > 2_000_000) return;
  const key = cacheKey(url, userId);
  await storeRequest(CACHE_STORE, "readwrite", (store) =>
    store.put({ key, body, status: response.status, contentType, updatedAt: Date.now() })
  );
}

export async function getCachedApiResponse(url, userId) {
  if (!userId) return null;
  const key = cacheKey(url, userId);
  const db = await openDatabase();
  let record;
  try {
    const transaction = db.transaction(CACHE_STORE, "readonly");
    record = await requestResult(transaction.objectStore(CACHE_STORE).get(key));
  } finally {
    db.close();
  }
  if (!record) return null;
  return new Response(record.body, {
    status: record.status || 200,
    headers: {
      "content-type": record.contentType || "application/json",
      "x-inventory-offline-cache": "true",
    },
  });
}

const QUEUEABLE_PATH = /^\/api\/(product|category|orders|suppliers|settings|sessions|returns)(\/|$)/;

export function isQueueableMutation(url, method, headers, body) {
  const parsed = new URL(url, window.location.origin);
  if (parsed.origin !== window.location.origin || !QUEUEABLE_PATH.test(parsed.pathname)) return false;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(String(method).toUpperCase())) return false;
  if (String(method).toUpperCase() !== "DELETE" && !body) return false;
  if (body && body.length > 1_000_000) return false;
  const contentType = new Headers(headers || {}).get("content-type") || "";
  return !body || contentType.includes("application/json") || contentType.includes("text/plain");
}

export async function enqueueOfflineMutation({ url, method, headers, body }) {
  const offlineUser = await getOfflineUser();
  if (!offlineUser?.userId) throw new Error("Sign in while online once before using offline mode.");

  const safeHeaders = {};
  new Headers(headers || {}).forEach((value, key) => {
    if (!["cookie", "authorization", "host", "content-length"].includes(key.toLowerCase())) {
      safeHeaders[key] = value;
    }
  });

  const item = {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: offlineUser.userId,
    url: `${new URL(url, window.location.origin).pathname}${new URL(url, window.location.origin).search}`,
    method: String(method).toUpperCase(),
    headers: safeHeaders,
    body: body || "",
    status: "pending",
    createdAt: Date.now(),
  };
  await storeRequest(QUEUE_STORE, "readwrite", (store) => store.put(item));
  window.dispatchEvent(new CustomEvent("inventory:offline-queue-updated"));
  return item;
}

export async function getOfflineQueue() {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    return await requestResult(transaction.objectStore(QUEUE_STORE).getAll());
  } finally {
    db.close();
  }
}

export async function removeOfflineQueueItem(id) {
  await storeRequest(QUEUE_STORE, "readwrite", (store) => store.delete(id));
  window.dispatchEvent(new CustomEvent("inventory:offline-queue-updated"));
}

export async function markOfflineQueueItemFailed(id, status, message) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(QUEUE_STORE, "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result) {
          store.put({ ...request.result, status: "failed", responseStatus: status, responseMessage: message });
        }
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
  window.dispatchEvent(new CustomEvent("inventory:offline-queue-updated"));
  window.dispatchEvent(new CustomEvent("inventory:offline-sync-error", { detail: { status, message } }));
}

let activeSync = null;

export async function syncOfflineQueue(fetchImpl) {
  if (activeSync) return activeSync;
  activeSync = runOfflineQueueSync(fetchImpl);
  try {
    return await activeSync;
  } finally {
    activeSync = null;
  }
}

async function runOfflineQueueSync(fetchImpl) {
  if (typeof navigator === "undefined" || !navigator.onLine) return { synced: 0, blocked: false };
  const offlineUser = await getOfflineUser();
  if (!offlineUser?.userId) return { synced: 0, blocked: false };

  let authResponse;
  try {
    authResponse = await fetchImpl("/api/auth/me", { credentials: "include", cache: "no-store" });
  } catch {
    return { synced: 0, blocked: true };
  }
  if (!authResponse.ok) return { synced: 0, blocked: true };

  let payload;
  try {
    payload = await authResponse.json();
  } catch {
    return { synced: 0, blocked: true };
  }
  const currentUser = payload?.data?.user;
  const currentUserId = userIdOf(currentUser);
  if (!currentUserId || currentUserId !== offlineUser.userId) {
    window.dispatchEvent(new CustomEvent("inventory:offline-sync-blocked", {
      detail: { reason: "account-mismatch" },
    }));
    return { synced: 0, blocked: true };
  }
  await saveOfflineUser(currentUser);

  const queue = (await getOfflineQueue())
    .filter((item) => item.userId === currentUserId && item.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
  let synced = 0;

  for (const item of queue) {
    let response;
    try {
      response = await fetchImpl(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.method === "DELETE" ? undefined : item.body || undefined,
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      break;
    }

    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new CustomEvent("inventory:offline-sync-blocked", { detail: { reason: "session-expired" } }));
      break;
    }
    if (response.status >= 500) break;

    if (!response.ok) {
      let message = "The server rejected this saved change.";
      try {
        const failurePayload = await response.clone().json();
        message = failurePayload?.message || message;
      } catch {
        // Keep the safe generic message.
      }
      await markOfflineQueueItemFailed(item.id, response.status, message);
      continue;
    }

    await removeOfflineQueueItem(item.id);
    synced += 1;
  }

  if (synced > 0) {
    window.dispatchEvent(new CustomEvent("inventory:offline-sync-complete", { detail: { synced } }));
    window.dispatchEvent(new Event("inventory:refresh-notifications"));
  }
  return { synced, blocked: false };
}
