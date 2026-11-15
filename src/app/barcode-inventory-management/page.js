import Link from "next/link";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";

export const metadata = {
  title: "Barcode Inventory Management Software",
  description: "See how barcode-assisted inventory lookup works in Inventory System, including supported 1D formats, manual entry and POS order approval.",
  alternates: { canonical: "/barcode-inventory-management" },
  openGraph: {
    type: "website",
    url: SITE_URL + "/barcode-inventory-management",
    siteName: "Inventory System",
    title: "Barcode Inventory Management Software | Inventory System",
    description: "Understand barcode product lookup, supported formats and the order workflow in Inventory System.",
  },
};

const formats = ["EAN-13", "EAN-8", "UPC-A", "Code 128"];

export default function BarcodeInventoryPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Main navigation">
          <Link href="/" className="text-lg font-bold tracking-tight">Inventory<span className="text-indigo-600">System</span></Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Home</Link>
            <Link href="/features" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Features</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Get started</Link>
          </div>
        </nav>
      </header>

      <section className="bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.14),_transparent_45%),linear-gradient(to_bottom,_#f8faff,_white)] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Barcode-assisted stock lookup</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">Barcode inventory management software for a clearer checkout workflow</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            A barcode is useful when it connects a physical item to the correct product record. Inventory System lets you save optional barcode values on product records, look up matching products with a compatible device camera or manual entry, and add them to a draft point-of-sale bill.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup?next=%2Fdashboard" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white hover:bg-indigo-700">Create a workspace</Link>
            <Link href="/features" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-50">View all features</Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">How barcode inventory lookup works</h2>
            <p className="mt-4 leading-7 text-slate-600">The barcode identifies a product record. The stock and order workflow then uses that record, rather than treating the barcode itself as an inventory quantity.</p>
          </div>
          <ol className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["1. Create the product record", "Add the product name, category, SKU, prices, quantity and its barcode value when one is available."],
              ["2. Open the POS workflow", "Use the camera scanner in a compatible browser, or enter the barcode manually when camera access is unavailable."],
              ["3. Review the matched item", "The matching product can be added to a draft bill. Check the product and quantity before approving the order."],
              ["4. Approve the order", "A draft does not reduce stock. In the current workflow, stock is deducted after the order is approved."],
            ].map(([title, description]) => (
              <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-14 sm:px-8 sm:py-18">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Supported barcode formats</h2>
            <p className="mt-4 leading-7 text-slate-600">The camera-scanning workflow is configured for these common one-dimensional barcode formats:</p>
            <ul className="mt-5 flex flex-wrap gap-3">
              {formats.map((format) => <li key={format} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">{format}</li>)}
            </ul>
            <p className="mt-5 text-sm leading-7 text-slate-600">Actual camera scanning depends on browser support, device permissions, camera focus and barcode print quality. Manual barcode entry is available as a fallback.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">Set up product barcodes carefully</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-600">
              <li>Assign the correct code to the exact product and variant you sell.</li>
              <li>Do not reuse one barcode for different products or pack sizes.</li>
              <li>Test a scan against the product record before using it at checkout.</li>
              <li>Keep a manual lookup route available for damaged labels or camera issues.</li>
            </ul>
            <p className="mt-5 text-sm leading-7 text-slate-600">For retail trade-item identification, GS1 explains how GTINs identify products and how they are carried in barcode formats. An internal SKU and a GS1-issued GTIN are not interchangeable by default.</p>
            <a href="https://www.gs1india.org/faq" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-600">Read GS1 India barcode guidance</a>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-18">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">What this barcode workflow does, and what it does not claim</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
              <h3 className="font-bold text-slate-950">Available in the current app</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                <li>Optional barcode values on product records</li>
                <li>Camera-based lookup for supported 1D formats</li>
                <li>Manual barcode entry as a fallback</li>
                <li>Matched products added to a draft POS bill</li>
                <li>Stock deduction after order approval</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="font-bold text-slate-950">Not advertised as included</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                <li>Barcode label design or printing</li>
                <li>Issuing official GS1 product identifiers</li>
                <li>2D QR or Data Matrix scanning</li>
                <li>Batch, serial-number or expiry-date tracking</li>
                <li>Multi-warehouse stock transfers</li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600">Check the workflow against your device, product labels and stock process before relying on it for daily operations.</p>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-14 sm:px-8 sm:py-18">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Barcode inventory management FAQs</h2>
          <div className="mt-7 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Can I use a phone camera to scan a product?</summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">The POS workflow supports camera-based scanning in compatible browsers. Camera permissions, focus and device support affect whether scanning works. Manual entry is available as a fallback.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Which barcode formats are supported?</summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">The configured one-dimensional formats include EAN-13, EAN-8, UPC-A and Code 128.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Does scanning a product immediately deduct stock?</summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">No. Scanning adds a matching product to a draft bill. Stock is deducted only after the order is approved.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-semibold text-slate-900">Can the app print barcode labels?</summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">Barcode label design and printing are not part of the workflow described here. The app stores barcode values on product records and uses them for product lookup.</p>
            </details>
          </div>
          <div className="mt-8 rounded-2xl border border-indigo-100 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">Explore the wider inventory workflow</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">See how product records, stock visibility, supplier details and order approval fit together.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/features" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Explore features</Link>
              <Link href="/guides/small-business-inventory-management" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Read the small business guide</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500 sm:px-8">
        <Link href="/" className="font-semibold text-slate-700 hover:text-indigo-700">Inventory System</Link> · Barcode-assisted product lookup
      </footer>
    </main>
  );
}
