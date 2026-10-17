import Link from "next/link";

const features = [
  {
    title: "Product and stock tracking",
    description:
      "Organize products by category, maintain stock quantities, and quickly spot items that need replenishment.",
  },
  {
    title: "Supplier management",
    description:
      "Keep supplier contact details and product-supply information together in one workspace.",
  },
  {
    title: "Order and sales workflow",
    description:
      "Record orders, follow their status, and keep order information connected to your inventory.",
  },
  {
    title: "Inventory reports",
    description:
      "Review inventory activity and business reports, with export options to help with day-to-day analysis.",
  },
  {
    title: "Low-stock visibility",
    description:
      "Use inventory alerts to identify low-stock or out-of-stock products before they are missed.",
  },
  {
    title: "Access from desktop or mobile",
    description:
      "Use a responsive workspace designed to make common inventory tasks easier on different screen sizes.",
  },
];

const faqs = [
  {
    question: "What is inventory management software?",
    answer:
      "Inventory management software helps a business organize products, track stock quantities, manage suppliers and orders, and review inventory activity from one system.",
  },
  {
    question: "Can I manage suppliers and products in one place?",
    answer:
      "Yes. Inventory SaaS brings product records, categories, supplier details, orders, and inventory reports together in one workspace.",
  },
  {
    question: "Can I check inventory on a phone?",
    answer:
      "The interface is designed to adapt to smaller screens as well as desktop displays, so you can access common inventory workflows on mobile.",
  },
];

export const metadata = {
  title: "Inventory Management Features",
  description:
    "Explore inventory management software for product tracking, stock control, supplier management, order workflows, low-stock alerts, and inventory reports.",
  alternates: {
    canonical: "/features",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    title: "Inventory Management Features | Inventory SaaS",
    description:
      "Manage products, stock, suppliers, orders, and inventory reports in one workspace.",
    url: "/features",
  },
  twitter: {
    card: "summary",
    title: "Inventory Management Features | Inventory SaaS",
    description:
      "Explore product tracking, stock control, supplier management, orders, and inventory reports.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Inventory SaaS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Inventory management software for product and stock tracking, supplier management, order workflows, and inventory reporting.",
  url: "https://inventory-system-mu-puce.vercel.app/features",
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/features" className="text-lg font-bold tracking-tight">
            Inventory SaaS
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">
              Log in
            </Link>
            <Link href="/signup" className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400">
              Create account
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
          Inventory control, made clearer
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Inventory management software for products, stock, suppliers, and orders
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Keep everyday inventory operations organized in one workspace. Track products and stock
          levels, manage suppliers, follow orders, and review reports without spreading information
          across disconnected tools.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link href="/signup" className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-400">
            Get started
          </Link>
          <Link href="/login" className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-slate-100 hover:bg-white/5">
            Log in
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          A single place to organize inventory operations and understand stock activity.
        </p>
      </section>

      <section className="border-y border-white/10 bg-slate-900/70">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tools for day-to-day inventory management
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">
            From keeping product records up to date to checking orders and reviewing reports,
            Inventory SaaS brings key stock-management tasks into one place.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-white/10 bg-slate-950 p-6">
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight">Inventory management FAQs</h2>
        <div className="mt-8 space-y-6">
          {faqs.map((faq) => (
            <article key={faq.question} className="border-b border-white/10 pb-6">
              <h3 className="text-lg font-semibold">{faq.question}</h3>
              <p className="mt-2 leading-7 text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Inventory SaaS — product, stock, supplier, and order management.</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
