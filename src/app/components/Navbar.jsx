"use client";
import {
  MdArrowDropDown, MdSearch, MdMenu, MdNotifications, MdMessage,
  MdAccountCircle, MdLogout, MdSettings, MdPersonAdd, MdClose
} from "react-icons/md";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar({ handleClick, className = "", user }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const displayName = user?.name || "Inventory User";
  const displayEmail = user?.email || "Signed-in account";
  const unreadCount = notifications.length;

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        setNotificationsLoading(true);
        const response = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setNotifications(payload?.data?.notifications || []);
      } catch {
        // Notification loading is non-critical; keep the rest of the workspace usable.
      } finally {
        if (active) setNotificationsLoading(false);
      }
    }
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);
    const onRefresh = () => loadNotifications();
    window.addEventListener("inventory:refresh-notifications", onRefresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("inventory:refresh-notifications", onRefresh);
    };
  }, []);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
      <nav className={`relative flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur sm:px-6 lg:px-8 ${className}`}>
        <div className="min-w-0 max-w-full">
          <span className="flex items-center gap-3">
            <button type="button" onClick={handleClick} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden" aria-label="Toggle sidebar"><MdMenu size={24} /></button>
            <div className="min-w-0 max-w-full">
              <div className="wrap-safe text-sm font-semibold leading-tight text-slate-500">Welcome back</div>
              <div className="wrap-safe text-lg font-bold leading-tight text-slate-900 sm:truncate sm:whitespace-nowrap">{displayName}</div>
            </div>
          </span>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">Live store activity, inventory movement, and alerts.</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <form onSubmit={handleSearchSubmit} className="hidden min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 xl:flex">
            <MdSearch className="text-xl text-slate-400" />
            <input type="text" value={search} placeholder="Search products..." onChange={(e) => setSearch(e.target.value)} className="min-w-0 w-64 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
          </form>

          <div className="relative flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => { setNotificationOpen((open) => !open); setAccountOpen(false); }} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label={`Notifications${unreadCount ? `, ${unreadCount} alerts` : ""}`} aria-expanded={notificationOpen}>
              <MdNotifications size={22} />
              {unreadCount > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
            </button>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Messages"><MdMessage size={22} /></button>
            {notificationOpen ? (
              <div className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div><p className="font-bold text-slate-900">Notifications</p><p className="text-xs text-slate-500">Live stock and order alerts</p></div>
                  <button type="button" onClick={() => setNotificationOpen(false)} aria-label="Close notifications" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><MdClose size={18} /></button>
                </div>
                <div className="max-h-96 overflow-y-auto p-2">
                  {notificationsLoading && notifications.length === 0 ? <p className="px-3 py-5 text-sm text-slate-500">Checking alerts…</p> : null}
                  {!notificationsLoading && notifications.length === 0 ? <p className="px-3 py-5 text-sm text-slate-500">You're all caught up. No low-stock or recent-order alerts.</p> : null}
                  {notifications.map((item) => (
                    <button key={item.id} type="button" onClick={() => { setNotificationOpen(false); router.push(item.href || "/reports"); }} className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50">
                      <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.level === "critical" ? "bg-rose-50 text-rose-700" : item.level === "warning" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{item.kind}</span>
                      <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{item.message}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-4 py-3"><button type="button" onClick={() => { setNotificationOpen(false); router.push("/reports"); }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Open reports</button></div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button type="button" onClick={() => { setAccountOpen((open) => !open); setNotificationOpen(false); }} aria-expanded={accountOpen} aria-label="Open account menu" className="flex max-w-[13rem] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 transition hover:border-indigo-200 hover:bg-indigo-50 sm:gap-3 sm:px-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"><MdAccountCircle size={25} /></span>
              <span className="hidden min-w-0 text-left md:block"><span className="block truncate text-sm font-semibold leading-tight text-slate-900">{displayName}</span><span className="block max-w-36 truncate text-xs leading-tight text-slate-500">{displayEmail}</span></span>
              <MdArrowDropDown className="shrink-0 text-xl text-slate-400" />
            </button>
            {accountOpen ? (
              <div className="absolute right-0 top-14 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-bold text-slate-900">{displayName}</p><p className="truncate text-xs text-slate-500">{displayEmail}</p></div>
                <button type="button" onClick={() => { setAccountOpen(false); router.push("/settings"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><MdSettings size={19} /> Account settings</button>
                <button type="button" onClick={() => { setAccountOpen(false); router.push("/signup"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><MdPersonAdd size={19} /> Add / create account</button>
              </div>
            ) : null}
          </div>

          <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Logout">
            <MdLogout size={18} /><span className="hidden sm:inline">{isLoggingOut ? "Logging out…" : "Log out"}</span>
          </button>
        </div>
      </nav>
      {logoutError ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-right text-sm text-rose-700">{logoutError}</div> : null}
    </>
  );
}
