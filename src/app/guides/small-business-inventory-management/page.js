import Link from "next/link";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";

export const metadata = {
  title: "Small Business Inventory Management Guide",
  description: "A practical inventory management guide for small businesses: organise SKUs, record stock movements, calculate reorder points and check stock accuracy.",
  alternates: { canonical: "/guides/small-business-inventory-management" },
  openGraph: {
    type: "article",
    url: SITE_URL + "/guides/small-business-inventory-management",
    siteName: "Inventory System",
    title: "Small Business Inventory Management Guide | Inventory System",
    description: "Learn a simple, repeatable process for product records, stock movement, reorder points and cycle counts.",
  },
};

export default function SmallBusinessInventoryGuide() {
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

      <article className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Practical business guide</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">Inventory management for small business: a practical guide</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Good inventory management is not just knowing how many items are on a shelf. It means keeping a reliable record of what you have, what changes the quantity and when you should review or replenish an item. This guide sets out a simple process a small retailer, trader or product-based business can adapt.
          </p>

          <div className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
            <h2 className="text-xl font-bold text-slate-950">The basic routine</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Create one clear record for every product and variant.",
                "Record receipts, sales, returns and adjustments consistently.",
                "Set a reorder point using demand and supplier lead time.",
                "Count selected items regularly and investigate differences.",
              ].map((item, index) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-700">{index + 1}</span>{item}</li>)}
            </ol>
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-950">1. Build a consistent product list</h2>
            <p className="mt-4 leading-8 text-slate-700">Start with a single product record for each item you actually stock. If size, colour, model or pack quantity changes the item you sell, give that variant its own SKU or identifier. Avoid creating several records with slightly different names for the same item.</p>
            <p className="mt-4 leading-8 text-slate-700">Useful fields usually include a product name, category, SKU, unit of measure, selling price, purchase cost and current quantity. Add a barcode when the product has one and keep supplier contact details available to the person responsible for replenishment. The exact fields depend on the way your business buys and sells stock.</p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-700"><tr><th className="px-4 py-3 font-semibold">Example SKU</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Variant</th><th className="px-4 py-3 font-semibold">Unit</th></tr></thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr><td className="px-4 py-3">TSH-BLK-M</td><td className="px-4 py-3">Cotton T-shirt</td><td className="px-4 py-3">Black, medium</td><td className="px-4 py-3">Piece</td></tr>
                  <tr><td className="px-4 py-3">TSH-BLK-L</td><td className="px-4 py-3">Cotton T-shirt</td><td className="px-4 py-3">Black, large</td><td className="px-4 py-3">Piece</td></tr>
                  <tr><td className="px-4 py-3">MUG-WHT-01</td><td className="px-4 py-3">Ceramic mug</td><td className="px-4 py-3">White, standard</td><td className="px-4 py-3">Piece</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">Illustrative identifiers only. Choose a format your team can apply consistently.</p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-950">2. Record every stock movement</h2>
            <p className="mt-4 leading-8 text-slate-700">A quantity is trustworthy only when the business can explain how it changed. Define a routine for recording opening stock, incoming purchases, sales or issues, customer returns, damaged goods and approved corrections. Decide who is responsible for each step and update the record close to the time the movement happens.</p>
            <p className="mt-4 leading-8 text-slate-700">For example, if a product has 40 units, receives 25 units and sells 12, the expected balance is 53 units before other adjustments. A physical count that shows 51 should trigger an investigation rather than an unexplained edit. Possible causes include a missed sale, an unrecorded return, damaged stock or a counting mistake.</p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-950">3. Calculate a practical reorder point</h2>
            <p className="mt-4 leading-8 text-slate-700">A reorder point is the stock level at which you should plan to replenish an item. A simple starting formula is:</p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reorder point</p>
              <p className="mt-2 text-xl font-bold text-slate-950">Average daily sales × Supplier lead time + Safety stock</p>
            </div>
            <p className="mt-5 leading-8 text-slate-700">Suppose you sell an average of 8 units a day, your supplier takes 5 days to deliver, and you choose a buffer of 10 units. Your starting reorder point is (8 × 5) + 10 = 50 units. When stock approaches 50, review the next order.</p>
            <p className="mt-4 leading-8 text-slate-700">This is a planning example, not a universal setting. Use your own sales history and actual delivery times. Products with unpredictable demand or unreliable suppliers may need a larger buffer. Revisit the calculation when demand or lead times change.</p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-950">4. Count stock regularly</h2>
            <p className="mt-4 leading-8 text-slate-700">Do not wait until the annual stocktake to discover that records have drifted. Use cycle counting: select a manageable group of items, count them physically, compare the result with the system and record the reason for each difference. Start with high-value items, fast-moving products or stock that has a history of mismatches.</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-700">
              <li>Freeze or record movements during the count so the comparison is fair.</li>
              <li>Recount unexpected differences before changing the record.</li>
              <li>Look for repeated causes, such as missed receipts or incorrect units.</li>
              <li>Adjust quantities only through an authorised, documented process.</li>
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-950">5. Use barcodes when they solve a real problem</h2>
            <p className="mt-4 leading-8 text-slate-700">For a shop with many similar-looking products, scanning a barcode can be faster and more consistent than searching by name. The scan must resolve to the exact product or variant. A wrong or duplicated code can be worse than manual lookup because it can silently select the wrong item.</p>
            <p className="mt-4 leading-8 text-slate-700">GS1 explains that a Global Trade Item Number (GTIN) is used to identify trade items and can be encoded in a barcode. A business-created SKU is an internal identifier; do not treat it as a GS1-issued GTIN. Check the identifier type and supplier information before relying on a label for retail trade-item identification.</p>
            <a href="https://www.gs1india.org/faq" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-600">GS1 India barcode FAQs</a>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-950">6. Choose inventory software around your real workflow</h2>
            <p className="mt-4 leading-8 text-slate-700">Before choosing inventory management software for a small business, write down what happens from the moment goods arrive until they are sold or used. Then test the important steps with sample products rather than choosing a tool only because it has a long feature list.</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-700">
              <li>Can the team create clear product and variant records?</li>
              <li>Can staff check quantities and spot low-stock items?</li>
              <li>Does barcode lookup work with the actual labels and devices?</li>
              <li>Can the team review orders and supplier contact information?</li>
              <li>Are required purchase, returns, accounting, GST or multi-location features genuinely included?</li>
              <li>Can you export or back up records and control who can change them?</li>
            </ul>
            <p className="mt-4 leading-8 text-slate-700">Inventory System currently provides a product catalogue, stock quantity visibility, low-stock review, supplier records, reporting screens and barcode-assisted product lookup in its POS workflow. It does not claim every advanced feature in the checklist. Verify the fit before moving your live records.</p>
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
              <h3 className="text-xl font-bold text-slate-950">See the workflow in Inventory System</h3>
              <p className="mt-2 leading-7 text-slate-700">Explore the product and stock features, then compare them with the process your business needs.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href="/features" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Explore inventory features</Link>
                <Link href="/barcode-inventory-management" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">See barcode workflow</Link>
              </div>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-950">Small business inventory management FAQs</h2>
            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 px-5">
              <details className="py-5">
                <summary className="cursor-pointer font-semibold text-slate-900">What is the easiest way to start tracking inventory?</summary>
                <p className="mt-3 leading-7 text-slate-600">Create a clean product list, count the opening quantity, choose one person responsible for recording each movement and schedule regular physical checks.</p>
              </details>
              <details className="py-5">
                <summary className="cursor-pointer font-semibold text-slate-900">How do I calculate a reorder level?</summary>
                <p className="mt-3 leading-7 text-slate-600">A common starting point is average daily sales multiplied by supplier lead time, plus safety stock. Use real sales and delivery data for each product.</p>
              </details>
              <details className="py-5">
                <summary className="cursor-pointer font-semibold text-slate-900">Are SKUs and barcodes the same thing?</summary>
                <p className="mt-3 leading-7 text-slate-600">No. A SKU is an identifier a business uses for its own stock records. A barcode is a machine-readable way to carry an identifier or other data. A GS1 GTIN is a standardised trade-item identifier that can be encoded in a barcode.</p>
              </details>
              <details className="py-5">
                <summary className="cursor-pointer font-semibold text-slate-900">How often should a small business count stock?</summary>
                <p className="mt-3 leading-7 text-slate-600">There is no single schedule for every business. Count high-value, fast-moving or frequently mismatched items more often, and set a routine that your team can follow consistently.</p>
              </details>
            </div>
          </section>

          <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-7 text-slate-500">
            Further reading: <a href="https://help.shopify.com/en/manual/inventory-and-locations/fundamentals/understanding-inventory-management" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">Shopify's overview of inventory management methods</a> and <a href="https://quickbooks.intuit.com/r/operations-technology/inventory-management-tips/" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">QuickBooks' guidance on reorder points and cycle counts</a>.
          </p>
        </div>
      </article>

      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500 sm:px-8">
        <Link href="/" className="font-semibold text-slate-700 hover:text-indigo-700">Inventory System</Link> · Practical stock management resources
      </footer>
    </main>
  );
}
