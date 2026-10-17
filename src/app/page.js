import Link from "next/link";
import { FaArrowRight, FaBoxesStacked, FaChartLine, FaClipboardCheck, FaMagnifyingGlassChart, FaShieldHalved, FaTriangleExclamation } from "react-icons/fa6";

const features = [
  {
    icon: FaBoxesStacked,
    title: "Product & stock tracking",
    description: "Keep product details, categories and stock quantities organised in one workspace.",
  },
  {
    icon: FaTriangleExclamation,
    title: "Low-stock visibility",
    description: "Spot items that need attention sooner and make replenishment decisions with more confidence.",
  },
  {
    icon: FaChartLine,
    title: "Sales & order overview",
    description: "Review order activity and sales trends from a single, easy-to-scan dashboard.",
  },
  {
    icon: FaClipboardCheck,
    title: "Everyday operations",
    description: "Bring products, suppliers and order workflows together instead of juggling scattered records.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="relative z-10 border-b border-slate-200/80 bg-white/90">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3" aria-label="Inventory System home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <FaBoxesStacked className="text-lg" />
            </span>
            <span className="text-lg font-bold tracking-tight">Inventory<span className="text-indigo-600">System</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login?next=%2Fdashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-4">Log in</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700">Get started <span aria-hidden="true">→</span></Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.16),_transparent_45%),linear-gradient(to_bottom,_#f8faff,_white)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3.5 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inventory control, made clearer
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Inventory management that keeps your business <span className="text-indigo-600">in control.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Track products, monitor stock levels, review orders and understand sales activity from one straightforward inventory management dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?next=%2Fdashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700">
                Start managing inventory <FaArrowRight />
              </Link>
              <Link href="/login?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50">
                Open your workspace
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2"><FaShieldHalved className="text-emerald-600" /> Account-based workspace</span>
              <span className="inline-flex items-center gap-2"><FaMagnifyingGlassChart className="text-indigo-600" /> Clear operational overview</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-indigo-200/40 blur-2xl" />
            <div className="relative rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/50 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Workspace preview</p>
                  <h2 className="mt-1 text-lg font-bold">Inventory overview</h2>
                </div>
                <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><FaChartLine /></span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Products</p>
                  <div className="mt-2 text-2xl font-bold">Organised</div>
                  <p className="mt-1 text-xs text-slate-500">One product catalogue</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-sm text-indigo-700">Stock health</p>
                  <div className="mt-2 text-2xl font-bold text-indigo-950">At a glance</div>
                  <p className="mt-1 text-xs text-indigo-700">Find items to review</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Stay on top of operations</p>
                    <p className="mt-1 text-sm text-slate-500">Products, orders and suppliers in one place.</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FaClipboardCheck /></span>
                </div>
                <div className="mt-5 space-y-3" aria-hidden="true">
                  <div className="h-2.5 w-full rounded-full bg-slate-100"><div className="h-2.5 w-[82%] rounded-full bg-indigo-500" /></div>
                  <div className="h-2.5 w-4/5 rounded-full bg-slate-100"><div className="h-2.5 w-[64%] rounded-full bg-emerald-400" /></div>
                  <div className="h-2.5 w-3/5 rounded-full bg-slate-100"><div className="h-2.5 w-[48%] rounded-full bg-violet-300" /></div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">Illustrative preview · Sign in to view your own workspace</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/80">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Built for everyday clarity</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The essentials of stock management, together.</h2>
            <p className="mt-4 leading-7 text-slate-600">Spend less time searching through scattered records and more time understanding what is happening across your inventory.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600"><Icon /></span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8 sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Bring your inventory into focus.</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">Sign in to manage your workspace or create an account to get started with product and stock management.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup?next=%2Fdashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition hover:bg-indigo-700">Create an account <FaArrowRight /></Link>
          <Link href="/login?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50">Log in</Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} Inventory System</span>
          <span>Product and stock management for clearer day-to-day operations.</span>
        </div>
      </footer>
    </main>
  );
}
