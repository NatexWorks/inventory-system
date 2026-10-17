"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MdAdd, MdDeleteOutline, MdLocalShipping, MdMailOutline, MdPhone, MdSave, MdSearch, MdStar, MdRefresh } from "react-icons/md";

const emptySupplier = () => ({ name: "", contact: "", email: "", address: "", products: 0, rating: 0, status: "Active" });
const inputClass = "w-full min-w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function StatCard({ title, value, helper, icon: Icon, accent }) {
  return <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div><div className={`rounded-2xl p-3 ${accent}`}><Icon className="text-2xl" /></div></div></div>;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newRow, setNewRow] = useState(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/suppliers", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Could not load suppliers.");
      setSuppliers((payload?.data?.suppliers || []).map((item) => ({ ...item, id: String(item._id), dirty: false })));
    } catch (err) {
      setError(err.message || "Could not load suppliers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => suppliers.filter((supplier) =>
    [supplier.name, supplier.contact, supplier.email, supplier.address, supplier.status]
      .some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))
  ), [suppliers, search]);

  function updateRow(id, key, value) {
    const update = (item) => ({ ...item, [key]: value, dirty: true });
    if (id === "new") setNewRow((current) => update(current || emptySupplier()));
    else setSuppliers((current) => current.map((item) => item.id === id ? update(item) : item));
    setMessage("");
  }

  async function saveRow(supplier, isNew = false) {
    if (!String(supplier.name || "").trim()) {
      setError("Enter a supplier name before saving.");
      return;
    }
    const id = isNew ? "new" : supplier.id;
    setSavingId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(isNew ? "/api/suppliers" : `/api/suppliers/${supplier.id}`, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supplier.name, contact: supplier.contact, email: supplier.email, address: supplier.address,
          products: Number(supplier.products || 0), rating: Number(supplier.rating || 0), status: supplier.status || "Active",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Could not save supplier.");
      if (isNew) setNewRow(null);
      await loadSuppliers();
      setMessage(isNew ? "Supplier added." : "Supplier changes saved.");
      window.dispatchEvent(new Event("inventory:refresh-notifications"));
    } catch (err) {
      setError(err.message || "Could not save supplier.");
    } finally {
      setSavingId("");
    }
  }

  async function deleteRow(supplier) {
    if (!window.confirm(`Delete supplier “${supplier.name}”? This cannot be undone.`)) return;
    setSavingId(supplier.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE", credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Could not delete supplier.");
      setSuppliers((current) => current.filter((item) => item.id !== supplier.id));
      setMessage("Supplier deleted.");
    } catch (err) {
      setError(err.message || "Could not delete supplier.");
    } finally {
      setSavingId("");
    }
  }

  const activeCount = suppliers.filter((item) => item.status === "Active").length;
  const averageRating = suppliers.length ? (suppliers.reduce((sum, item) => sum + Number(item.rating || 0), 0) / suppliers.length).toFixed(1) : "0.0";
  const pendingCount = suppliers.filter((item) => item.status === "Pending").length;
  const totalProducts = suppliers.reduce((sum, item) => sum + Number(item.products || 0), 0);

  function renderRow(supplier, isNew = false) {
    const id = isNew ? "new" : supplier.id;
    return <tr key={id} className="align-top border-t border-slate-100 hover:bg-slate-50/70">
      <td className="min-w-52 px-3 py-3"><input className={inputClass} aria-label="Supplier name" placeholder="Supplier name" value={supplier.name || ""} onChange={(e) => updateRow(id, "name", e.target.value)} /><input className={`${inputClass} mt-2`} aria-label="Supplier address" placeholder="Address" value={supplier.address || ""} onChange={(e) => updateRow(id, "address", e.target.value)} /></td>
      <td className="min-w-44 px-3 py-3"><input className={inputClass} aria-label="Supplier phone" placeholder="Phone" value={supplier.contact || ""} onChange={(e) => updateRow(id, "contact", e.target.value)} /><input className={`${inputClass} mt-2`} aria-label="Supplier email" type="email" placeholder="Email" value={supplier.email || ""} onChange={(e) => updateRow(id, "email", e.target.value)} /></td>
      <td className="w-28 px-3 py-3"><input className={inputClass} aria-label="Product count" type="number" min="0" value={supplier.products ?? 0} onChange={(e) => updateRow(id, "products", e.target.value)} /></td>
      <td className="w-28 px-3 py-3"><div className="relative"><MdStar className="pointer-events-none absolute left-2 top-2.5 text-amber-500" /><input className={`${inputClass} pl-7`} aria-label="Supplier rating" type="number" min="0" max="5" step="0.1" value={supplier.rating ?? 0} onChange={(e) => updateRow(id, "rating", e.target.value)} /></div></td>
      <td className="w-36 px-3 py-3"><select className={inputClass} aria-label="Supplier status" value={supplier.status || "Active"} onChange={(e) => updateRow(id, "status", e.target.value)}><option>Active</option><option>Pending</option><option>Inactive</option></select></td>
      <td className="min-w-32 px-3 py-3"><div className="flex gap-2"><button type="button" onClick={() => saveRow(supplier, isNew)} disabled={savingId === id || (!isNew && !supplier.dirty)} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><MdSave />{savingId === id ? "Saving" : isNew ? "Add" : "Save"}</button>{!isNew ? <button type="button" onClick={() => deleteRow(supplier)} disabled={Boolean(savingId)} aria-label={`Delete ${supplier.name}`} className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><MdDeleteOutline /></button> : <button type="button" onClick={() => setNewRow(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>}</div></td>
    </tr>;
  }

  return <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Suppliers</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Supplier Directory</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Add, edit, and manage vendor details directly in the table—no separate form required.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3"><MdSearch className="text-xl text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search suppliers..." aria-label="Search suppliers" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none" /></div><button type="button" onClick={loadSuppliers} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><MdRefresh /> Refresh</button><button type="button" onClick={() => setNewRow(emptySupplier())} disabled={Boolean(newRow)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><MdAdd /> Add supplier</button></div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Suppliers" value={suppliers.length} helper="Saved suppliers" icon={MdLocalShipping} accent="bg-indigo-50 text-indigo-600" />
        <StatCard title="Active Partners" value={activeCount} helper="Currently active" icon={MdPhone} accent="bg-emerald-50 text-emerald-600" />
        <StatCard title="Average Rating" value={averageRating} helper="Out of 5 stars" icon={MdStar} accent="bg-amber-50 text-amber-600" />
        <StatCard title="Pending Review" value={pendingCount} helper={`${totalProducts} supplier-listed products`} icon={MdMailOutline} accent="bg-sky-50 text-sky-600" />
      </section>
      {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
      {message ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{message}</div> : null}
      <section className="rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold text-slate-900">Suppliers List</h2><p className="text-sm text-slate-500">Edit values inline and save each row.</p></div>
        <div className="overflow-x-auto"><table className="min-w-[1050px] w-full border-separate border-spacing-0"><thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-400"><th className="px-3 py-4">Supplier / Address</th><th className="px-3 py-4">Contact</th><th className="px-3 py-4">Products</th><th className="px-3 py-4">Rating</th><th className="px-3 py-4">Status</th><th className="px-3 py-4">Actions</th></tr></thead><tbody>
          {newRow ? renderRow(newRow, true) : null}
          {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">Loading suppliers…</td></tr> : filteredSuppliers.map((supplier) => renderRow(supplier))}
          {!loading && filteredSuppliers.length === 0 && !newRow ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">No suppliers yet. Select “Add supplier” to create the first one.</td></tr> : null}
        </tbody></table></div>
      </section>
    </div>
  </div>;
}
