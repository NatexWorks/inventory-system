import Link from "next/link";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";
const schema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "ABC Analysis in Inventory Management: How to Classify A, B and C Items",
  description: "Learn ABC inventory analysis using annual consumption value, cumulative percentages and different review controls for A, B and C items.",
  mainEntityOfPage: SITE_URL + "/guides/abc-analysis-inventory-management",
  datePublished: "2026-11-15",
  dateModified: "2026-11-15",
  author: { "@type": "Organization", name: "Inventory System" },
  publisher: { "@type": "Organization", name: "Inventory System", url: SITE_URL }
};

export const metadata = {
  title: "ABC Analysis in Inventory Management",
  description: "Learn how ABC analysis groups inventory by annual consumption value so small businesses can focus control effort on their most important stock.",
  alternates: { canonical: "/guides/abc-analysis-inventory-management" },
  openGraph: {
    type: "article",
    url: SITE_URL + "/guides/abc-analysis-inventory-management",
    siteName: "Inventory System",
    title: "ABC Analysis in Inventory Management | Inventory System",
    description: "A practical step-by-step guide to A, B and C inventory classification."
  }
};

export default function AbcAnalysisGuide() {
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Inventory control method</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">ABC analysis in inventory management: how to classify A, B and C items</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">A small catalogue can contain hundreds of products, but not every item deserves the same review effort. ABC analysis is a selective inventory-control method that groups items by their annual consumption value. It helps a business focus tighter checks on the products that account for the largest share of inventory spend or usage value.</p>
          <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Core calculation</p>
            <p className="mt-2 text-2xl font-bold leading-9 text-slate-950">Annual consumption value = Annual units consumed × Unit cost</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">Use the same period and cost basis for every product being compared.</p>
          </div>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">1. What A, B and C mean</h2>
            <p className="mt-4 leading-8 text-slate-700">After calculating annual consumption value, sort products from highest to lowest and calculate each item&apos;s cumulative share of the total. A common approach is to place the highest-value items in category A, the middle group in B and the lowest-value group in C.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5"><p className="text-sm font-bold text-rose-800">A items</p><p className="mt-2 text-sm leading-7 text-slate-700">Often a smaller number of products representing a large share of annual consumption value. Review closely and investigate record differences quickly.</p></div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5"><p className="text-sm font-bold text-amber-800">B items</p><p className="mt-2 text-sm leading-7 text-slate-700">Middle-value products. Use a regular review rhythm that balances attention with the effort required.</p></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5"><p className="text-sm font-bold text-emerald-800">C items</p><p className="mt-2 text-sm leading-7 text-slate-700">Lower-value products that can often use simpler controls, while still keeping basic availability and record accuracy.</p></div>
            </div>
            <p className="mt-4 leading-8 text-slate-700">The familiar 80/20 pattern is a rough observation, not a fixed rule. Your catalogue may have different cut-offs. Set category boundaries after looking at the actual cumulative value curve.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">2. How to perform ABC analysis</h2>
            <ol className="mt-5 list-decimal space-y-3 pl-6 leading-8 text-slate-700">
              <li><strong>Choose a consistent period.</strong> Use a full year if records are available; otherwise document how you annualised the period.</li>
              <li><strong>Collect item-level data.</strong> Gather each SKU, annual units consumed or sold, and the unit cost you have chosen for the analysis.</li>
              <li><strong>Calculate annual consumption value.</strong> Multiply annual units by unit cost. Do not confuse this with the value of stock currently on the shelf.</li>
              <li><strong>Sort from highest to lowest.</strong> Rank the products by annual consumption value.</li>
              <li><strong>Calculate cumulative percentage.</strong> Add each row to the running value total and divide by the grand total.</li>
              <li><strong>Assign categories and controls.</strong> Choose boundaries that make sense for your business and write down how often each group will be reviewed.</li>
            </ol>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">3. A simple worked example</h2>
            <p className="mt-4 leading-8 text-slate-700">Imagine a business has three products. These example figures are illustrative and use annual units consumed multiplied by unit cost.</p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-700"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Annual units</th><th className="px-4 py-3">Unit cost</th><th className="px-4 py-3">Annual value</th><th className="px-4 py-3">Share</th></tr></thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr><td className="px-4 py-3">Product A</td><td className="px-4 py-3">1,000</td><td className="px-4 py-3">₹100</td><td className="px-4 py-3">₹1,00,000</td><td className="px-4 py-3">66.7%</td></tr>
                  <tr><td className="px-4 py-3">Product B</td><td className="px-4 py-3">500</td><td className="px-4 py-3">₹40</td><td className="px-4 py-3">₹20,000</td><td className="px-4 py-3">13.3%</td></tr>
                  <tr><td className="px-4 py-3">Product C</td><td className="px-4 py-3">2,000</td><td className="px-4 py-3">₹5</td><td className="px-4 py-3">₹10,000</td><td className="px-4 py-3">6.7%</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-500">These three items total ₹1,30,000; the example is simplified and is not a recommended universal category split. A real analysis must include every item before calculating the cumulative shares.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">4. Match control effort to business risk</h2>
            <ul className="mt-5 list-disc space-y-3 pl-6 leading-8 text-slate-700">
              <li>Review A items frequently, investigate stock differences and keep supplier lead-time information current.</li>
              <li>Review B items on a regular but less intensive cycle.</li>
              <li>Use simpler controls for C items, while still preventing avoidable stockouts and record errors.</li>
              <li>Consider criticality and supply risk as a separate overlay: a low-cost part can still stop an important operation if unavailable.</li>
              <li>Recalculate categories when product costs, demand or the catalogue changes materially.</li>
            </ul>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">5. Limits of ABC analysis</h2>
            <p className="mt-4 leading-8 text-slate-700">ABC analysis is based on the value measure you choose. It does not, by itself, account for every issue: shelf life, seasonality, supplier risk, product criticality, margin, demand variability or minimum order quantities. A business may combine ABC with other methods when those factors matter. Do not automatically ignore a C item just because its annual value is low.</p>
            <p className="mt-4 leading-8 text-slate-700">Inventory System helps teams maintain product records and review stock quantities, but its current public feature set does not include automated ABC classification. You can use a spreadsheet to complete the analysis and then apply the review routine to your stock process.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">ABC analysis FAQs</h2>
            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 px-5">
              <details className="py-5"><summary className="cursor-pointer font-semibold">What does ABC stand for in inventory?</summary><p className="mt-3 leading-7 text-slate-600">ABC refers to three groups of inventory items ranked by a chosen value measure, commonly annual consumption value. A items receive the tightest control, B moderate control and C simpler control.</p></details>
              <details className="py-5"><summary className="cursor-pointer font-semibold">Is the 80/20 rule always used?</summary><p className="mt-3 leading-7 text-slate-600">No. It is a useful pattern sometimes seen in catalogues, but category cut-offs should be based on your own cumulative value data.</p></details>
              <details className="py-5"><summary className="cursor-pointer font-semibold">Does ABC analysis classify products by sales quantity?</summary><p className="mt-3 leading-7 text-slate-600">Not necessarily. The common consumption-value method uses annual units multiplied by unit cost. A high-volume, low-cost product may not rank as highly as a lower-volume, high-cost item.</p></details>
            </div>
          </section>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/guides/stock-register-format" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Stock register template</Link>
            <Link href="/guides/reorder-level-calculation" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Reorder level formula</Link>
            <Link href="/features" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Explore the software</Link>
          </div>
          <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-7 text-slate-500">Further reading: <a href="https://www.npcindia.gov.in/NPC/Files/Publication/Other%20Publications/Inventory-Control-MG8.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">National Productivity Council: Techniques of Inventory Control</a> and <a href="https://www.cbse.gov.in/cbsenew/ebooks/18_Enterpreneurship_Book.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">CBSE Entrepreneurship textbook: ABC analysis</a>.</p>
        </div>
      </article>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-sm text-slate-500 sm:px-8"><Link href="/" className="font-semibold text-slate-700 hover:text-indigo-700">Inventory System</Link> · Practical stock management resources</footer>
    </main>
  );
}
