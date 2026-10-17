"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MdAccountCircle, MdNotifications, MdOutlineLock, MdOutlineStore, MdPalette, MdSave } from "react-icons/md";

const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white";
const labelClass = "mb-2 block text-sm font-medium text-slate-700";

function Field({ label, children }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;
}

function SectionCard({ title, helper, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Icon className="text-2xl" /></div>
        <div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{helper}</p></div>
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function Toggle({ label, checked, onChange, helper }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
      <span><span className="block text-sm font-medium text-slate-800">{label}</span>{helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}</span>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-indigo-600" />
    </label>
  );
}

const defaultForm = {
  lowStockThreshold: 5, barcodeRules: "Unique barcodes per sellable unit", autoBarcodeGeneration: false,
  barcodeMode: "optional", invoiceEnabled: true, taxPercentage: 0, invoiceFormat: "simple",
  offlineMode: true, sessionTimeoutMinutes: 30, tokenExpirationDays: 7, storeName: "", storeEmail: "", storeAddress: "",
  lowStockAlerts: true, orderUpdates: true, weeklySummary: true,
};

export default function SettingsPage() {
  const [form, setForm] = useState(defaultForm);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const skipFirstAutoSave = useRef(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [settingsResponse, profileResponse] = await Promise.all([
          fetch("/api/settings", { credentials: "include", cache: "no-store" }),
          fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
        ]);
        const [settingsPayload, profilePayload] = await Promise.all([settingsResponse.json(), profileResponse.json()]);
        if (!settingsResponse.ok) throw new Error(settingsPayload?.message || "Could not load settings");
        if (!profileResponse.ok) throw new Error(profilePayload?.message || "Could not load profile");
        if (!active) return;
        const current = settingsPayload?.data?.settings;
        const user = profilePayload?.data?.user;
        setProfile({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
        setForm({
          ...defaultForm,
          lowStockThreshold: current?.inventory?.lowStockThreshold ?? 5,
          barcodeRules: current?.inventory?.barcodeRules ?? defaultForm.barcodeRules,
          autoBarcodeGeneration: current?.inventory?.autoBarcodeGeneration ?? false,
          barcodeMode: current?.inventory?.barcodeMode ?? "optional",
          storeName: current?.store?.storeName ?? "",
          storeEmail: current?.store?.storeEmail ?? "",
          storeAddress: current?.store?.storeAddress ?? "",
          lowStockAlerts: current?.notifications?.lowStockAlerts ?? true,
          orderUpdates: current?.notifications?.orderUpdates ?? true,
          weeklySummary: current?.notifications?.weeklySummary ?? true,
          invoiceEnabled: current?.billing?.invoiceEnabled ?? true,
          taxPercentage: current?.billing?.taxPercentage ?? 0,
          invoiceFormat: current?.billing?.invoiceFormat ?? "simple",
          offlineMode: current?.system?.offlineMode ?? true,
          sessionTimeoutMinutes: current?.system?.sessionTimeoutMinutes ?? 30,
          tokenExpirationDays: current?.system?.tokenExpirationDays ?? 7,
        });
      } catch (err) {
        if (active) setError(err.message || "Could not load settings");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loading) return undefined;
    if (skipFirstAutoSave.current) {
      skipFirstAutoSave.current = false;
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      setAutoSaving(true);
      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventory: {
              lowStockThreshold: Number(form.lowStockThreshold),
              barcodeRules: form.barcodeRules,
              autoBarcodeGeneration: Boolean(form.autoBarcodeGeneration),
              barcodeMode: form.barcodeMode,
            },
            store: { storeName: form.storeName, storeEmail: form.storeEmail, storeAddress: form.storeAddress },
            notifications: { lowStockAlerts: form.lowStockAlerts, orderUpdates: form.orderUpdates, weeklySummary: form.weeklySummary },
            billing: { invoiceEnabled: form.invoiceEnabled, taxPercentage: Number(form.taxPercentage), invoiceFormat: form.invoiceFormat },
            system: { offlineMode: form.offlineMode, sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes), tokenExpirationDays: Number(form.tokenExpirationDays) },
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || "Automatic save failed.");
        setMessage("Changes saved automatically.");
        setError("");
        window.dispatchEvent(new Event("inventory:refresh-notifications"));
      } catch (err) {
        setError(err.message || "Automatic save failed.");
      } finally {
        setAutoSaving(false);
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form, loading]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function saveProfile() {
    setSavingProfile(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Profile update failed");
      setProfile({ name: payload?.data?.user?.name || profile.name, email: payload?.data?.user?.email || profile.email, phone: payload?.data?.user?.phone || "" });
      setMessage("Profile details saved.");
    } catch (err) { setError(err.message || "Profile update failed"); }
    finally { setSavingProfile(false); }
  }

  async function savePassword() {
    setSavingPassword(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/password", {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Password update failed");
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed successfully.");
    } catch (err) { setError(err.message || "Password update failed"); }
    finally { setSavingPassword(false); }
  }

  async function saveSettings() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory: {
            lowStockThreshold: Number(form.lowStockThreshold),
            barcodeRules: form.barcodeRules,
            autoBarcodeGeneration: Boolean(form.autoBarcodeGeneration),
            barcodeMode: form.barcodeMode,
          },
          store: { storeName: form.storeName, storeEmail: form.storeEmail, storeAddress: form.storeAddress },
          notifications: { lowStockAlerts: form.lowStockAlerts, orderUpdates: form.orderUpdates, weeklySummary: form.weeklySummary },
          billing: { invoiceEnabled: form.invoiceEnabled, taxPercentage: Number(form.taxPercentage), invoiceFormat: form.invoiceFormat },
          system: { offlineMode: form.offlineMode, sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes), tokenExpirationDays: Number(form.tokenExpirationDays) },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Settings save failed");
      setMessage("Store, invoice, inventory, and notification settings saved.");
    } catch (err) { setError(err.message || "Settings save failed"); }
    finally { setSaving(false); }
  }

  const profileCompleteness = useMemo(() => {
    const fields = [profile.name, profile.email, profile.phone, form.storeName, form.storeEmail, form.storeAddress];
    return Math.round((fields.filter((value) => String(value || "").trim()).length / fields.length) * 100);
  }, [profile, form.storeName, form.storeEmail, form.storeAddress]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Account & Store Settings</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Saved account details, store information, billing formats, stock alerts, and security.</p></div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><MdPalette className="text-lg text-indigo-600" />{loading ? "Loading settings" : autoSaving ? "Saving changes…" : "Changes auto-save"}</div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm"><p className="text-sm font-medium text-slate-500">Profile completeness</p><p className="mt-2 text-2xl font-bold text-slate-900">{profileCompleteness}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: profileCompleteness + "%" }} /></div></div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm"><p className="text-sm font-medium text-slate-500">Invoice mode</p><p className="mt-2 text-2xl font-bold capitalize text-slate-900">{form.invoiceEnabled ? form.invoiceFormat : "Disabled"}</p><p className="mt-1 text-xs text-slate-500">Used when printing order invoices</p></div>
        </section>

        {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
        {message ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{message}</div> : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Profile" helper="Your personal account details" icon={MdAccountCircle}>
            <Field label="Full Name"><input className={inputClass} autoComplete="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="Email Address"><input className={inputClass + " cursor-not-allowed opacity-70"} type="email" autoComplete="email" value={profile.email} readOnly aria-readonly="true" /><span className="mt-1 block text-xs text-slate-500">Account email is fixed for security and cannot be changed here.</span></Field>
            <Field label="Phone Number"><input className={inputClass} type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <button type="button" onClick={saveProfile} disabled={savingProfile || loading} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><MdSave />{savingProfile ? "Saving..." : "Save Profile"}</button>
          </SectionCard>

          <SectionCard title="Store" helper="Business details shown on invoices" icon={MdOutlineStore}>
            <Field label="Store Name"><input className={inputClass} value={form.storeName} onChange={(e) => update("storeName", e.target.value)} placeholder="Your store or business name" /></Field>
            <Field label="Store Email"><input className={inputClass} type="email" value={form.storeEmail} onChange={(e) => update("storeEmail", e.target.value)} placeholder="billing@example.com" /></Field>
            <Field label="Store Address"><textarea className={inputClass} rows={3} value={form.storeAddress} onChange={(e) => update("storeAddress", e.target.value)} placeholder="Business address for invoices" /></Field>
          </SectionCard>

          <SectionCard title="Security" helper="Change your password securely" icon={MdOutlineLock}>
            <Field label="Current Password"><input className={inputClass} type="password" autoComplete="current-password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></Field>
            <Field label="New Password"><input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} placeholder="At least 8 characters" /></Field>
            <Field label="Confirm Password"><input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} /></Field>
            <button type="button" onClick={savePassword} disabled={savingPassword || !password.currentPassword || !password.newPassword || !password.confirmPassword} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><MdSave />{savingPassword ? "Updating..." : "Change Password"}</button>
          </SectionCard>

          <SectionCard title="Notifications" helper="Choose which workspace alerts are enabled" icon={MdNotifications}>
            <Toggle label="Low Stock Alerts" helper="Show low-stock items on the dashboard using your threshold." checked={form.lowStockAlerts} onChange={(value) => update("lowStockAlerts", value)} />
            <Toggle label="Order Updates" helper="Show recent order activity on the dashboard." checked={form.orderUpdates} onChange={(value) => update("orderUpdates", value)} />
            <Toggle label="Weekly Summary" helper="Show completed sales and average order value for the last 7 days." checked={form.weeklySummary} onChange={(value) => update("weeklySummary", value)} />
          </SectionCard>
        </div>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Operational settings</p><h2 className="mt-2 text-xl font-bold text-slate-900">Inventory & Billing</h2><p className="mt-1 text-sm text-slate-500">The low-stock threshold drives dashboard and product alerts. Invoice format controls the printable invoice layout.</p></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Low Stock Threshold"><input className={inputClass} type="number" min="0" max="100000" value={form.lowStockThreshold} onChange={(e) => update("lowStockThreshold", e.target.value)} /></Field>
            <Field label="Tax Percentage"><input className={inputClass} type="number" min="0" max="100" step="0.01" value={form.taxPercentage} onChange={(e) => update("taxPercentage", e.target.value)} /></Field>
            <Field label="Invoice Format"><select className={inputClass} value={form.invoiceFormat} onChange={(e) => update("invoiceFormat", e.target.value)}><option value="simple">Simple receipt (A5)</option><option value="detailed">Detailed invoice (A4)</option><option value="thermal">Thermal receipt (80mm)</option></select><span className="mt-2 block text-xs leading-relaxed text-slate-500">{form.invoiceFormat === "simple" ? "Compact receipt with the main item and payment totals." : form.invoiceFormat === "detailed" ? "Full-page invoice with barcode details and order notes when available." : "Narrow 80mm receipt layout for supported thermal printers."} Saved format is applied when you print a completed order from the Orders page.</span></Field>
            <Field label="Barcode Rules"><input className={inputClass} value={form.barcodeRules} onChange={(e) => update("barcodeRules", e.target.value)} /></Field>
            <Field label="Barcode Mode"><select className={inputClass} value={form.barcodeMode} onChange={(e) => update("barcodeMode", e.target.value)}><option value="optional">Optional</option><option value="strict">Strict</option></select><span className="mt-2 block text-xs text-slate-500">Strict mode requires a barcode unless auto-generation is enabled.</span></Field>
            <Field label="Auto Barcode Generation"><select className={inputClass} value={String(form.autoBarcodeGeneration)} onChange={(e) => update("autoBarcodeGeneration", e.target.value === "true")}><option value="false">Disabled</option><option value="true">Enabled</option></select></Field>
            <Field label="Session Timeout (minutes)"><input className={inputClass} type="number" min="5" max="1440" value={form.sessionTimeoutMinutes} onChange={(e) => update("sessionTimeoutMinutes", e.target.value)} /></Field>
            <Field label="Login Token Expiry"><select className={inputClass} value={String(form.tokenExpirationDays)} onChange={(e) => update("tokenExpirationDays", Number(e.target.value))}><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days (default)</option><option value="14">14 days</option><option value="30">30 days</option></select><span className="mt-2 block text-xs leading-relaxed text-slate-500">Your signed-in token expires after this period. Changes apply the next time you sign in.</span></Field>
            <Field label="Offline Mode"><select className={inputClass} value={String(form.offlineMode)} onChange={(e) => update("offlineMode", e.target.value === "true")}><option value="true">Enabled</option><option value="false">Disabled</option></select></Field>
            <Toggle label="Invoice Printing" helper="When disabled, invoice print actions are hidden." checked={form.invoiceEnabled} onChange={(value) => update("invoiceEnabled", value)} />
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{loading ? "Loading current settings..." : autoSaving ? "Saving changes automatically..." : "Changes auto-save as you edit. You can also use the save button."}</p><button type="button" onClick={saveSettings} disabled={saving || loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 disabled:opacity-60"><MdSave className="text-lg" />{saving ? "Saving..." : "Save Store & Settings"}</button></div>
        </section>
      </div>
    </div>
  );
}
