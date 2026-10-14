"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  // Keep desktop collapse state independent from the mobile drawer.
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // `user` is fetched from the workspace endpoint and passed to the chrome UI.
  const [user, setUser] = useState(null);

  // Auth routes render without the app shell so login pages stay clean.
  const isAuthRoute = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname)
    || pathname.startsWith("/forgot-password/")
    || pathname.startsWith("/reset-password/");
  // Close the mobile drawer after route changes and support the Escape key.
  useEffect(() => {
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
      return;
    }

    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const payload = await response.json();
          if (active) {
            setUser(payload?.data?.user || null);
          }
        }
      } catch {
        // The app now works without login, so we keep rendering even if the profile fetch fails.
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [isAuthRoute]);

  if (isAuthRoute) {
    return <>{children}</>;
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
