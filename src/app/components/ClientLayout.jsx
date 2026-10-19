"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { MdDashboard, MdInventory, MdShoppingCart, MdMenu } from "react-icons/md";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MaintenanceScreen from "./MaintenanceScreen";
import { subscribeToAuthChanges } from "../lib/authBrowserSync";
import {
  cacheApiResponse,
  clearOfflineUserAndCache,
  enqueueOfflineMutation,
  getCachedApiResponse,
  getOfflineQueue,
  getOfflineUser,
  isQueueableMutation,
  saveOfflineUser,
  syncOfflineQueue,
} from "../lib/offlineClient";

function requestDetails(input, init = {}) {
  const requestUrl = typeof input === "string" || input instanceof URL ? input : input.url;
  const url = new URL(requestUrl, window.location.origin);
  const method = String(init.method || input?.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || input?.headers || {});
  return { url, method, headers, body: init.body };
}

function queuedResponse(item) {
  return new Response(JSON.stringify({
    success: true,
    queued: true,
    message: "Internet is unavailable. This change is saved on this device and will sync when the connection returns.",
    data: { queuedOffline: true, offlineQueueId: item.id },
  }), {
    status: 202,
    headers: {
      "content-type": "application/json",
      "x-inventory-offline-queued": "true",
    },
  });
}

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  const [authCheckError, setAuthCheckError] = useState("");
  const [siteUnderMaintenance, setSiteUnderMaintenance] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [queuedChanges, setQueuedChanges] = useState(0);
  const [failedChanges, setFailedChanges] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const router = useRouter();

  // Keep a secure, browser-managed HttpOnly auth cookie. IndexedDB stores only
  // non-secret user context, cached API responses and queued workspace changes.
  useEffect(() => {
    let disposed = false;
    const originalFetch = window.fetch.bind(window);

    const refreshQueueCount = async () => {
      try {
        const items = await getOfflineQueue();
        if (disposed) return;
        setQueuedChanges(items.filter((item) => item.status === "pending").length);
        setFailedChanges(items.filter((item) => item.status === "failed").length);
      } catch {
        // Private browsing or browser storage restrictions should not break the app.
      }
    };

    const guardedFetch = async (input, init = {}) => {
      let details;
      try {
        details = requestDetails(input, init);
      } catch {
        return originalFetch(input, init);
      }
      const { url, method, headers } = details;
      const isApi = url.origin === window.location.origin && url.pathname.startsWith("/api/");
      if (!isApi) return originalFetch(input, init);

      let body = details.body;
      if (body === undefined && input instanceof Request && method !== "GET" && method !== "HEAD") {
        try {
          body = await input.clone().text();
        } catch {
          body = undefined;
        }
      }
      if (typeof body !== "string") body = body == null ? "" : "";

      try {
        const response = await originalFetch(input, init);
        if (response.status >= 500) {
          window.dispatchEvent(new Event("inventory:maintenance"));
        }

        if (url.pathname === "/api/auth/me" && response.ok) {
          // Persist the non-secret user profile in the background so IndexedDB
          // work never delays the caller from receiving the network response.
          void response.clone().json()
            .then((payload) => payload?.data?.user ? saveOfflineUser(payload.data.user) : undefined)
            .catch(() => {
              // A malformed auth response must not break the original request.
            });
        } else if (method === "GET" && response.ok && !url.pathname.startsWith("/api/auth/")) {
          // Cache successful reads asynchronously; the online response should be
          // returned immediately even on slower phones or storage implementations.
          void (async () => {
            try {
              const offlineUser = await getOfflineUser();
              if (offlineUser?.userId) await cacheApiResponse(url.href, response, offlineUser.userId);
            } catch {
              // Caching is best-effort; online requests still work without IndexedDB.
            }
          })();
        }

        if (url.pathname === "/api/auth/logout" && response.ok) {
          try {
            await clearOfflineUserAndCache();
          } catch {
            // Server logout still succeeds if local cache cleanup is unavailable.
          }
        }
        return response;
      } catch (error) {
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        if (method === "GET" && url.pathname === "/api/auth/me") {
          try {
            const cachedUser = await getOfflineUser();
            if (cachedUser?.user) {
              return new Response(JSON.stringify({
                success: true,
                message: "Using the last verified session profile while offline.",
                data: { user: cachedUser.user },
              }), {
                status: 200,
                headers: {
                  "content-type": "application/json",
                  "x-inventory-offline-session": "true",
                },
              });
            }
          } catch {
            // Fall through to the normal network error.
          }
        }

        if (method === "GET") {
          try {
            const cachedUser = await getOfflineUser();
            if (cachedUser?.userId) {
              const cachedResponse = await getCachedApiResponse(url.href, cachedUser.userId);
              if (cachedResponse) return cachedResponse;
            }
          } catch {
            // Fall through to the normal network error.
          }
        }

        if (
          (offline || error instanceof TypeError) &&
          isQueueableMutation(url.href, method, headers, body)
        ) {
          try {
            const item = await enqueueOfflineMutation({
              url: url.href,
              method,
              headers,
              body,
            });
            window.dispatchEvent(new Event("inventory:offline-queue-updated"));
            return queuedResponse(item);
          } catch {
            // Do not pretend a change was saved if local persistence failed.
          }
        }

        throw error;
      }
    };

    window.fetch = guardedFetch;
    const updateOnlineState = () => {
      setNetworkOnline(navigator.onLine);
      if (navigator.onLine) {
        syncOfflineQueue(originalFetch)
          .then((result) => {
            if (result.synced) setSyncMessage(`Synced ${result.synced} saved change${result.synced === 1 ? "" : "s"}.`);
          })
          .catch(() => {
            // Pending items remain in IndexedDB and can retry on the next online event.
          })
          .finally(refreshQueueCount);
      }
    };
    const updateQueueState = () => refreshQueueCount();
    const handleSyncBlocked = () => setSyncMessage("Saved changes are waiting. Sign in to the same account and reconnect to sync them.");
    const handleSyncComplete = (event) => {
      const count = event.detail?.synced || 0;
      if (count) setSyncMessage(`Synced ${count} saved change${count === 1 ? "" : "s"}.`);
    };
    const handleQueueError = () => setSyncMessage("Some saved changes were rejected by the server. Review the affected forms before retrying.");
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    window.addEventListener("inventory:offline-queue-updated", updateQueueState);
    window.addEventListener("inventory:offline-sync-blocked", handleSyncBlocked);
    window.addEventListener("inventory:offline-sync-complete", handleSyncComplete);
    window.addEventListener("inventory:offline-sync-error", handleQueueError);

    // Initial sync is handled by updateOnlineState to avoid two competing queue checks.
    window.setTimeout(updateOnlineState, 0);
    refreshQueueCount();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline API caching still works without service-worker support.
      });
    }

    return () => {
      disposed = true;
      if (window.fetch === guardedFetch) window.fetch = originalFetch;
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
      window.removeEventListener("inventory:offline-queue-updated", updateQueueState);
      window.removeEventListener("inventory:offline-sync-blocked", handleSyncBlocked);
      window.removeEventListener("inventory:offline-sync-complete", handleSyncComplete);
      window.removeEventListener("inventory:offline-sync-error", handleQueueError);
    };
  }, []);

  // Keep every same-origin tab/window aligned with the shared HttpOnly session cookie.
  useEffect(() => {
    return subscribeToAuthChanges(({ type }) => {
      if (type === "logout") {
        void (async () => {
          try {
            await clearOfflineUserAndCache();
          } catch {
            // Logout must still navigate away if browser storage is unavailable.
          }

          const currentPath = window.location.pathname;
          const isAuthPath = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(currentPath)
            || currentPath.startsWith("/forgot-password/")
            || currentPath.startsWith("/reset-password/");
          if (currentPath !== "/" && !isAuthPath) {
            window.location.replace("/login");
          }
        })();
        return;
      }

      if (type === "login") {
        const currentPath = window.location.pathname;
        const isAuthPath = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(currentPath)
          || currentPath.startsWith("/forgot-password/")
          || currentPath.startsWith("/reset-password/");
        if (currentPath === "/" || isAuthPath) {
          window.location.replace("/dashboard");
        } else {
          // A login may have switched the account attached to the shared cookie.
          window.location.reload();
        }
      }
    });
  }, []);

  const isPublicRoute = pathname === "/";
  const isAuthRoute = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname)
    || pathname.startsWith("/forgot-password/")
    || pathname.startsWith("/reset-password/");

  // When someone opens the main URL (or signup page), verify any saved cookie
  // with the backend first. A valid session goes straight to the workspace;
  // a missing/invalid cookie leaves the public page available as normal.
  useEffect(() => {
    if (pathname !== "/" && pathname !== "/signup") return undefined;

    let active = true;

    async function resumeExistingSession() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        // Never redirect based only on locally cached profile data. The session
        // must be confirmed by the backend for this online request.
        if (
          !active ||
          !response.ok ||
          response.headers.get("x-inventory-offline-session") === "true"
        ) {
          return;
        }

        const payload = await response.json();
        if (!active || !payload?.data?.user) return;

        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const destination =
          requestedNext &&
          requestedNext.startsWith("/") &&
          !requestedNext.startsWith("//") &&
          !/^\/(?:login|signup|forgot-password|reset-password)(?:[/?#]|$)/.test(requestedNext)
            ? requestedNext
            : "/dashboard";

        router.replace(destination);
        router.refresh();
      } catch {
        // Fail open for public pages if the session endpoint is unreachable.
      }
    }

    void resumeExistingSession();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Close the mobile drawer when browser navigation changes routes.
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const toggleDesktopSidebar = () => setOpen((prev) => !prev);
  const toggleMobileSidebar = () => setMobileOpen((prev) => !prev);

  useEffect(() => {
    if (isAuthRoute || isPublicRoute) return undefined;

    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset status before validating the new protected-route session.
    setAuthStatus("checking");
    setAuthCheckError("");

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          if (!active) return;
          setUser(null);
          setAuthStatus("unauthenticated");
          const requestedPath = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(requestedPath)}`);
          return;
        }

        if (!response.ok) throw new Error("Unable to verify your session.");
        const payload = await response.json();
        const currentUser = payload?.data?.user;
        if (!currentUser) throw new Error("The session response did not contain a user.");

        if (active) {
          setUser(currentUser);
          const usingOfflineSession = response.headers.get("x-inventory-offline-session") === "true";
          setAuthStatus(usingOfflineSession ? "offline" : "authenticated");
          if (!usingOfflineSession && navigator.onLine) {
            syncOfflineQueue(window.fetch.bind(window)).catch(() => {});
          }
        }
      } catch {
        try {
          const cachedUser = await getOfflineUser();
          if (active && !navigator.onLine && cachedUser?.user) {
            setUser(cachedUser.user);
            setAuthStatus("offline");
            return;
          }
        } catch {
          // Continue to the connection error state.
        }
        if (active) {
          setAuthStatus("error");
          setAuthCheckError("We couldn't verify your session. Check your connection and retry.");
        }
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [isAuthRoute, isPublicRoute, router]);

  if (siteUnderMaintenance) return <MaintenanceScreen />;
  if (isAuthRoute || isPublicRoute) return <>{children}</>;

  if (authStatus !== "authenticated" && authStatus !== "offline") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        {authStatus === "error" ? (
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Session check failed</h1>
            <p className="mt-2 text-sm text-slate-600">{authCheckError}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
              Retry
            </button>
          </div>
        ) : (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 text-sm font-medium text-slate-600">
            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            Verifying your session…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#eef2ff]">
      <Sidebar className="fixed top-0 left-0 z-30 hidden lg:flex" open={open} handleClick={toggleDesktopSidebar} user={user} />

      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" />
      ) : null}
      <Sidebar mobile className="lg:hidden" open={mobileOpen} handleClick={() => setMobileOpen(false)} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!open ? (
          <button type="button" onClick={toggleDesktopSidebar} className="fixed left-4 top-4 z-40 hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-200/70 transition hover:border-indigo-200 hover:text-indigo-600 lg:inline-flex" aria-label="Open sidebar">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
            </svg>
          </button>
        ) : null}

        <Navbar className="relative top-0 left-0 z-10" handleClick={toggleMobileSidebar} user={user} />

        {!networkOnline || queuedChanges > 0 || failedChanges > 0 || syncMessage ? (
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 text-sm ${!networkOnline ? "border-amber-200 bg-amber-50 text-amber-950" : failedChanges ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status" aria-live="polite">
            <strong>{!networkOnline ? "Offline mode" : failedChanges ? "Sync needs attention" : queuedChanges ? "Syncing saved changes" : "Connection restored"}</strong>
            <span>
              {!networkOnline
                ? "Cached screens and saved data remain available. New supported changes are stored on this device."
                : failedChanges
                  ? `${failedChanges} saved change(s) were rejected. Review those records before trying again.`
                  : queuedChanges
                    ? `${queuedChanges} change(s) waiting to sync.`
                    : syncMessage}
            </span>
            {syncMessage && networkOnline ? <button type="button" className="ml-auto font-semibold underline" onClick={() => setSyncMessage("")}>Dismiss</button> : null}
          </div>
        ) : null}

        <main className="app-main-content min-w-0 flex-1 pb-20 sm:pb-0">
          {user?.isDemo ? (
            <div role="status" className="flex flex-wrap items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
              <strong>Demo mode — read-only.</strong>
              <span>Your changes are disabled and your sample data is isolated.</span>
              <a href="/signup" className="font-semibold underline underline-offset-2">Create your own account</a>
            </div>
          ) : null}
          {authStatus === "offline" ? (
            <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
              Showing your last verified session profile offline. Changes will sync only after the same account is verified online.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
