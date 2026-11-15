import Link from "next/link";
import ScrollReveal from "./components/ScrollReveal";
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
    <main className="home-page min-h-screen overflow-hidden bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Inventory System",
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Inventory management software",
            operatingSystem: "Web",
            url: "https://inventory-system-mu-puce.vercel.app/",
            description: "A browser-based inventory and stock management application for product records, stock visibility, barcode-assisted order workflows, suppliers and reports.",
            featureList: [
              "Product catalogue and stock quantity tracking",
              "Low-stock visibility",
              "Barcode scanning and product lookup",
              "Order and point-of-sale draft workflows",
              "Supplier directory",
              "Inventory and sales reports"
            ]
          }).replace(/</g, "\\u003c"),
        }}
      />
      <header className="landing-header relative z-10 border-b border-slate-200/80 bg-white/90">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Main navigation">
          <Link href="/" className="group flex items-center gap-3" aria-label="Inventory System">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-transform duration-200 group-hover:scale-105">
              <FaBoxesStacked className="text-lg" />
            </span>
            <span className="text-lg font-bold tracking-tight">Inventory<span className="text-indigo-600">System</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/features" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100">Features</Link>
            <Link href="/login?next=%2Fdashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100 active:scale-[0.98] sm:px-4">Log in</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg active:translate-y-0 active:scale-[0.98] sm:focus-visible:outline-none sm:focus-visible:ring-2 sm:focus-visible:ring-indigo-400">Get started <span aria-hidden="true">→</span></Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate">
        <div className="landing-hero-backdrop pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.16),_transparent_45%),linear-gradient(to_bottom,_#f8faff,_white)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <div className="landing-enter landing-delay-1 mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3.5 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inventory control, made clearer
            </div>
            <h1 className="landing-enter landing-delay-2 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Inventory management that keeps your business <span className="text-indigo-600">in control.</span>
            </h1>
            <p className="landing-enter landing-delay-3 mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Track products, monitor stock levels, review orders and understand sales activity from one straightforward inventory management dashboard.
            </p>
            <div className="landing-enter landing-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?next=%2Fdashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl active:translate-y-0 active:scale-[0.98]">
                Start managing inventory <FaArrowRight />
              </Link>
              <Link href="/login?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50 active:scale-[0.98]">
                Open your workspace
              </Link>
            </div>
            <div className="landing-enter landing-delay-5 mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2"><FaShieldHalved className="text-emerald-600" /> Account-based workspace</span>
              <span className="inline-flex items-center gap-2"><FaMagnifyingGlassChart className="text-indigo-600" /> Clear operational overview</span>
            </div>
          </div>

          <div className="landing-preview-enter relative mx-auto w-full max-w-xl">
            <div className="landing-glow-drift absolute -inset-5 rounded-[2rem] bg-indigo-200/40 blur-2xl" />
            <div className="landing-preview-card relative rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/50 transition-shadow duration-300 hover:shadow-indigo-200/50 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Workspace preview</p>
                  <h2 className="mt-1 text-lg font-bold">Inventory overview</h2>
                </div>
                <span className="landing-icon-bob rounded-xl bg-indigo-50 p-3 text-indigo-600"><FaChartLine /></span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="landing-preview-tile landing-preview-tile-1 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Products</p>
                  <div className="mt-2 text-2xl font-bold">Organised</div>
                  <p className="mt-1 text-xs text-slate-500">One product catalogue</p>
                </div>
                <div className="landing-preview-tile landing-preview-tile-2 rounded-2xl bg-indigo-50 p-4">
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
                  <div className="h-2.5 w-full rounded-full bg-slate-100"><div className="landing-progress-fill landing-progress-fill-1 h-2.5 w-[82%] rounded-full bg-indigo-500" /></div>
                  <div className="h-2.5 w-4/5 rounded-full bg-slate-100"><div className="landing-progress-fill landing-progress-fill-2 h-2.5 w-[64%] rounded-full bg-emerald-400" /></div>
                  <div className="h-2.5 w-3/5 rounded-full bg-slate-100"><div className="landing-progress-fill landing-progress-fill-3 h-2.5 w-[48%] rounded-full bg-violet-300" /></div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">Illustrative preview · Sign in to view your own workspace</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/80">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Built for everyday clarity</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The essentials of stock management, together.</h2>
            <p className="mt-4 leading-7 text-slate-600">Spend less time searching through scattered records and more time understanding what is happening across your inventory.</p>
          </ScrollReveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }, index) => (
              <ScrollReveal key={title} delay={index * 80}>
                <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/60">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600 transition-transform duration-200 group-hover:scale-110"><Icon /></span>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">A clearer stock workflow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From product records to order review, in one place.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Inventory System brings the everyday steps of stock control into one browser-based workspace. Keep product information organised, see which items need attention, and review order activity without switching between scattered records.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">1. Build a product catalogue</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Create product records with names, categories, prices, cost prices, stock quantities, SKUs, descriptions and optional barcodes. Keep the key details used by your day-to-day stock workflow together.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">2. Review stock levels</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Check product quantities and spot low-stock items that need a closer look. A clear stock overview helps you decide what to review before an item runs out.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">3. Find products with barcode scans</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use a supported device camera or enter a barcode manually in the point-of-sale workflow. The matching product can be added to a draft bill for review.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">4. Review orders and suppliers</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Keep supplier contact records and order activity accessible alongside your product catalogue. In the POS approval workflow, stock is deducted after an order is approved.</p>
            </article>
          </div>
          <div className="mt-8 text-center">
            <Link href="/features" className="inline-flex items-center gap-2 font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-600">
              Explore inventory management features <FaArrowRight />
            </Link>
            <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
              <Link href="/barcode-inventory-management" className="font-semibold text-slate-600 underline underline-offset-4 hover:text-indigo-700">Barcode inventory management</Link>
              <Link href="/guides/small-business-inventory-management" className="font-semibold text-slate-600 underline underline-offset-4 hover:text-indigo-700">Small business inventory guide</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50/80 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Common questions</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Inventory management software FAQs</h2>
          </div>
          <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">What can I manage with Inventory System?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">You can organise product records, review stock quantities, identify low-stock items, maintain supplier details, prepare orders with barcode-assisted product lookup and review inventory activity.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Does the system support barcode scanning?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">Yes. The point-of-sale workflow supports camera-based barcode scanning in compatible browsers and manual barcode entry. Scanned products can be added to a draft bill.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">When is stock deducted from an order?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">The current POS workflow prepares a draft bill for approval. Stock is deducted only after the order is approved.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Can I manage supplier information?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">The supplier directory stores supplier names, contact details, email addresses, addresses, product counts, ratings and status fields.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:px-8 sm:py-20">
        <ScrollReveal className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Bring your inventory into focus.</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">Sign in to manage your workspace or create an account to get started with product and stock management.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup?next=%2Fdashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 active:scale-[0.98]">Create an account <FaArrowRight /></Link>
            <Link href="/login?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3.5 font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">Log in</Link>
          </div>
        </ScrollReveal>
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
