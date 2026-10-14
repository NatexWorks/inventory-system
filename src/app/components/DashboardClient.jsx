"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FaArrowTrendUp,
  FaBox,
  FaBell,
  FaChartLine,
  FaCircleCheck,
  FaDollarSign,
  FaEye,
  FaLayerGroup,
  FaMinus,
  FaPlus,
  FaCartShopping,
  FaTriangleExclamation,
  FaUserClock,
  FaWarehouse,
} from "react-icons/fa6";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const INDIA_TIME_ZONE = "Asia/Kolkata";
const dashboardDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: INDIA_TIME_ZONE,
});
const dashboardDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: INDIA_TIME_ZONE,
});

// Formats numeric values as INR so dashboard totals stay consistent.
function money(value) {
  return currency.format(Number(value || 0));
}

// Small status label used for orders and inventory state.
function StatusPill({ status }) {
  const styles = {
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
    DRAFT: "bg-sky-50 text-sky-700 border-sky-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    "In Stock": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Low Stock": "bg-amber-50 text-amber-700 border-amber-200",
    "Out of Stock": "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
      {status}
    </span>
  );
}

// Reusable metric tile for the top summary cards.
function MetricCard({ title, value, change, trend, icon: Icon, accent }) {
  const isPositive = String(change || "").startsWith("+");

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl bg-linear-to-br p-3 ${accent}`}>
          <Icon className="text-xl" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1 font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
          <FaArrowTrendUp className={isPositive ? "" : "rotate-180"} />
          {change}
        </span>
        <span className="text-slate-400">{trend}</span>
      </div>
    </div>
  );
}

// Turns a list of numbers into a smooth SVG path for the sales chart.
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

// Line chart panel that shows recent order totals over time.
function SalesChart({ values, labels, title, subtitle }) {
  const width = 720;
  const height = 280;
  const padding = 28;
  const series = values.length ? values : [0];
  const path = buildChartPath(series, width, height, padding);
  const area = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const max = Math.max(...series) * 1.15;
  const min = Math.min(...series) * 0.85;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
          Live Data
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_160px]">
        <div className="overflow-hidden rounded-2xl bg-linear-to-b from-slate-50 to-white p-3">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[65vh] w-full">
            {[0, 1, 2, 3].map((index) => {
              const y = padding + ((height - padding * 2) / 3) * index;
              return <line key={index} x1="0" y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
            })}
            <path d={area} fill="url(#salesArea)" opacity="0.9" />
            <path d={path} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
            {series.map((value, index) => {
              const x = padding + ((width - padding * 2) / Math.max(1, series.length - 1)) * index;
              const y = padding + ((max - value) / Math.max(1, max - min)) * (height - padding * 2);
              return <circle key={index} cx={x} cy={y} r="4.5" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />;
            })}
            <defs>
              <linearGradient id="salesArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.03" />
              </linearGradient>
            </defs>
          </svg>

          <div className="-mt-2 grid grid-cols-1 gap-2 px-2 text-[11px] text-slate-500 sm:grid-cols-3 xl:grid-cols-6">
            {labels.map((label) => (
              <span key={label} className="wrap-safe whitespace-normal text-center leading-tight">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-500">This month</div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{money(series.reduce((sum, item) => sum + Number(item || 0), 0))}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Orders</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{series.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg. Order Value</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{money(series.reduce((sum, item) => sum + Number(item || 0), 0) / Math.max(1, series.length))}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FaCircleCheck className="text-emerald-500" />
              Peak activity
            </div>
            <p className="mt-2 text-sm text-slate-500">Your latest order data and totals are now coming from the backend.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Donut chart that visualizes top categories.
function DonutChart({ categories }) {
  const size = 220;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const values = categories.length ? categories : [{ name: "No data", value: 100, color: "#94a3b8" }];

  const segments = values.reduce(
    (acc, segment) => {
      const dash = (segment.value / 100) * circumference;
      const start = acc.offset;
      acc.items.push({ ...segment, dash, start });
      acc.offset += dash;
      return acc;
    },
    { items: [], offset: 0 }
  ).items;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <h3 className="text-lg font-semibold text-slate-900">Top Categories</h3>
      <p className="mt-1 text-sm text-slate-500">Share of category performance from live backend data.</p>

      <div className="mt-5 flex items-center gap-5">
        <div className="relative mx-auto flex h-[55vh] w-[55vw] items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
            {segments.map((segment) => (
              <circle
                key={segment.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                strokeDashoffset={-segment.start}
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <p className="text-sm font-medium text-slate-500">Inventory</p>
            <p className="text-3xl font-semibold text-slate-900">100%</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {values.map((segment) => (
            <div key={segment.name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="text-sm font-medium text-slate-700">{segment.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{segment.value.toFixed(0)}%</span>
            </div>
          ))}
          <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
            Categories are computed from your live catalog.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  // `summary` and `categories` hold live backend dashboard data.
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Loads both the current user session and the dashboard payload together.
  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [meResponse, dashboardResponse] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard", { credentials: "include", cache: "no-store" }),
        ]);

        if (!dashboardResponse.ok) {
          throw new Error("Failed to load dashboard");
        }

        const mePayload = meResponse.ok ? await meResponse.json() : null;
        const dashboardPayload = await dashboardResponse.json();

        if (!active) {
          return;
        }

        setUser(mePayload?.data?.user || null);
        setSummary(dashboardPayload?.data?.summary || null);
        setCategories(dashboardPayload?.data?.categories?.analytics || []);
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load dashboard");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const metricCards = useMemo(() => {
    const totalProducts = Number(summary?.totalProducts || 0);
    const lowStock = Number(summary?.lowStockProducts || 0);
    const totalOrders = Number(summary?.totalSales || 0);
    const revenue = Number(summary?.totalRevenue || 0);

    return [
      {
        title: "Total Products",
        value: totalProducts.toString(),
        change: totalProducts ? "+ live" : "0",
        trend: "from backend catalog",
        icon: FaBox,
        accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-600",
      },
      {
        title: "Low Stock Items",
        value: lowStock.toString(),
        change: lowStock ? "- watch" : "0",
        trend: "needs restocking",
        icon: FaTriangleExclamation,
        accent: "from-amber-500/15 to-amber-500/5 text-amber-600",
      },
      {
        title: "Total Orders",
        value: totalOrders.toString(),
        change: totalOrders ? "+ active" : "0",
        trend: "completed sales",
        icon: FaCartShopping,
        accent: "from-sky-500/15 to-sky-500/5 text-sky-600",
      },
      {
        title: "Total Revenue",
        value: money(revenue),
        change: revenue ? "+ live" : "0",
        trend: "completed orders",
        icon: FaDollarSign,
        accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
      },
      {
        title: "Inventory Value",
        value: money(summary?.inventoryValue || 0),
        change: Number(summary?.inventoryValue || 0) ? "+ live" : "0",
        trend: "stock at cost price",
        icon: FaLayerGroup,
        accent: "from-violet-500/15 to-violet-500/5 text-violet-600",
      },
    ];
  }, [summary]);

  const orderRows = summary?.recentOrders || [];
  const lowStockItems = summary?.lowStockItems || [];
  const topProducts = summary?.topProducts || [];

  const chartValues = orderRows.map((order) => Number(order.totalAmount || 0));
  const chartLabels = orderRows.map((order) => order.orderNumber || "Order");

  const categoryBreakdown = useMemo(() => {
    const items = categories.slice(0, 3);
    const total = items.reduce((sum, item) => sum + Number(item.revenue || item.productCount || 0), 0) || 1;

    return items.map((item, index) => ({
      name: item.name,
      value: ((Number(item.revenue || item.productCount || 0) / total) * 100) || 0,
      color: ["#4f46e5", "#f59e0b", "#10b981"][index % 3],
    }));
  }, [categories]);

  const displayName = user?.name || "there";
  const today = dashboardDateFormatter.format(new Date());

  if (loading && !summary) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="space-y-5 rounded-[30px] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_35%,#f7f9fc_100%)] p-5">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-visible rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              <FaWarehouse className="text-xs" />
              Inventory SaaS dashboard
            </div>
            <h1 className="wrap-safe mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900">
              Welcome back, {displayName}.
            </h1>
            <p className="wrap-safe mt-2 max-w-2xl text-sm text-slate-500">
              Here is a live view of your sales, stock movement, and critical alerts for {today}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="wrap-safe text-xs font-medium uppercase tracking-wide text-slate-400">Today</p>
              <p className="wrap-safe mt-1 text-sm font-semibold leading-tight text-slate-900">{today}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="wrap-safe text-xs font-medium uppercase tracking-wide text-slate-400">Orders</p>
              <p className="wrap-safe mt-1 text-sm font-semibold leading-tight text-slate-900">{summary?.totalSales || 0} completed</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="wrap-safe text-xs font-medium uppercase tracking-wide text-slate-400">Alerts</p>
              <p className="wrap-safe mt-1 text-sm font-semibold leading-tight text-rose-600">{summary?.lowStockProducts || 0} low stock</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
        <SalesChart
          values={chartValues}
          labels={chartLabels}
          title="Sales Overview"
          subtitle="Recent completed orders pulled from the backend."
        />
        <DonutChart categories={categoryBreakdown} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="wrap-safe text-lg font-semibold leading-tight text-slate-900">Recent Orders</h3>
              <p className="wrap-safe mt-1 text-sm text-slate-500">Latest purchases from customers.</p>
            </div>
            <button type="button" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              View all
            </button>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orderRows.map((order) => (
                  <tr key={order._id} className="text-sm text-slate-700">
                    <td className="wrap-safe px-4 py-3 font-medium leading-tight text-slate-900">{order.orderNumber}</td>
                    <td className="wrap-safe px-4 py-3 leading-tight">{order.customerName}</td>
                    <td className="wrap-safe px-4 py-3 leading-tight">{dashboardDateTimeFormatter.format(new Date(order.createdAt))}</td>
                    <td className="wrap-safe px-4 py-3 font-medium leading-tight text-slate-900">{money(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <h3 className="wrap-safe text-lg font-semibold leading-tight text-slate-900">Low Stock Alert</h3>
          <p className="wrap-safe mt-1 text-sm text-slate-500">
            {summary?.lowStockAlertsEnabled === false
              ? "Low-stock alerts are disabled in Settings."
              : `Items at or below your threshold of ${summary?.lowStockThreshold ?? 5} units.`}
          </p>

          <div className="mt-5 space-y-3">
            {summary?.lowStockAlertsEnabled === false ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Turn on Low Stock Alerts in Settings to show these alerts.
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No low stock items right now.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="wrap-safe font-medium leading-tight text-slate-900">{item.name}</p>
                      <p className="wrap-safe mt-1 text-sm leading-tight text-slate-500">SKU {item.sku || "N/A"}</p>
                    </div>
                    <StatusPill status={item.stock <= 3 ? "Out of Stock" : "Low Stock"} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Remaining stock</span>
                    <span className="font-semibold text-slate-900">{item.stock}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
          <h3 className="wrap-safe text-lg font-semibold leading-tight text-slate-900">Top Products</h3>
          <p className="wrap-safe mt-1 text-sm text-slate-500">Fast movers on the catalog.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FaEye />
              <span>Updated just now</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {topProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No products yet.
              </div>
            ) : (
              topProducts.map((product) => (
                <div key={product._id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="wrap-safe font-medium leading-tight text-slate-900">{product.name}</p>
                    <p className="wrap-safe mt-1 text-sm leading-tight text-slate-500">Stock {product.stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{money(product.price)}</p>
                    <p className="mt-1 text-sm font-medium text-emerald-600">
                      Inventory value {money(Number(product.price || 0) * Number(product.stock || 0))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <h3 className="wrap-safe text-lg font-semibold leading-tight text-slate-900">Quick Actions</h3>
          <p className="wrap-safe mt-1 text-sm text-slate-500">Common actions for inventory management.</p>

          <div className="mt-5 grid gap-3">
            {[
              { label: "Add Product", icon: FaPlus, color: "bg-indigo-50 text-indigo-700", href: "/addProducts" },
              { label: "Run Reorder Check", icon: FaLayerGroup, color: "bg-sky-50 text-sky-700", href: "/categories" },
              { label: "Review Alerts", icon: FaBell, color: "bg-amber-50 text-amber-700", href: "/reports" },
              { label: "Export Summary", icon: FaChartLine, color: "bg-emerald-50 text-emerald-700", href: "/reports" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-3">
                  <span className={`rounded-xl p-2 ${action.color}`}>
                    <action.icon />
                  </span>
                  <span className="wrap-safe font-medium leading-tight text-slate-900">{action.label}</span>
                </span>
                <FaMinus className="text-slate-300" />
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FaUserClock className="text-indigo-600" />
              Team activity
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {summary?.lowStockProducts || 0} items are below threshold and {summary?.totalSales || 0} orders are completed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
