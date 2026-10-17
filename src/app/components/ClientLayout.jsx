"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MaintenanceScreen from "./MaintenanceScreen";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  // Keep desktop collapse state independent from the mobile drawer.
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Resolve the signed-in user before rendering any protected workspace screen.
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  const [authCheckError, setAuthCheckError] = useState("");
  const [siteUnderMaintenance, setSiteUnderMaintenance] = useState(false);
  const router = useRouter();

  // Catch unexpected browser errors and failing API requests globally. Never display
  // raw stack traces, missing-secret messages, SMTP errors, or database details to users.
  useEffect(() => {
    const showMaintenance = () => setSiteUnderMaintenance(true);
    const isApiRequest = (input) => {
      try {
        const rawUrl = typeof input === "string" || input instanceof URL ? input : input.url;
        return new URL(rawUrl, window.location.origin).pathname.startsWith("/api/");
      } catch {
        return false;
      }
    };

    const originalFetch = window.fetch;
    const guardedFetch = async (...args) => {
      const isApi = isApiRequest(args[0]);
      try {
        const response = await originalFetch.apply(window, args);
        if (isApi && response.status >= 500) {
          window.dispatchEvent(new Event("inventory:maintenance"));
        }
        return response;
      } catch (error) {
        if (isApi) {
          window.dispatchEvent(new Event("inventory:maintenance"));
        }
        throw error;
      }
    };

    const handleUnhandledError = () => showMaintenance();
    window.fetch = guardedFetch;
    window.addEventListener("inventory:maintenance", showMaintenance);
    window.addEventListener("error", handleUnhandledError);
    window.addEventListener("unhandledrejection", handleUnhandledError);

    return () => {
      if (window.fetch === guardedFetch) window.fetch = originalFetch;
      window.removeEventListener("inventory:maintenance", showMaintenance);
      window.removeEventListener("error", handleUnhandledError);
      window.removeEventListener("unhandledrejection", handleUnhandledError);
    };
  }, []);

  // Auth routes render without the app shell so login pages stay clean.
  const isAuthRoute = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname)
    || pathname.startsWith("/forgot-password/")
    || pathname.startsWith("/reset-password/");
  // Close the mobile drawer after route changes and support the Escape key.
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



  // A logout in one tab is broadcast to sibling tabs. Periodic live validation also
  // catches revocation caused by a logout from another browser/device.
  useEffect(() => {
    if (isAuthRoute) return undefined;
    let active = true;
    let redirecting = false;

    const redirectToLogin = () => {
      if (redirecting || !active) return;
      redirecting = true;
      setUser(null);
      setAuthStatus("unauthenticated");
      const requestedPath = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(requestedPath)}`);
    };

    const handleStorage = (event) => {
      if (event.key === "inventory:logout") redirectToLogin();
    };
    const channel = typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("inventory-auth")
      : null;
    const handleBroadcast = (event) => {
      if (event.data?.type === "logout") redirectToLogin();
    };
    channel?.addEventListener("message", handleBroadcast);
    window.addEventListener("storage", handleStorage);

    const validateSession = async () => {
      if (document.visibilityState === "hidden" || redirecting) return;
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) redirectToLogin();
      } catch {
        // A temporary network issue must not log the user out.
      }
    };
    const timer = window.setInterval(validateSession, 30000);
    window.addEventListener("focus", validateSession);
    document.addEventListener("visibilitychange", validateSession);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", validateSession);
      document.removeEventListener("visibilitychange", validateSession);
      window.removeEventListener("storage", handleStorage);
      channel?.removeEventListener("message", handleBroadcast);
      channel?.close();
    };
  }, [isAuthRoute, router]);

  const toggleDesktopSidebar = () => setOpen((prev) => !prev);
  const toggleMobileSidebar = () => setMobileOpen((prev) => !prev);

  useEffect(() => {
    if (isAuthRoute) {
      return undefined;
    }

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

        if (!response.ok) {
          throw new Error("Unable to verify your session.");
        }

        const payload = await response.json();
        const currentUser = payload?.data?.user;
        if (!currentUser) {
          throw new Error("The session response did not contain a user.");
        }

        if (active) {
          setUser(currentUser);
          setAuthStatus("authenticated");
        }
      } catch {
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
  }, [isAuthRoute, router]);

  if (siteUnderMaintenance) {
    return <MaintenanceScreen />;
  }

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (authStatus !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        {authStatus === "error" ? (
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Session check failed</h1>
            <p className="mt-2 text-sm text-slate-600">{authCheckError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
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
      <Sidebar
        className="fixed top-0 left-0 z-30 hidden lg:flex"
        open={open}
        handleClick={toggleDesktopSidebar}
        user={user}
      />

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      ) : null}
      <Sidebar
        mobile
        className="lg:hidden"
        open={mobileOpen}
        handleClick={() => setMobileOpen(false)}
        user={user}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {!open ? (
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className="fixed left-4 top-4 z-40 hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-200/70 transition hover:border-indigo-200 hover:text-indigo-600 lg:inline-flex"
            aria-label="Open sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
        ) : null}

        <Navbar className="relative top-0 left-0 z-10" handleClick={toggleMobileSidebar} user={user} />

        <main className="min-w-0 flex-1">
          {user?.isDemo ? (
            <div role="status" className="flex flex-wrap items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
              <strong>Demo mode — read-only.</strong>
              <span>Your changes are disabled and your sample data is isolated.</span>
              <a href="/signup" className="font-semibold underline underline-offset-2">Create your own account</a>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
