"use client";

import { useEffect, useState } from "react";
import { MdAccountCircle, MdNotifications, MdOutlineLock, MdOutlineStore, MdPalette, MdSave } from "react-icons/md";

// Declarative definition of the settings sections shown in the left column.
const sections = [
  {
    id: "profile",
    title: "Profile",
    helper: "Update your account information",
    icon: MdAccountCircle,
    fields: ["Full Name", "Email Address", "Phone Number"],
  },
  {
    id: "store",
    title: "Store",
    helper: "Manage your business details",
    icon: MdOutlineStore,
    fields: ["Store Name", "Store Email", "Store Address"],
  },
  {
    id: "security",
    title: "Security",
    helper: "Password and authentication",
    icon: MdOutlineLock,
    fields: ["Current Password", "New Password", "Confirm Password"],
  },
  {
    id: "notifications",
    title: "Notifications",
    helper: "Control what you hear about",
    icon: MdNotifications,
    fields: ["Low stock alerts", "Order updates", "Weekly summary"],
  },
];

// Reusable settings section that renders a group of related inputs.
function SectionCard({ title, helper, icon: Icon, fields, values, onChange }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
          <Icon className="text-2xl" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {fields.map((field) => (
          <div key={field}>
            <label className="mb-2 block text-sm font-medium text-slate-700">{field}</label>
            <input
              value={values[field] || ""}
              onChange={(event) => onChange(field, event.target.value)}
              placeholder={`Enter ${field.toLowerCase()}`}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  // `settings` keeps the latest backend response so the UI can show current saved values.
  const [settings, setSettings] = useState(null);
  // `form` holds the editable inventory, billing, and system settings before save.
  const [form, setForm] = useState({
    lowStockThreshold: 5,
    barcodeRules: "",
    autoBarcodeGeneration: false,
    barcodeMode: "optional",
    invoiceEnabled: true,
    taxPercentage: 0,
    invoiceFormat: "simple",
    offlineMode: true,
    sessionTimeoutMinutes: 30,
  });
  // `loading` blocks the page while initial settings are fetched.
  const [loading, setLoading] = useState(true);
  // `saving` disables the save button while the PUT request is in flight.
  const [saving, setSaving] = useState(false);
  // `error` shows the latest fetch/save failure to the user.
  const [error, setError] = useState("");
  // `message` shows successful save feedback.
  const [message, setMessage] = useState("");
  // `fieldValues` is a local demo/profile form state for the left-side cards.
  const [fieldValues, setFieldValues] = useState({
    "Full Name": "",
    "Email Address": "",
    "Phone Number": "",
    "Store Name": "",
    "Store Email": "",
    "Store Address": "",
    "Current Password": "",
    "New Password": "",
    "Confirm Password": "",
    "Low stock alerts": "Enabled",
    "Order updates": "Enabled",
    "Weekly summary": "Enabled",
  });

  // Loads the current settings from the backend when the page mounts.
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);
        const response = await fetch("/api/settings", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load settings");
        }

        const current = payload?.data?.settings || null;
        if (!active) {
          return;
        }

        setSettings(current);
        setForm({
          lowStockThreshold: current?.inventory?.lowStockThreshold ?? 5,
          barcodeRules: current?.inventory?.barcodeRules ?? "",
          autoBarcodeGeneration: current?.inventory?.autoBarcodeGeneration ?? false,
          barcodeMode: current?.inventory?.barcodeMode ?? "optional",
          invoiceEnabled: current?.billing?.invoiceEnabled ?? true,
          taxPercentage: current?.billing?.taxPercentage ?? 0,
          invoiceFormat: current?.billing?.invoiceFormat ?? "simple",
          offlineMode: current?.system?.offlineMode ?? true,
          sessionTimeoutMinutes: current?.system?.sessionTimeoutMinutes ?? 30,
        });
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load settings");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  // Updates the grouped demo fields using their displayed label as the key.
  function updateField(label, value) {
    setFieldValues((current) => ({ ...current, [label]: value }));
  }

  // Saves only the settings sections that are actually persisted by the backend.
  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          inventory: {
            lowStockThreshold: Number(form.lowStockThreshold || 0),
            barcodeRules: form.barcodeRules,
            autoBarcodeGeneration: Boolean(form.autoBarcodeGeneration),
            barcodeMode: form.barcodeMode,
          },
          billing: {
            invoiceEnabled: Boolean(form.invoiceEnabled),
            taxPercentage: Number(form.taxPercentage || 0),
            invoiceFormat: form.invoiceFormat,
          },
          system: {
            offlineMode: Boolean(form.offlineMode),
            sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes || 30),
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to save settings");
      }

      setSettings(payload?.data?.settings || null);
      setMessage(payload?.message || "Settings saved successfully");
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Settings</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Account Settings</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Personalize your store, secure your account, and manage notifications from one place.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              <MdPalette className="text-lg text-indigo-600" />
              {settings ? "Connected to backend" : "Loading settings"}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Profile Completeness</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">92%</p>
            <p className="mt-1 text-xs text-slate-500">Almost ready</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Store Status</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{settings ? "Active" : "Loading"}</p>
            <p className="mt-1 text-xs text-slate-500">Visible to team</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Offline Mode</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{form.offlineMode ? "On" : "Off"}</p>
            <p className="mt-1 text-xs text-slate-500">Keeps the POS usable without internet</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Security</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{form.sessionTimeoutMinutes}m</p>
            <p className="mt-1 text-xs text-slate-500">Session timeout</p>
          </div>
        </section>

        {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
        {message ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{message}</div> : null}

        <section className="grid gap-5 xl:grid-cols-2">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              {...section}
              values={fieldValues}
              onChange={updateField}
            />
          ))}
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block" htmlFor="lowStockThreshold">
              <span className="mb-2 block text-sm font-medium text-slate-700">Low Stock Threshold</span>
              <input
                id="lowStockThreshold"
                type="number"
                value={form.lowStockThreshold}
                onChange={(e) => setForm((current) => ({ ...current, lowStockThreshold: e.target.value }))}
                placeholder="Enter low stock threshold"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              />
            </label>
            <label className="block" htmlFor="taxPercentage">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tax Percentage</span>
              <input
                id="taxPercentage"
                type="number"
                value={form.taxPercentage}
                onChange={(e) => setForm((current) => ({ ...current, taxPercentage: e.target.value }))}
                placeholder="Enter tax percentage"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              />
            </label>
            <label className="block" htmlFor="invoiceFormat">
              <span className="mb-2 block text-sm font-medium text-slate-700">Invoice Format</span>
              <select
                id="invoiceFormat"
                value={form.invoiceFormat}
                onChange={(e) => setForm((current) => ({ ...current, invoiceFormat: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              >
                <option value="simple">Simple</option>
                <option value="detailed">Detailed</option>
                <option value="thermal">Thermal</option>
              </select>
            </label>
            <label className="block" htmlFor="barcodeRules">
              <span className="mb-2 block text-sm font-medium text-slate-700">Barcode Rules</span>
              <input
                id="barcodeRules"
                value={form.barcodeRules}
                onChange={(e) => setForm((current) => ({ ...current, barcodeRules: e.target.value }))}
                placeholder="Enter barcode rules"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              />
            </label>
            <label className="block" htmlFor="barcodeMode">
              <span className="mb-2 block text-sm font-medium text-slate-700">Barcode Mode</span>
              <select
                id="barcodeMode"
                value={form.barcodeMode}
                onChange={(e) => setForm((current) => ({ ...current, barcodeMode: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              >
                <option value="optional">Optional</option>
                <option value="strict">Strict</option>
              </select>
              <p className="mt-2 text-xs text-slate-400">
                Strict mode requires a barcode before a product can be saved.
              </p>
            </label>
            <label className="block" htmlFor="autoBarcodeGeneration">
              <span className="mb-2 block text-sm font-medium text-slate-700">Auto Barcode Generation</span>
              <select
                id="autoBarcodeGeneration"
                value={String(form.autoBarcodeGeneration)}
                onChange={(e) => setForm((current) => ({ ...current, autoBarcodeGeneration: e.target.value === "true" }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              >
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
            </label>
            <label className="block" htmlFor="offlineMode">
              <span className="mb-2 block text-sm font-medium text-slate-700">Offline Mode</span>
              <select
                id="offlineMode"
                value={String(form.offlineMode)}
                onChange={(e) => setForm((current) => ({ ...current, offlineMode: e.target.value === "true" }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <label className="block" htmlFor="sessionTimeoutMinutes">
              <span className="mb-2 block text-sm font-medium text-slate-700">Session Timeout Minutes</span>
              <input
                id="sessionTimeoutMinutes"
                type="number"
                value={form.sessionTimeoutMinutes}
                onChange={(e) => setForm((current) => ({ ...current, sessionTimeoutMinutes: e.target.value }))}
                placeholder="Enter session timeout minutes"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="text-sm text-slate-500">
              {loading ? "Loading current settings..." : "Changes will be saved to your workspace settings."}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <MdSave className="text-lg" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
