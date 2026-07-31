"use client";

import { MdLocalShipping, MdMailOutline, MdPhone, MdSearch, MdStar } from "react-icons/md";

// Static supplier data keeps this page simple until a live backend is connected.
const suppliers = [
  { name: "Tech World Distributors", contact: "+91 98765 43210", email: "sales@techworld.com", products: 25, rating: 4.9, status: "Active" },
  { name: "Global Electronics Co.", contact: "+91 98123 45678", email: "orders@globalelec.com", products: 18, rating: 4.7, status: "Active" },
  { name: "Office Furnish Hub", contact: "+91 98987 65432", email: "support@officefurnish.com", products: 12, rating: 4.5, status: "Pending" },
  { name: "AccessPoint Supplies", contact: "+91 90000 11223", email: "hello@accesspoint.com", products: 30, rating: 4.8, status: "Active" },
];

// Reusable summary tile for supplier metrics.
function StatCard({ title, value, helper, icon: Icon, accent }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>
          <Icon className="text-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  // This screen is mostly presentational, so the metrics are computed inline.
  const stats = [
    { title: "Suppliers", value: "24", helper: "Active partners", icon: MdLocalShipping, accent: "bg-indigo-50 text-indigo-600" },
    { title: "Avg Rating", value: "4.8", helper: "Across vendor list", icon: MdStar, accent: "bg-amber-50 text-amber-600" },
    { title: "Pending Review", value: "3", helper: "Awaiting approval", icon: MdMailOutline, accent: "bg-sky-50 text-sky-600" },
    { title: "Purchase Orders", value: "61", helper: "Linked to suppliers", icon: MdPhone, accent: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Suppliers</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Supplier Directory</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Keep track of vendor contacts, fulfillment strength, and sourcing reliability.
              </p>
            </div>

            <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-auto">
              <MdSearch className="text-xl text-slate-400" />
              <input
                placeholder="Search suppliers..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Suppliers List</h2>
              <p className="text-sm text-slate-500">Vendors and sourcing partners.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                  <th className="px-5 py-4 font-semibold">Supplier</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Products</th>
                  <th className="px-5 py-4 font-semibold">Rating</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.name} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{supplier.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{supplier.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{supplier.contact}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{supplier.products}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{supplier.rating}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${supplier.status === "Active" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"}`}>
                        {supplier.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
