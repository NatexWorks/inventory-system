"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  // Keep desktop collapse state independent from the mobile drawer.
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Resolve the signed-in user before rendering any protected workspace screen.
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  const [authCheckError, setAuthCheckError] = useState("");
  const router = useRouter();

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
          {children}
        </main>
      </div>
    </div>
  );
}
