import Link from "next/link";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";
const pageUrl = SITE_URL + "/guides/inventory-turnover-ratio";
const schema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Inventory Turnover Ratio: Formula, Example and How to Improve It",
  description: "Understand inventory turnover, calculate the ratio using cost of goods sold and average inventory, and interpret the result for a small business.",
  mainEntityOfPage: pageUrl,
  datePublished: "2026-11-15",
  dateModified: "2026-11-15",
  author: { "@type": "Organization", name: "Inventory System" },
  publisher: { "@type": "Organization", name: "Inventory System", url: SITE_URL }
};

export const metadata = {
  title: "Inventory Turnover Ratio: Formula and Example",
  description: "Learn the inventory turnover ratio formula, see a worked example, and understand how small businesses can use turnover to review stock performance.",
  alternates: { canonical: "/guides/inventory-turnover-ratio" },
  openGraph: { type: "article", url: pageUrl, siteName: "Inventory System", title: "Inventory Turnover Ratio: Formula and Example", description: "A practical guide to calculating and interpreting inventory turnover." }
};

export default function InventoryTurnoverGuide() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Main navigation">
          <Link href="/" className="text-lg font-bold tracking-tight">Inventory<span className="text-indigo-600">System</span></Link>
          <div className="flex items-center gap-3"><Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Home</Link><Link href="/features" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Features</Link><Link href="/signup?next=%2Fdashboard" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Get started</Link></div>
        </nav>
      </header>
      <article className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Inventory performance guide</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Inventory turnover ratio: formula, example and how to improve it</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">Inventory turnover measures how often a business sells and replaces its stock during a period. It is useful for spotting slow-moving products, reviewing purchasing decisions and understanding whether too much cash is tied up in inventory. The ratio is a signal to investigate, not a score that should be maximised without considering customer demand and availability.</p>
          <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Standard formula</p>
            <p className="mt-2 text-2xl font-bold leading-9 text-slate-950">Inventory turnover = Cost of goods sold ÷ Average inventory</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">Use cost values for both parts of the formula, and use the same accounting period.</p>
          </div>
          <section className="mt-12"><h2 className="text-2xl font-bold">1. How to calculate inventory turnover</h2><p className="mt-4 leading-8 text-slate-700">First, find the cost of goods sold (COGS) for the period. Then calculate average inventory by adding the opening and closing inventory values and dividing by two. Divide COGS by average inventory. If stock levels change sharply during the year, use monthly or quarterly inventory balances to calculate a more representative average instead of relying only on two dates.</p><p className="mt-4 leading-8 text-slate-700"><strong>Average inventory = (Opening inventory value + Closing inventory value) ÷ 2.</strong> The inventory values should be measured at cost, not at retail selling price.</p></section>
          <section className="mt-12"><h2 className="text-2xl font-bold">2. Worked example</h2><p className="mt-4 leading-8 text-slate-700">Suppose a retailer records annual COGS of ₹12,00,000. Its opening inventory at cost was ₹2,00,000 and its closing inventory at cost was ₹4,00,000.</p><div className="mt-5 rounded-2xl border border-slate-200 p-6"><p className="font-semibold">Average inventory = (₹2,00,000 + ₹4,00,000) ÷ 2 = ₹3,00,000</p><p className="mt-3 font-semibold">Turnover = ₹12,00,000 ÷ ₹3,00,000 = 4 times per year</p></div><p className="mt-4 leading-8 text-slate-700">This means the business sold and replaced an amount of inventory equal to its average inventory value about four times during the year. It does not mean every individual product turned over exactly four times.</p></section>
          <section className="mt-12"><h2 className="text-2xl font-bold">3. What is a good inventory turnover ratio?</h2><p className="mt-4 leading-8 text-slate-700">There is no universal ideal ratio. Grocery products, fashion, electronics, spare parts and industrial supplies have different demand patterns, shelf lives, margins and supplier lead times. Compare the ratio with your own previous periods and with businesses that have a similar product mix. A rising ratio can indicate stronger sales or leaner stock, but it can also warn that replenishment is too tight and stockouts are increasing.</p></section>
          <section className="mt-12"><h2 className="text-2xl font-bold">4. Practical ways to improve stock turnover</h2><ul className="mt-5 list-disc space-y-3 pl-6 leading-8 text-slate-700"><li>Identify slow-moving products and review their sales history before placing another order.</li><li>Use reorder points based on demand during supplier lead time and an appropriate safety buffer.</li><li>Review product mix, pricing and promotions without discounting items below a sensible margin.</li><li>Keep stock records accurate so reports reflect physical quantities.</li><li>Separate seasonal demand from normal demand when comparing periods.</li><li>Monitor availability as well as turnover; a high ratio is not useful if customers regularly find products out of stock.</li></ul></section>
          <section className="mt-12"><h2 className="text-2xl font-bold">5. Turnover ratio vs. days inventory outstanding</h2><p className="mt-4 leading-8 text-slate-700">Days inventory outstanding (DIO) estimates the average number of days inventory remains before it is sold. A simple approximation is 365 divided by annual inventory turnover. With a turnover of four times per year, DIO is about 91 days. Use the same period basis when comparing the two measures.</p></section>
          <section className="mt-12"><h2 className="text-2xl font-bold">Frequently asked questions</h2><div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 px-5"><details className="py-5"><summary className="cursor-pointer font-semibold">Should I use sales or cost of goods sold?</summary><p className="mt-3 text-sm leading-7 text-slate-600">Use cost of goods sold divided by average inventory measured at cost. Mixing sales revenue with inventory cost can distort the ratio.</p></details><details className="py-5"><summary className="cursor-pointer font-semibold">Can a high turnover ratio be bad?</summary><p className="mt-3 text-sm leading-7 text-slate-600">Yes. If stock is too lean, frequent stockouts, emergency purchases and lost sales can outweigh the benefit of holding less inventory.</p></details><details className="py-5"><summary className="cursor-pointer font-semibold">How often should I calculate it?</summary><p className="mt-3 text-sm leading-7 text-slate-600">Many businesses review it monthly or quarterly and compare like-for-like periods, especially when demand is seasonal.</p></details></div></section>
          <section className="mt-12 rounded-2xl bg-slate-50 p-6"><h2 className="text-xl font-bold">Keep product and stock records organised</h2><p className="mt-3 leading-7 text-slate-600">Inventory System provides a workspace for product records, stock visibility, barcode-assisted lookup and order activity. Explore the <Link className="font-semibold text-indigo-700 underline" href="/features">inventory management features</Link>, or read the <Link className="font-semibold text-indigo-700 underline" href="/guides/reorder-level-calculation">reorder level calculation guide</Link>.</p></section>
        </div>
      </article>
    </main>
  );
}
