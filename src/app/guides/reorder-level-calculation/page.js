import Link from "next/link";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";
const schema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Reorder Level Calculation: Formula, Safety Stock and Example",
  description: "Learn the reorder point formula, calculate lead-time demand and safety stock, and avoid confusing when to order with how much to order.",
  mainEntityOfPage: SITE_URL + "/guides/reorder-level-calculation",
  datePublished: "2026-11-15",
  dateModified: "2026-11-15",
  author: { "@type": "Organization", name: "Inventory System" },
  publisher: { "@type": "Organization", name: "Inventory System", url: SITE_URL }
};

export const metadata = {
  title: "Reorder Level Calculation: Formula and Example",
  description: "Calculate a reorder point using average daily demand, supplier lead time and safety stock. Includes a worked small-business example.",
  alternates: { canonical: "/guides/reorder-level-calculation" },
  openGraph: {
    type: "article",
    url: SITE_URL + "/guides/reorder-level-calculation",
    siteName: "Inventory System",
    title: "Reorder Level Calculation: Formula and Example | Inventory System",
    description: "A practical guide to reorder points, lead time and safety stock for small businesses."
  }
};

export default function ReorderLevelGuide() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b border-slate-200">
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Inventory planning guide</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Reorder level calculation: formula, safety stock and a worked example</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">A reorder level, often called a reorder point, is the stock position at which a business should start replenishing an item. It is a timing signal: it estimates the quantity needed to cover expected demand while a supplier order is on the way, plus any buffer the business chooses to hold.</p>
          <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Basic reorder point formula</p>
            <p className="mt-2 text-2xl font-bold leading-9 text-slate-950">Reorder point = (Average daily demand × Lead time in days) + Safety stock</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">Use the same unit of measure for demand and safety stock. If daily demand is measured in pieces, the result is also in pieces.</p>
          </div>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">1. Understand the three inputs</h2>
            <h3 className="mt-6 text-lg font-bold">Average daily demand</h3>
            <p className="mt-2 leading-8 text-slate-700">Estimate how many units you sell or consume per day over a representative period. Do not use one unusually busy day as the average. For seasonal items, compare a period that reflects the current selling season or adjust the estimate when demand changes.</p>
            <h3 className="mt-6 text-lg font-bold">Supplier lead time</h3>
            <p className="mt-2 leading-8 text-slate-700">Measure the time from placing the order until the goods are received, checked and available for use or sale. If delivery is five days but receiving and inspection take another day, the usable lead time is closer to six days.</p>
            <h3 className="mt-6 text-lg font-bold">Safety stock</h3>
            <p className="mt-2 leading-8 text-slate-700">Safety stock is a buffer for unexpected demand or delivery variation. It is a business decision: a larger buffer can reduce stockout risk, but it also ties up cash and storage capacity. Choose it using actual demand variability, supplier reliability, item importance and the cost of running out.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">2. Work through an example</h2>
            <p className="mt-4 leading-8 text-slate-700">Suppose a shop sells an average of 8 units per day. Its supplier usually takes 5 days to deliver, and the owner chooses a safety-stock buffer of 10 units.</p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-200">
                  <tr><th className="px-4 py-3 font-semibold text-slate-700">Average daily demand</th><td className="px-4 py-3 text-slate-600">8 units</td></tr>
                  <tr><th className="px-4 py-3 font-semibold text-slate-700">Supplier lead time</th><td className="px-4 py-3 text-slate-600">5 days</td></tr>
                  <tr><th className="px-4 py-3 font-semibold text-slate-700">Demand during lead time</th><td className="px-4 py-3 text-slate-600">8 × 5 = 40 units</td></tr>
                  <tr><th className="px-4 py-3 font-semibold text-slate-700">Safety stock</th><td className="px-4 py-3 text-slate-600">10 units</td></tr>
                  <tr className="bg-indigo-50/60"><th className="px-4 py-3 font-bold text-slate-950">Reorder point</th><td className="px-4 py-3 font-bold text-indigo-700">40 + 10 = 50 units</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 leading-8 text-slate-700">In this example, the shop should review replenishment when its stock position approaches 50 units. The number is only as useful as the demand and delivery assumptions behind it. Recalculate it when sales patterns or supplier lead times change.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">3. Reorder point is not the order quantity</h2>
            <p className="mt-4 leading-8 text-slate-700">The reorder point answers <em>when</em> to order. It does not automatically tell you <em>how much</em> to buy. Order quantity depends on supplier pack sizes, minimum order quantities, cash flow, storage capacity, expected demand and the cost of placing an order. Keep the two decisions separate.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">4. Common mistakes to avoid</h2>
            <ul className="mt-5 list-disc space-y-3 pl-6 leading-8 text-slate-700">
              <li>Using calendar days in one input and working days in another without checking the actual delivery pattern.</li>
              <li>Ignoring the time needed to receive, inspect or label goods after delivery.</li>
              <li>Copying the same safety stock to every product even when sales and supply risks differ.</li>
              <li>Using an old average after demand, promotions or supplier reliability have changed.</li>
              <li>Ordering again based only on physical stock while ignoring open purchase orders or reserved quantities.</li>
            </ul>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">5. Build a repeatable replenishment routine</h2>
            <p className="mt-4 leading-8 text-slate-700">Start with fast-moving and important products. Estimate demand from recent sales, record actual supplier lead times, choose a reasonable buffer and review the numbers on a regular schedule. When an order arrives, compare the actual delivery date and quantity with the assumptions used in the calculation.</p>
            <p className="mt-4 leading-8 text-slate-700">Inventory System can help teams review product records, stock quantities and low-stock items. The current app does not claim to calculate statistical safety stock or automatically place purchase orders, so keep the replenishment decision with the person responsible for buying.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/features" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Explore inventory features</Link>
              <Link href="/guides/stock-register-format" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Get the stock register template</Link>
            </div>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">Reorder point FAQs</h2>
            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 px-5">
              <details className="py-5"><summary className="cursor-pointer font-semibold">Can the reorder point be zero?</summary><p className="mt-3 leading-7 text-slate-600">It can be zero in a deliberately make-to-order or no-buffer process, but that can increase the risk of waiting for supply. Check whether the business can tolerate the resulting lead time.</p></details>
              <details className="py-5"><summary className="cursor-pointer font-semibold">Should I include safety stock?</summary><p className="mt-3 leading-7 text-slate-600">Consider it when demand or supplier lead time varies. The appropriate buffer depends on the business&apos;s stockout risk and holding costs; there is no universal number.</p></details>
              <details className="py-5"><summary className="cursor-pointer font-semibold">How often should I review reorder levels?</summary><p className="mt-3 leading-7 text-slate-600">Review them when sales patterns or delivery performance change, and set a regular review interval that fits how quickly the product moves.</p></details>
            </div>
          </section>
          <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-7 text-slate-500">Further reading: <a href="https://www.shopify.com/blog/reorder-point" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">Shopify&apos;s reorder point guide</a>, <a href="https://docs.oracle.com/cd/A60725_05/html/comnls/us/inv/roplan.htm" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">Oracle Inventory reorder point planning</a> and <a href="https://egyankosh.ac.in/bitstream/123456789/118541/1/Block-3.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">IGNOU reorder point calculation notes</a>.</p>
        </div>
      </article>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-sm text-slate-500 sm:px-8"><Link href="/" className="font-semibold text-slate-700 hover:text-indigo-700">Inventory System</Link> · Practical stock management resources</footer>
    </main>
  );
}
