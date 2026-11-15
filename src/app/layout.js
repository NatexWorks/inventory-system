 
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

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Inventory Management Software | Inventory System",
    template: "%s | Inventory System",
  },
  description: "Track products, stock levels, suppliers, orders and barcode scans in one browser-based inventory management system. Review low-stock items and sales activity.",
  applicationName: "Inventory System",
  icons: {
    icon: [
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon-192.png",
    apple: "/favicon-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Inventory System" },
  keywords: [
    "inventory management software",
    "stock management software",
    "inventory tracking software",
    "barcode inventory management",
    "small business inventory software",
    "stock control software",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Inventory System",
    title: "Inventory Management Software | Inventory System",
    description: "Track products, stock levels, suppliers, orders and barcode scans in one browser-based inventory management system.",
  },
  twitter: {
    card: "summary",
    title: "Inventory Management Software | Inventory System",
    description: "Track products, stock levels, suppliers, orders and barcode scans in one browser-based inventory management system.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
