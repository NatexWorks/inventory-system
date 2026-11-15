import Link from "next/link";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";
const schema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Stock Register Format for Small Business: Free Template and Examples",
  description: "A practical stock register format for small businesses, with opening balance, stock in, stock out, returns, adjustments and physical-count checks.",
  mainEntityOfPage: SITE_URL + "/guides/stock-register-format",
  datePublished: "2026-11-15",
  dateModified: "2026-11-15",
  author: { "@type": "Organization", name: "Inventory System" },
  publisher: { "@type": "Organization", name: "Inventory System", url: SITE_URL }
};

export const metadata = {
  title: "Stock Register Format for Small Business",
  description: "Download a free stock register template and learn how to record opening stock, receipts, sales, returns, adjustments and physical counts.",
  alternates: { canonical: "/guides/stock-register-format" },
  openGraph: {
    type: "article",
    url: SITE_URL + "/guides/stock-register-format",
    siteName: "Inventory System",
    title: "Stock Register Format for Small Business | Free Template",
    description: "A clear stock register format with a worked example and downloadable CSV template."
  }
};

export default function StockRegisterGuide() {
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Free practical template</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Stock register format for small business: a simple template that stays useful</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">A stock register records how a product quantity changes over time. Instead of writing down only the closing balance, it records the opening quantity, goods received, items sold or issued, returns and authorised adjustments. That movement history makes it easier to explain why the number on a shelf differs from the number in a spreadsheet or inventory system.</p>
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-bold text-slate-950">Download the sample stock register</h2><p className="mt-1 text-sm leading-6 text-slate-600">A plain CSV file you can open in Excel, Google Sheets or another spreadsheet app.</p></div>
            <a href="/templates/stock-register-template.csv" download className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Download CSV template</a>
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">1. What should a stock register contain?</h2>
            <p className="mt-4 leading-8 text-slate-700">Keep one consistent row for each stock movement. The fields below are a useful starting point; adapt them to the units and approval process used in your business.</p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-700"><tr><th className="px-4 py-3">Field</th><th className="px-4 py-3">What it records</th><th className="px-4 py-3">Example</th></tr></thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr><td className="px-4 py-3 font-semibold text-slate-900">Date and reference</td><td className="px-4 py-3">When the movement happened and its supporting document.</td><td className="px-4 py-3">15 Nov · Sale #1042</td></tr>
                  <tr><td className="px-4 py-3 font-semibold text-slate-900">SKU and product</td><td className="px-4 py-3">The exact product or variant being tracked.</td><td className="px-4 py-3">TSH-BLK-M · Black T-shirt, M</td></tr>
                  <tr><td className="px-4 py-3 font-semibold text-slate-900">Opening quantity</td><td className="px-4 py-3">The verified balance before this movement.</td><td className="px-4 py-3">24 pieces</td></tr>
                  <tr><td className="px-4 py-3 font-semibold text-slate-900">Stock in</td><td className="px-4 py-3">Purchases or other accepted receipts.</td><td className="px-4 py-3">12 pieces</td></tr>
                  <tr><td className="px-4 py-3 font-semibold text-slate-900">Stock out</td><td className="px-4 py-3">Sales, issues, samples or other authorised outgoing stock.</td><td className="px-4 py-3">5 pieces</td></tr>
                  <tr><td className="px-4 py-3 font-semibold text-slate-900">Returns and adjustments</td><td className="px-4 py-3">Customer returns accepted back into stock, damage or documented corrections.</td><td className="px-4 py-3">+1 return</td></tr>
                  <tr><td className="px-4 py-3 font-semibold text-slate-900">Closing and physical count</td><td className="px-4 py-3">Expected balance and the quantity actually counted.</td><td className="px-4 py-3">32 expected · 31 counted</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">2. Use a consistent closing-stock formula</h2>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Basic quantity formula</p>
              <p className="mt-2 text-xl font-bold leading-8 text-slate-950">Closing stock = Opening stock + Stock in − Stock out + Net adjustments</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Only add a customer return to sellable stock after the returned item has been checked and accepted. Record damaged, expired or unsellable goods separately instead of treating every return as available stock.</p>
            </div>
            <p className="mt-5 leading-8 text-slate-700">Example: you start with 24 pieces, receive 12, sell 5 and accept 1 good customer return. The expected balance is 24 + 12 − 5 + 1 = 32 pieces. If a physical count finds 31, record the difference and investigate it before making an adjustment.</p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">3. How to maintain the register day to day</h2>
            <ol className="mt-5 list-decimal space-y-3 pl-6 leading-8 text-slate-700">
              <li><strong>Give each product variant a unique identifier.</strong> Different sizes, colours or pack sizes should not silently share the same stock record.</li>
              <li><strong>Record movements close to the event.</strong> Use a purchase reference for receipts and a bill, issue slip or other traceable reference for outgoing stock.</li>
              <li><strong>Separate physical quantity from available quantity.</strong> Keep damaged, reserved or quarantined goods identifiable if your workflow needs those distinctions.</li>
              <li><strong>Restrict corrections.</strong> A change to a balance should include a reason, date and the person who approved it.</li>
              <li><strong>Count selected items regularly.</strong> Prioritise fast-moving, high-value or frequently mismatched products.</li>
            </ol>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">4. What to do when the physical count does not match</h2>
            <p className="mt-4 leading-8 text-slate-700">Do not overwrite the expected balance simply to make the two numbers match. Recount the item, check the unit of measure and review movements since the last verified count. Common causes include an unrecorded receipt, an order that was drafted but not approved, a return that was not inspected, damaged goods or a duplicate entry.</p>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
              <h3 className="font-bold text-slate-950">Example discrepancy log</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">Expected: 32 pieces · Physical count: 31 · Difference: −1 · Action: recount, check the last day's bills and goods-received notes, then approve a documented adjustment only after the cause is understood.</p>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">5. When should a spreadsheet become inventory software?</h2>
            <p className="mt-4 leading-8 text-slate-700">A spreadsheet can work for a small catalogue and a single person maintaining it. As more staff, orders, product variants or stock movements are added, consistent references and access controls become harder to maintain manually. Inventory software can make product lookup, quantity visibility and order workflows easier to coordinate, but check that the exact functions you need are included before migrating live records.</p>
            <p className="mt-4 leading-8 text-slate-700">Inventory System currently provides product records, stock visibility, low-stock review, supplier details, reporting screens and barcode-assisted lookup in its POS workflow. The app's current public features do not claim a built-in printable stock-register export or automatic ABC analysis.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/features" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Explore inventory features</Link>
              <Link href="/guides/small-business-inventory-management" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Read the small business guide</Link>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">Stock register format FAQs</h2>
            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 px-5">
              <details className="py-5"><summary className="cursor-pointer font-semibold">What is the difference between a stock register and a stock summary?</summary><p className="mt-3 leading-7 text-slate-600">A stock summary shows a balance at a point in time. A stock register records the movements and references that explain how the balance changed.</p></details>
              <details className="py-5"><summary className="cursor-pointer font-semibold">Should customer returns be added back immediately?</summary><p className="mt-3 leading-7 text-slate-600">Not automatically. Inspect the item first. Only goods accepted back into sellable inventory should increase the sellable quantity; damaged or quarantined returns should be recorded separately.</p></details>
              <details className="py-5"><summary className="cursor-pointer font-semibold">How often should I update the stock register?</summary><p className="mt-3 leading-7 text-slate-600">Record a movement as close as possible to when it happens. Delayed entries make it harder to find the cause of a mismatch.</p></details>
            </div>
          </section>
          <nav aria-label="Related inventory guides" className="mt-12 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold">More inventory guides</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/guides/reorder-level-calculation" className="rounded-xl border border-slate-200 p-4 font-semibold text-indigo-700 hover:bg-slate-50">Reorder level and safety stock</Link>
              <Link href="/guides/abc-analysis-inventory-management" className="rounded-xl border border-slate-200 p-4 font-semibold text-indigo-700 hover:bg-slate-50">ABC analysis for inventory</Link>
            </div>
          </nav>
          <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-7 text-slate-500">Further reading: <a href="https://www.npcindia.gov.in/NPC/Files/Publication/Other%20Publications/Inventory-Control-MG8.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">National Productivity Council: Techniques of Inventory Control</a>.</p>
        </div>
      </article>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-sm text-slate-500 sm:px-8"><Link href="/" className="font-semibold text-slate-700 hover:text-indigo-700">Inventory System</Link> · Practical stock management resources</footer>
    </main>
  );
}
