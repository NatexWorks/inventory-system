"use client";

import { useEffect, useMemo, useState } from "react";
import { MdDownload, MdInsights, MdInventory2, MdPieChart, MdSearch, MdTrendingUp } from "react-icons/md";

// Summary tile used across the reports dashboard.
function StatCard({ title, value, change, helper, icon: Icon, accent }) {
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
      <div className="mt-4 text-sm font-semibold text-emerald-600">{change}</div>
    </div>
  );
}

// Turns numeric values into a line path for the revenue chart.
function buildChartPath(values, width, height, padding) {
  const max = Math.max(...values) * 1.15;
  const min = Math.min(...values) * 0.85;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (innerWidth / Math.max(1, values.length - 1)) * index;
      const y = padding + ((max - value) / Math.max(1, max - min)) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

// Shared INR formatter for report metrics.
function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ReportsPage() {
  // Report data is fetched once, then filtered locally by the search box.
  const [report, setReport] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the full report payload from the backend when the page mounts.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/reports", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load reports");
        }

        if (active) {
          setReport(payload?.data || null);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load reports");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, []);

  const summary = report?.summary || null;
  const analytics = report?.categories?.analytics || [];

  const cards = useMemo(
    () => [
      {
        title: "Sales Revenue",
        value: money(summary?.totalRevenue || 0),
        change: `${summary?.totalRevenue ? "+ live" : "0"} revenue`,
        helper: "Completed orders",
        icon: MdTrendingUp,
        accent: "bg-indigo-50 text-indigo-600",
      },
      {
        title: "Orders",
        value: String(summary?.totalSales || 0),
        change: `${summary?.totalSales ? "+ live" : "0"} orders`,
        helper: "Compared to your DB",
        icon: MdInsights,
        accent: "bg-sky-50 text-sky-600",
      },
      {
        title: "Products Sold",
        value: String(summary?.totalProducts || 0),
        change: `${summary?.totalProducts ? "+ live" : "0"} products`,
        helper: "Across catalog",
        icon: MdInventory2,
        accent: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "Top Category",
        value: summary?.topCategory || "N/A",
        change: "backend driven",
        helper: "Best performing group",
        icon: MdPieChart,
        accent: "bg-amber-50 text-amber-600",
      },
    ],
    [
      summary?.totalRevenue,
      summary?.totalSales,
      summary?.totalProducts,
      summary?.topCategory,
    ]
  );

  // Category search only filters the already loaded analytics data.
  const filteredCategories = analytics.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  const series = (summary?.recentOrders || []).map((order) => Number(order.totalAmount || 0));
  const width = 760;
  const height = 320;
  const padding = 30;
  const path = series.length ? buildChartPath(series, width, height, padding) : "";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Reports</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Reports Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Review business performance, inventory movement, and sales trends from a single view.
              </p>
            </div>

            <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-auto">
              <MdSearch className="text-xl text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Revenue Trend</h2>
                <p className="text-sm text-slate-500">Recent completed orders from the backend.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                <MdDownload className="text-lg" />
                Export
              </button>
            </div>

            <div className="mt-5 rounded-3xl bg-gradient-to-b from-slate-50 to-white p-4">
              {loading ? (
                <div className="h-[320px] animate-pulse rounded-3xl bg-slate-100" />
              ) : (
                <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
                  {[0, 1, 2, 3].map((index) => {
                    const y = padding + ((height - padding * 2) / 3) * index;
                    return <line key={index} x1="0" y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
                  })}
                  {path ? <path d={`${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`} fill="rgba(99,102,241,0.12)" /> : null}
                  {path ? <path d={path} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /> : null}
                </svg>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">Category Analytics</h2>
            <p className="text-sm text-slate-500">Live top category breakdown.</p>

            <div className="mt-5 space-y-3">
              {filteredCategories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No categories match your search.
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.categoryId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{category.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {category.productCount} products | {money(category.revenue || 0)} revenue
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
