import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://inventory-system-mu-puce.vercel.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Inventory SaaS",
  title: {
    default: "Inventory Management Software | Inventory SaaS",
    template: "%s | Inventory SaaS",
  },
  description:
    "Manage products, stock levels, suppliers, orders, and inventory reports from one inventory management dashboard built for small businesses.",
  keywords: [
    "inventory management software",
    "stock management system",
    "inventory tracking",
    "product and stock control",
    "supplier management",
    "inventory reports",
    "small business inventory",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Inventory SaaS",
    title: "Inventory Management Software | Inventory SaaS",
    description:
      "Track products and stock, manage suppliers and orders, and review inventory reports in one place.",
    url: siteUrl,
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Inventory Management Software | Inventory SaaS",
    description:
      "Track products and stock, manage suppliers and orders, and review inventory reports in one place.",
  },
  // The main app is an authenticated workspace. Public pages can opt in to indexing individually.
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
