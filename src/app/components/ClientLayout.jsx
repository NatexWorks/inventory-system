"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  // `open` controls whether the sidebar is visible on desktop and mobile.
  const [open, setOpen] = useState(true);
  // `user` is fetched from the workspace endpoint and passed to the chrome UI.
  const [user, setUser] = useState(null);

  // Auth routes render without the app shell so login pages stay clean.
  const isAuthRoute = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname)
    || pathname.startsWith("/forgot-password/")
    || pathname.startsWith("/reset-password/");

  // Simple toggle handler for the sidebar drawer.
  const handleClick = () => {
    setOpen((prev) => !prev);
  };

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
      <Sidebar className="fixed top-0 left-0 z-30" open={open} handleClick={handleClick} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!open ? (
          <button
            type="button"
            onClick={handleClick}
            className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-200/70 transition hover:border-indigo-200 hover:text-indigo-600"
            aria-label="Open sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
        ) : null}

        <Navbar className="relative top-0 left-0 z-10" handleClick={handleClick} user={user} />

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
