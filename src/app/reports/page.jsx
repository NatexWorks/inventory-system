"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MdDownload,
  MdFileDownload,
  MdInsights,
  MdInventory2,
  MdPieChart,
  MdPrint,
  MdSearch,
  MdTrendingUp,
} from "react-icons/md";

const PERIODS = [
  { value: "day", label: "1 Day" },
  { value: "month", label: "1 Month" },
  { value: "quarter", label: "3 Months" },
  { value: "year", label: "1 Year" },
];
const REPORT_TYPES = [
  { value: "sales", label: "Sales Report", description: "Revenue and sales trend" },
  { value: "orders", label: "Orders Report", description: "Orders, statuses and totals" },
  { value: "inventory", label: "Inventory Report", description: "Stock, cost and selling value" },
  { value: "products", label: "Product Performance", description: "Units sold and product revenue" },
  { value: "categories", label: "Category Report", description: "Category-wise sales performance" },
];
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const compactCurrency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
});
const dateOnly = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
});

function money(value) { return compactCurrency.format(Number(value || 0)); }
function fullMoney(value) { return currency.format(Number(value || 0)); }
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateOnly.format(date);
}
function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
}
function safeFileName(value) {
  return String(value || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}
function csvCell(value) {
  const normalized = value === null || value === undefined ? "" : String(value);
  return '"' + normalized.replace(/"/g, '""') + '"';
}
function downloadCsv(fileName, headers, rows) {
  const csv = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
    .map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function buildChartPath(values, width, height, padding) {
  if (!values.length) return "";
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const spread = Math.max(1, maximum - minimum);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values.map((value, index) => {
    const x = padding + innerWidth * index / Math.max(1, values.length - 1);
    const y = padding + ((maximum - value) / spread) * innerHeight;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}
function StatCard({ title, value, helper, icon: Icon, accent }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 break-words text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>
        <div className={`rounded-2xl p-3 ${accent}`}><Icon className="text-2xl" /></div>
      </div>
    </div>
  );
}

function makeReportTable(type, data, search, threshold) {
  if (type === "sales") {
    const rows = (data?.salesTrend || []).map((item) => ({
      Period: item.label, Revenue: Number(item.revenue || 0), Orders: Number(item.orders || 0), "Units Sold": Number(item.unitsSold || 0),
    }));
    return { title: "Sales Report", subtitle: "Completed sales grouped by time bucket.", headers: ["Period", "Revenue", "Orders", "Units Sold"], rows };
  }
  if (type === "orders") {
    const rows = (data?.orders || []).map((item) => ({
      "Order Number": item.orderNumber, Customer: item.customerName, Phone: item.customerPhone,
      Date: formatDateTime(item.createdAt), Status: item.status, "Line Items": item.itemCount, Units: item.units,
      Subtotal: item.subtotal, Tax: item.tax, Discount: item.discount, Total: item.total,
    }));
    return { title: "Orders Report", subtitle: "All order statuses created within the selected period.", headers: ["Order Number", "Customer", "Phone", "Date", "Status", "Line Items", "Units", "Subtotal", "Tax", "Discount", "Total"], rows };
  }
  if (type === "inventory") {
    const rows = (data?.inventory || []).map((item) => ({
      Product: item.name, SKU: item.sku, Category: item.category, Stock: item.stock,
      "Unit Cost": item.costPrice, "Unit Selling Price": item.price,
      "Cost Value": item.costValue, "Retail Value": item.retailValue, "Stock Status": item.status,
      "Last Updated": formatDateTime(item.updatedAt),
    }));
    return { title: "Inventory Report", subtitle: "Current stock snapshot; the time range does not change current quantities.", headers: ["Product", "SKU", "Category", "Stock", "Unit Cost", "Unit Selling Price", "Cost Value", "Retail Value", "Stock Status", "Last Updated"], rows };
  }
  if (type === "products") {
    const rows = (data?.productPerformance || []).map((item) => ({
      Product: item.name, SKU: item.sku, Category: item.category, "Units Sold": item.unitsSold,
      Revenue: item.revenue, Orders: item.orders, "Current Stock": item.currentStock, "Unit Price": item.unitPrice,
    }));
    return { title: "Product Performance Report", subtitle: "Completed sales within the selected period, matched to current product stock.", headers: ["Product", "SKU", "Category", "Units Sold", "Revenue", "Orders", "Current Stock", "Unit Price"], rows };
  }
  const rows = (data?.categoryPerformance || [])
    .filter((item) => String(item.name || "").toLowerCase().includes(search.toLowerCase()))
    .map((item) => ({
      Category: item.name, "Products Sold": item.productCount, Orders: item.orders, "Units Sold": item.unitsSold, Revenue: item.revenue,
    }));
  return { title: "Category Report", subtitle: "Category-wise completed sales within the selected period.", headers: ["Category", "Products Sold", "Orders", "Units Sold", "Revenue"], rows };
}

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState("month");
  const [reportType, setReportType] = useState("sales");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadReport() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/reports?period=${encodeURIComponent(period)}`, {
          credentials: "include", cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || "Failed to load reports");
        if (active) setReport(payload?.data || null);
      } catch (err) {
        if (active) setError(err.message || "Failed to load reports");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReport();
    return () => { active = false; };
  }, [period]);

  const summary = report?.summary || null;
  const categories = report?.categories?.analytics || [];
  const data = report?.operationalReports || null;
  const selectedPeriod = PERIODS.find((item) => item.value === period) || PERIODS[1];
  const selectedReport = REPORT_TYPES.find((item) => item.value === reportType) || REPORT_TYPES[0];
  const table = useMemo(() => makeReportTable(reportType, data, search, summary?.lowStockThreshold ?? 5), [reportType, data, search, summary?.lowStockThreshold]);
  const allTimeFilteredCategories = categories.filter((item) => String(item.name || "").toLowerCase().includes(search.toLowerCase()));
  const buckets = data?.salesTrend || [];
  const values = buckets.map((item) => Number(item.revenue || 0));
  const chartWidth = 900;
  const chartHeight = 330;
  const padding = 38;
  const path = buildChartPath(values, chartWidth, chartHeight, padding);
  const chartMax = Math.max(1, ...values);
  const chartMin = Math.min(0, ...values);
  const chartSpread = Math.max(1, chartMax - chartMin);
  const chartPoints = values.map((value, index) => ({
    x: padding + (chartWidth - padding * 2) * index / Math.max(1, values.length - 1),
    y: padding + ((chartMax - value) / chartSpread) * (chartHeight - padding * 2),
    value,
    label: buckets[index]?.label || "",
  }));
  const revenue = buckets.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const orders = buckets.reduce((sum, item) => sum + Number(item.orders || 0), 0);
  const unitsSold = buckets.reduce((sum, item) => sum + Number(item.unitsSold || 0), 0);
  const averageOrderValue = orders ? revenue / orders : 0;

  function exportCsv() {
    if (!table.rows.length) {
      setError("There is no data in this report to export.");
      return;
    }
    const fileName = `${safeFileName(table.title)}-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(fileName, table.headers, table.rows);
    setExportMenuOpen(false);
    setError("");
  }

  function exportPdf() {
    if (!table.rows.length) {
      setError("There is no data in this report to export.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      setError("Allow pop-ups to export this report as PDF.");
      return;
    }
    const rows = table.rows.map((row) => `<tr>${table.headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`).join("");
    const isLandscape = table.headers.length > 6;
    const reportSummary = reportType === "sales"
      ? `<div class="summary"><span>Revenue: <b>${escapeHtml(fullMoney(revenue))}</b></span><span>Completed orders: <b>${orders}</b></span><span>Units sold: <b>${unitsSold}</b></span></div>`
      : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(table.title)}</title><style>
      @page{size:A4 ${isLandscape ? "landscape" : "portrait"};margin:12mm}
      *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;font-size:10px}
      header{border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:14px}h1{margin:0 0 7px;font-size:22px}p{margin:0;color:#64748b;font-size:11px;line-height:1.5}
      .meta{display:flex;gap:12px;justify-content:space-between;margin-top:10px;color:#64748b;font-size:10px}.summary{display:flex;gap:20px;margin:12px 0;padding:12px;background:#f1f5f9;border-radius:8px;font-size:11px}
      table{border-collapse:collapse;width:100%;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:7px 6px;text-align:left;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere}th{background:#eef2ff;font-size:9px;text-transform:uppercase;color:#3730a3}
      tbody tr:nth-child(even){background:#f8fafc}.footer{margin-top:14px;text-align:right;color:#64748b;font-size:9px}@media print{.no-print{display:none}}
      </style></head><body><header><h1>${escapeHtml(table.title)}</h1><p>${escapeHtml(table.subtitle)}</p><div class="meta"><span>Period: ${escapeHtml(data?.range?.label || selectedPeriod.label)}</span><span>Generated: ${escapeHtml(formatDateTime(new Date()))}</span></div></header>
      ${reportSummary}<table><thead><tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><div class="footer">Inventory System · ${table.rows.length} record(s)</div>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),200));</script></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setExportMenuOpen(false);
    setError("");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/85 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Business intelligence</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Reports Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">Analyze sales over time, inspect stock valuation, and export the report you need.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportCsv} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                <MdFileDownload className="text-lg" /> Export CSV
              </button>
              <button type="button" onClick={exportPdf} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">
                <MdPrint className="text-lg" /> Export PDF
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Sales period</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sales period">
                {PERIODS.map((item) => (
                  <button key={item.value} type="button" onClick={() => setPeriod(item.value)} aria-pressed={period === item.value}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${period === item.value ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:w-auto">
              <MdSearch className="text-xl text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
            </div>
          </div>
        </section>

        {error ? <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
        {loading ? <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">Loading {selectedPeriod.label.toLowerCase()} reports…</div> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Sales Revenue" value={money(revenue)} helper={data?.range?.label || selectedPeriod.label} icon={MdTrendingUp} accent="bg-indigo-50 text-indigo-600" />
          <StatCard title="Completed Orders" value={orders.toLocaleString("en-IN")} helper="Successful sales in this period" icon={MdInsights} accent="bg-sky-50 text-sky-600" />
          <StatCard title="Units Sold" value={unitsSold.toLocaleString("en-IN")} helper="Quantities on completed orders" icon={MdInventory2} accent="bg-emerald-50 text-emerald-600" />
          <StatCard title="Average Order Value" value={money(averageOrderValue)} helper="Revenue ÷ completed orders" icon={MdPieChart} accent="bg-amber-50 text-amber-600" />
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="text-xl font-bold text-slate-900">Sales Trend</h2><p className="mt-1 text-sm text-slate-500">{data?.range?.label || selectedPeriod.label} · completed orders only · Asia/Kolkata timezone</p></div>
            <div className="rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">{money(revenue)} total sales</div>
          </div>
          <div className="mt-5 rounded-3xl bg-gradient-to-b from-slate-50 to-white p-2 sm:p-4">
            {loading ? <div className="h-[320px] animate-pulse rounded-2xl bg-slate-100" /> : buckets.length === 0 ? <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">No sales data available for this period.</div> : (
              <>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Sales revenue graph for ${selectedPeriod.label}`} className="h-[260px] w-full sm:h-[320px]">
                  {[0, 1, 2, 3, 4].map((index) => {
                    const y = padding + ((chartHeight - padding * 2) / 4) * index;
                    const amount = chartMax - (chartSpread / 4) * index;
                    return <g key={index}><line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" /><text x={padding - 6} y={y - 6} textAnchor="end" fontSize="11" fill="#64748b">{amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : Math.round(amount)}</text></g>;
                  })}
                  {path ? <path d={`${path} L ${chartWidth - padding} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`} fill="rgba(99,102,241,0.12)" /> : null}
                  {path ? <path d={path} fill="none" stroke="#4f46e5" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" /> : null}
                  {chartPoints.map((point, index) => <circle key={buckets[index]?.key || index} cx={point.x} cy={point.y} r={values.length <= 31 ? 3.5 : 2} fill="#ffffff" stroke="#4f46e5" strokeWidth="2"><title>{point.label}: {fullMoney(point.value)} · {buckets[index]?.orders || 0} orders</title></circle>)}
                  {chartPoints.filter((_, index) => index === 0 || index === chartPoints.length - 1 || index % Math.max(1, Math.ceil(chartPoints.length / 8)) === 0).map((point, index) => <text key={`label-${point.label}-${index}`} x={point.x} y={chartHeight - 7} textAnchor="middle" fontSize="11" fill="#64748b">{point.label}</text>)}
                </svg>
                <div className="mt-2 flex flex-wrap gap-4 px-2 text-xs text-slate-500"><span>Each point shows revenue for that period.</span><span>CSV export downloads the underlying chart data.</span></div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Report library</p><h2 className="mt-2 text-xl font-bold text-slate-900">Choose a Report</h2><p className="mt-1 text-sm text-slate-500">Select any report below, then export it as CSV or PDF.</p></div>
            <div className="text-xs font-medium text-slate-500">Current scope: {selectedPeriod.label}</div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {REPORT_TYPES.map((item) => (
              <button key={item.value} type="button" onClick={() => setReportType(item.value)} aria-pressed={reportType === item.value}
                className={`rounded-2xl border p-4 text-left transition ${reportType === item.value ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}>
                <span className={`block text-sm font-bold ${reportType === item.value ? "text-indigo-700" : "text-slate-800"}`}>{item.label}</span>
                <span className="mt-2 block text-xs leading-relaxed text-slate-500">{item.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><h3 className="text-lg font-bold text-slate-900">{table.title}</h3><p className="mt-1 text-sm text-slate-500">{table.subtitle}</p></div>
            <p className="text-sm font-medium text-slate-500">{table.rows.length.toLocaleString("en-IN")} rows</p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50"><tr>{table.headers.map((header) => <th key={header} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {table.rows.length === 0 ? <tr><td colSpan={table.headers.length} className="px-4 py-8 text-center text-sm text-slate-500">No records for this report and period.</td></tr> : table.rows.slice(0, 100).map((row, index) => (
                  <tr key={`${reportType}-${index}`} className="text-sm text-slate-700 hover:bg-slate-50">
                    {table.headers.map((header) => {
                      const value = row[header];
                      const amountColumn = /Revenue|Value|Price|Cost|Subtotal|Tax|Discount|Total/.test(header);
                      return <td key={header} className="whitespace-nowrap px-4 py-3">{amountColumn && typeof value === "number" ? fullMoney(value) : value ?? "—"}</td>;
                    })}
                  </tr>
                ))}</tbody>
            </table>
          </div>
          {table.rows.length > 100 ? <p className="mt-3 text-xs text-slate-500">Showing the first 100 rows on screen. Exports include all {table.rows.length.toLocaleString("en-IN")} rows.</p> : null}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <h2 className="text-lg font-bold text-slate-900">Inventory Valuation</h2><p className="mt-1 text-sm text-slate-500">Current stock value at purchase cost and selling price.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Cost value</p><p className="mt-2 text-xl font-bold text-slate-900">{money(data?.summary?.inventoryCostValue || 0)}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Retail value</p><p className="mt-2 text-xl font-bold text-slate-900">{money(data?.summary?.inventoryRetailValue || 0)}</p></div>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Category Analytics</h2><p className="mt-1 text-sm text-slate-500">All-time category summary.</p></div><MdSearch className="text-xl text-slate-400" /></div>
            <div className="mt-4 space-y-3">
              {allTimeFilteredCategories.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No categories match your search.</div> : allTimeFilteredCategories.map((item) => (
                <div key={item.categoryId} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="min-w-0"><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.productCount} products</p></div><p className="shrink-0 text-sm font-semibold text-slate-800">{money(item.revenue || 0)}</p></div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
