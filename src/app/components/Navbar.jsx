"use client";

import {
  MdArrowDropDown,
  MdSearch,
  MdMenu,
  MdNotifications,
  MdMessage,
  MdAccountCircle,
  MdLogout,
  MdAdd,
  MdSettings,
  MdWarningAmber,
} from "react-icons/md";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar({ handleClick, className = "", user }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState({ items: [], count: 0, enabled: true, loading: true });

  const displayName = user?.name || "Inventory User";
  const displayEmail = user?.email || "Signed-in account";

  const refreshNotifications = useCallback(async function refreshNotifications() {
    try {
      const response = await fetch("/api/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json();
      const summary = payload?.data?.summary;
      if (!summary) return;

      const enabled = summary.lowStockAlertsEnabled !== false;
      const items = enabled ? (summary.lowStockItems || []).map((item) => ({
        id: String(item._id),
        name: item.name || "Unnamed product",
        stock: Number(item.stock || 0),
        sku: item.sku || "",
      })) : [];

      setNotifications({ items, count: Number(summary.lowStockProducts || 0) && enabled ? Number(summary.lowStockProducts) : 0, enabled, loading: false });
    } catch {
      setNotifications((current) => ({ ...current, loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 60_000);
    const handleSettingsUpdated = () => refreshNotifications();
    window.addEventListener("inventory:settings-updated", handleSettingsUpdated);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("inventory:settings-updated", handleSettingsUpdated);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    function closeMenus(event) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setAccountOpen(false);
      }
    }
    window.addEventListener("keydown", closeMenus);
    return () => window.removeEventListener("keydown", closeMenus);
  }, []);

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
    router.push(query ? "/products?search=" + encodeURIComponent(query) : "/products");
  }

  return (
    <>
      <nav className={"relative flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur sm:px-6 sm:py-4 lg:px-8 " + className}>
        <div className="min-w-0 max-w-full">
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClick}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <MdMenu size={24} />
            </button>
            <div className="min-w-0 max-w-full">
              <div className="wrap-safe text-xs font-semibold leading-tight text-slate-500 sm:text-sm">Welcome back</div>
              <div className="wrap-safe max-w-[35vw] text-base font-bold leading-tight text-slate-900 sm:max-w-none sm:text-lg sm:truncate sm:whitespace-nowrap">{displayName}</div>
            </div>
          </span>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">Live store activity, inventory movement, and alerts.</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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

          <div className="relative flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setAccountOpen(false);
                refreshNotifications();
              }}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:h-10 sm:w-10"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <MdNotifications size={22} />
              {notifications.count > 0 ? <span className="absolute right-1 top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{notifications.count > 99 ? "99+" : notifications.count}</span> : null}
            </button>
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:h-10 sm:w-10" aria-label="Messages">
              <MdMessage size={21} />
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">Notifications</p>
                    <p className="text-xs text-slate-500">Low-stock alerts for this workspace</p>
                  </div>
                  <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">{notifications.count} alert{notifications.count === 1 ? "" : "s"}</span>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notifications.loading ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-500">Checking stock levels…</p>
                  ) : !notifications.enabled ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-500">Low-stock alerts are turned off in Settings.</p>
                  ) : notifications.items.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-500">All good — no low-stock items right now.</p>
                  ) : notifications.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-slate-50">
                      <span className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-700"><MdWarningAmber size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-800">{item.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.sku ? "SKU " + item.sku + " · " : ""}{item.stock <= 0 ? "Out of stock" : "Only " + item.stock + " left"}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/products" onClick={() => setNotificationsOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50">Review inventory</Link>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAccountOpen((open) => !open);
                setNotificationsOpen(false);
              }}
              className="flex max-w-[10rem] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 transition hover:border-indigo-200 hover:bg-indigo-50 sm:max-w-[16rem] sm:gap-3 sm:px-3"
              aria-label="Open account menu"
              aria-expanded={accountOpen}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"><MdAccountCircle size={25} /></span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-sm font-semibold leading-tight text-slate-900">{displayName}</span>
                <span className="block max-w-36 truncate text-xs leading-tight text-slate-500">{displayEmail}</span>
              </span>
              <MdArrowDropDown className="shrink-0 text-xl text-slate-400" />
            </button>

            {accountOpen ? (
              <div className="absolute right-0 top-full z-50 mt-3 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                <div className="border-b border-slate-100 px-4 pb-3 pt-2">
                  <p className="break-words text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="break-words text-xs text-slate-500">{displayEmail}</p>
                </div>
                <Link href="/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                  <MdSettings className="text-lg text-slate-500" /> Account & settings
                </Link>
                <Link href="/signup" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                  <MdAdd className="text-lg" /> Add new account
                </Link>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
            aria-label="Logout"
          >
            <MdLogout size={18} />
            <span className="hidden sm:inline">{isLoggingOut ? "Logging out…" : "Log out"}</span>
          </button>
        </div>
      </nav>
      {logoutError ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-right text-sm text-rose-700">{logoutError}</div> : null}
    </>
  );
}
