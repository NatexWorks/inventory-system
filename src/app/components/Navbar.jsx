"use client";
import {
  MdArrowDropDown, MdSearch, MdMenu, MdNotifications, MdMessage,
  MdAccountCircle, MdLogout, MdSettings, MdPersonAdd, MdClose
} from "react-icons/md";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { broadcastAuthChange } from "../lib/authBrowserSync";

export default function Navbar({ handleClick, className = "", user }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationButtonRef = useRef(null);
  const [notificationPanelPosition, setNotificationPanelPosition] = useState({ top: 76, left: 12, right: 12, width: undefined, maxHeight: "calc(100dvh - 5.5rem)" });
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationToast, setNotificationToast] = useState(null);
  const seenNotificationIdsRef = useRef(new Set());
  const notificationBaselineReadyRef = useRef(false);
  const notificationToastTimerRef = useRef(null);

  const displayName = user?.name || "Inventory User";
  const displayEmail = user?.email || "Signed-in account";

  useEffect(() => {
    if (!notificationOpen) return undefined;

    const updatePlacement = () => {
      const trigger = notificationButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const isPhone = window.matchMedia("(max-width: 639px)").matches;
      const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - 160));

      if (isPhone) {
        setNotificationPanelPosition({
          top,
          left: 12,
          right: 12,
          width: undefined,
          maxHeight: `calc(100dvh - ${top + 12}px)`,
        });
      } else {
        setNotificationPanelPosition({
          top,
          left: undefined,
          right: Math.max(12, window.innerWidth - rect.right),
          width: "min(22rem, calc(100vw - 2rem))",
          maxHeight: `calc(100dvh - ${top + 12}px)`,
        });
      }
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [notificationOpen]);

  useEffect(() => {
    let active = true;
    let intervalId = null;
    let timeoutId = null;
    let idleId = null;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!active) return;

        const nextNotifications = Array.isArray(payload?.data?.notifications)
          ? payload.data.notifications
          : [];
        const seenIds = seenNotificationIdsRef.current;

        // The first response establishes a baseline. Only later, genuinely new
        // unread event IDs produce a toast; polling a still-low item does not.
        if (notificationBaselineReadyRef.current) {
          const newUnread = nextNotifications.filter((item) => !item.isRead && !seenIds.has(item.id));
          if (newUnread.length > 0) {
            const first = newUnread[0];
            setNotificationToast({
              count: newUnread.length,
              title: first.title,
              message: first.message,
            });
            if (notificationToastTimerRef.current !== null) {
              window.clearTimeout(notificationToastTimerRef.current);
            }
            notificationToastTimerRef.current = window.setTimeout(() => {
              setNotificationToast(null);
              notificationToastTimerRef.current = null;
            }, 9000);
          }
        }

        for (const item of nextNotifications) seenIds.add(item.id);
        notificationBaselineReadyRef.current = true;
        setNotifications(nextNotifications);
        setUnreadCount(Math.max(0, Number(payload?.data?.unreadCount) || 0));
      } catch {
        // Notification loading is non-critical; keep the rest of the workspace usable.
      } finally {
        if (active) setNotificationsLoading(false);
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        setNotificationsLoading(true);
        void loadNotifications();
      }
    };
    const onRefresh = () => refreshWhenVisible();
    window.addEventListener("inventory:refresh-notifications", onRefresh);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    if (notificationOpen) {
      setNotificationsLoading(true);
      void loadNotifications();
    } else if ("requestIdleCallback" in window) {
      // Keep the initial badge fetch off the critical first paint.
      idleId = window.requestIdleCallback(() => {
        setNotificationsLoading(true);
        void loadNotifications();
      }, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(() => {
        setNotificationsLoading(true);
        void loadNotifications();
      }, 1500);
    }

    // Poll while the authenticated workspace is open, not only while the panel
    // is expanded, so new low-stock transitions surface in the bell and toast.
    intervalId = window.setInterval(refreshWhenVisible, 60000);

    return () => {
      active = false;
      if (intervalId !== null) window.clearInterval(intervalId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      window.removeEventListener("inventory:refresh-notifications", onRefresh);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [notificationOpen]);

  useEffect(() => () => {
    if (notificationToastTimerRef.current !== null) {
      window.clearTimeout(notificationToastTimerRef.current);
    }
  }, []);


  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Logout request failed");
      broadcastAuthChange("logout");
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function markNotificationRead(item) {
    if (item.isRead) return true;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!response.ok) return false;

      const payload = await response.json();
      const readAt = payload?.data?.readAt || new Date().toISOString();
      setNotifications((current) => current.map((notification) =>
        notification.id === item.id
          ? { ...notification, isRead: true, readAt }
          : notification
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
      return true;
    } catch {
      return false;
    }
  }

  async function markAllNotificationsRead() {
    if (unreadCount === 0) return;
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!response.ok) return;
      const readAt = new Date().toISOString();
      setNotifications((current) => current
        .filter((item) => item.active)
        .map((item) => ({ ...item, isRead: true, readAt })));
      setUnreadCount(0);
    } catch {
      // Keep current read state if the server could not confirm the action.
    }
  }

  function dismissNotificationToast() {
    setNotificationToast(null);
    if (notificationToastTimerRef.current !== null) {
      window.clearTimeout(notificationToastTimerRef.current);
      notificationToastTimerRef.current = null;
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  }

  return (
    <>
      <nav className={`relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-4 lg:px-8 ${className}`}>
        <div className="min-w-0 max-w-full">
          <span className="flex items-center gap-3">
            <button type="button" onClick={handleClick} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden" aria-label="Toggle sidebar"><MdMenu size={24} /></button>
            <div className="min-w-0 max-w-full">
              <div className="wrap-safe text-sm font-semibold leading-tight text-slate-500">Welcome back</div>
              <div className="wrap-safe text-lg font-bold leading-tight text-slate-900 sm:truncate sm:whitespace-nowrap">{displayName}</div>
            </div>
          </span>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">Live store activity, inventory movement, and alerts.</p>
        </div>

        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto sm:gap-3">
          <form onSubmit={handleSearchSubmit} className="hidden min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 xl:flex">
            <MdSearch className="text-xl text-slate-400" />
            <input type="text" value={search} placeholder="Search products..." onChange={(e) => setSearch(e.target.value)} className="min-w-0 w-64 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
          </form>

          <div className="relative flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => { setNotificationOpen((open) => !open); setAccountOpen(false); }} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" ref={notificationButtonRef} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread low-stock alerts` : ""}`} aria-expanded={notificationOpen}>
              <MdNotifications size={22} />
              {unreadCount > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
            </button>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Messages"><MdMessage size={22} /></button>
            {notificationOpen && typeof document !== "undefined" ? createPortal(
              <div
                style={{
                  position: "fixed",
                  top: notificationPanelPosition.top,
                  left: notificationPanelPosition.left,
                  right: notificationPanelPosition.right,
                  width: notificationPanelPosition.width,
                  maxHeight: notificationPanelPosition.maxHeight,
                }}
                data-testid="notification-panel" className="z-[100] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">Notifications</p>
                    <p className="text-xs text-slate-500">Low-stock alerts only{unreadCount ? ` · ${unreadCount} unread` : ""}</p>
                    {unreadCount > 0 ? <button type="button" onClick={markAllNotificationsRead} className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">Mark all read</button> : null}
                  </div>
                  <button type="button" onClick={() => setNotificationOpen(false)} aria-label="Close notifications" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><MdClose size={18} /></button>
                </div>
                <div className="min-h-0 overflow-y-auto p-2" style={{ maxHeight: "min(24rem, 45dvh)" }}>
                  {notificationsLoading && notifications.length === 0 ? <p className="px-3 py-5 text-sm text-slate-500">Checking low-stock alerts…</p> : null}
                  {!notificationsLoading && notifications.length === 0 ? <p className="px-3 py-5 text-sm text-slate-500">No low-stock alerts to review.</p> : null}
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={async () => {
                        if (!item.isRead) await markNotificationRead(item);
                        setNotificationOpen(false);
                        router.push(item.href || "/products");
                      }}
                      className={`block w-full rounded-xl border px-3 py-3 text-left transition hover:bg-slate-50 ${item.isRead ? "border-transparent bg-white" : "border-indigo-100 bg-indigo-50/50"}`}
                    >
                      <span className="mb-1 flex items-center justify-between gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${!item.active ? "bg-slate-100 text-slate-600" : item.level === "critical" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                          {!item.active ? "Resolved" : item.kind}
                        </span>
                        {!item.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="Unread" /> : <span className="text-[10px] font-medium text-slate-400">Read</span>}
                      </span>
                      <span className={`block text-sm ${item.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{item.message}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-4 py-3"><button type="button" onClick={() => { setNotificationOpen(false); router.push("/products"); }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Review products</button></div>

              </div>,
              document.body
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
      {notificationToast ? (
        <div role="status" aria-live="polite" className="fixed right-3 top-20 z-[120] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl sm:right-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><MdNotifications size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{notificationToast.count > 1 ? `${notificationToast.count} new low-stock alerts` : "New low-stock alert"}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">{notificationToast.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{notificationToast.message}</p>
              <button type="button" onClick={() => { dismissNotificationToast(); setNotificationOpen(true); setAccountOpen(false); }} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700">View alert</button>
            </div>
            <button type="button" onClick={dismissNotificationToast} aria-label="Dismiss low-stock alert" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><MdClose size={16} /></button>
          </div>
        </div>
      ) : null}
      {logoutError ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-right text-sm text-rose-700">{logoutError}</div> : null}
    </>
  );
}
