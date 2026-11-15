import Link from "next/link";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";

export const metadata = {
  title: "Inventory Management Features",
  description: "Explore product catalogue, stock visibility, barcode-assisted order workflows, supplier records and reporting features in Inventory System.",
  alternates: { canonical: "/features" },
  openGraph: {
    type: "website",
    url: SITE_URL + "/features",
    siteName: "Inventory System",
    title: "Inventory Management Features | Stock and Barcode Tracking",
    description: "Explore product catalogue, stock visibility, barcode-assisted order workflows, supplier records and reporting features in Inventory System.",
  },
};

const featureGroups = [
  {
    title: "Product catalogue and stock records",
    description: "Create and maintain product records with names, categories, selling prices, cost prices, stock quantities, SKUs, descriptions and optional barcodes. A consistent catalogue gives your team one place to check the details attached to each item.",
    points: ["Product names and categories", "Selling price and cost price fields", "SKU, description and optional barcode records"],
  },
  {
    title: "Stock visibility and low-stock review",
    description: "Use the inventory workspace to review product quantities and identify items that need attention. Low-stock visibility helps make replenishment review part of the regular stock-control routine instead of relying on memory or disconnected spreadsheets.",
    points: ["Product-level stock quantities", "Low-stock visibility", "A central place to review inventory records"],
  },
  {
    title: "Barcode-assisted product lookup",
    description: "The point-of-sale workflow supports camera-based scanning in compatible browsers and manual barcode entry. A matching product can be added to a draft bill, which helps reduce repeated product searches while preparing an order.",
    points: ["Camera scanning where the browser supports it", "Manual barcode entry as a fallback", "Support for common one-dimensional barcode formats"],
  },
  {
    title: "Order preparation and approval",
    description: "Prepare a draft bill by selecting products or scanning their barcodes. The current POS workflow keeps the draft separate from approved stock movement: inventory is deducted only after the order is approved.",
    points: ["Draft cart for selected products", "Quantity and available-stock checks", "Stock deduction after approval"],
  },
  {
    title: "Supplier directory",
    description: "Keep supplier names, phone numbers, email addresses and addresses alongside product operations. Supplier records also include product counts, ratings and status fields so the directory can support routine supplier review.",
    points: ["Supplier contact details", "Product counts and supplier status", "Searchable supplier records"],
  },
  {
    title: "Reports and operational overview",
    description: "Review order and sales activity through the dashboard and reporting screens. Bringing reporting close to product and stock records makes it easier to move from checking an item to reviewing the activity around it.",
    points: ["Dashboard overview", "Order activity", "Inventory and sales reporting screens"],
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Main navigation">
          <Link href="/" className="text-lg font-bold tracking-tight">Inventory<span className="text-indigo-600">System</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Home</Link>
            <Link href="/barcode-inventory-management" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Barcode workflow</Link>
            <Link href="/login?next=%2Fdashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Log in</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Get started</Link>
          </div>
        </nav>
      </header>

      <section className="bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.14),_transparent_45%),linear-gradient(to_bottom,_#f8faff,_white)] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Product features</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">Inventory management features for everyday stock control</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Inventory System is a browser-based inventory management application for organising product records, checking stock levels, preparing orders and reviewing supplier information. Its feature set focuses on the practical steps teams use to keep stock information clear and accessible.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white hover:bg-indigo-700">Create a workspace</Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-50">Back to overview</Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Manage the main parts of your inventory workflow</h2>
            <p className="mt-4 leading-7 text-slate-600">The following features are based on the current application screens and workflows.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {featureGroups.map((feature, index) => (
              <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Feature {index + 1}</p>
                <h2 className="mt-3 text-xl font-bold text-slate-950">{feature.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  {feature.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Questions about stock and inventory management</h2>
          <div className="mt-7 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Can I add barcodes to product records?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">Yes. Product records can include optional barcode values. The POS workflow can look up a product from a scanned or manually entered barcode.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Which barcode formats are supported?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">The camera scanner is configured for common one-dimensional formats including EAN-13, EAN-8, UPC-A and Code 128. Actual camera support also depends on the browser and device.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Does creating a draft bill reduce stock?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">No. In the current POS approval workflow, stock is deducted only after the order is approved.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Can I store supplier contact details?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">Yes. The supplier directory includes supplier name, contact, email, address, product count, rating and status fields.</p>
            </details>
          </div>
          <div className="mt-8 rounded-2xl border border-indigo-100 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">Explore the Inventory System workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Start with a product catalogue, review stock levels and use the order workflow to prepare and approve bills.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Create an account</Link>
              <Link href="/login?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Open login</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 text-center sm:flex-row sm:justify-center sm:gap-8">
          <Link href="/barcode-inventory-management" className="font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-600">Barcode inventory management workflow</Link>
          <Link href="/guides/small-business-inventory-management" className="font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-600">Small business inventory management guide</Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500 sm:px-8">
        <Link href="/" className="font-semibold text-slate-700 hover:text-indigo-700">Inventory System</Link> · Product and stock management
      </footer>
    </main>
  );
}
