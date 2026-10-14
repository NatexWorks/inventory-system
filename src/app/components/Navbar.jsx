"use client";
import {
  MdArrowDropDown,
  MdSearch,
  MdMenu,
  MdNotifications,
  MdMessage,
  MdAccountCircle,
  MdLogout
} from "react-icons/md";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar({ handleClick, className = "", user }) {
  const router = useRouter();
  // Search is kept in local state because the navbar only needs the current text.
  const [search, setSearch] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const displayName = user?.name || "Inventory User";
  const displayEmail = user?.email || "Signed-in account";

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Logout request failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  }

  return (
    <>
      <nav className={`flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur sm:px-6 lg:px-8 ${className}`}>
        <div className="min-w-0 max-w-full">
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClick}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <MdMenu size={24} />
            </button>

            <div className="min-w-0 max-w-full">
              <div className="wrap-safe text-sm font-semibold leading-tight text-slate-500">Welcome back</div>
              <div className="wrap-safe text-lg font-bold leading-tight text-slate-900 sm:truncate sm:whitespace-nowrap">{displayName}</div>
            </div>
          </span>
          <p className="mt-1 text-sm text-slate-500">Live store activity, inventory movement, and alerts.</p>
        </div>

          <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="hidden min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 xl:flex">
            <MdSearch className="text-xl text-slate-400" />
            <input
              type="text"
              value={search}
              placeholder="Search products..."
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 w-64 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </form>

          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Notifications">
              <MdNotifications size={22} />
            </button>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Messages">
              <MdMessage size={22} />
            </button>
          </div>

          <div className="hidden max-w-[16rem] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 md:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
              <MdAccountCircle size={26} />
            </div>
            <div className="min-w-0">
              <p className="wrap-safe text-sm font-semibold leading-tight text-slate-900 sm:truncate sm:whitespace-nowrap">{displayName}</p>
              <p className="wrap-safe text-xs leading-tight text-slate-500 sm:truncate sm:whitespace-nowrap">{displayEmail}</p>
            </div>
            <MdArrowDropDown className="text-xl text-slate-400" />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Logout"
          >
            <MdLogout size={18} />
            <span>{isLoggingOut ? "Logging out…" : "Log out"}</span>
          </button>
        </div>
      </nav>
      {logoutError ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-right text-sm text-rose-700">{logoutError}</div> : null}
    </>
  );
}
