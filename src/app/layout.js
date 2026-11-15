 
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
    default: "Inventory Management Software for Small Businesses | Inventory System",
    template: "%s | Inventory System",
  },
  description: "Track products, monitor stock levels, scan barcodes, manage suppliers and review orders with a straightforward inventory management system.",
  applicationName: "Inventory System",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Inventory System" },
  keywords: [
    "inventory management software",
    "stock management software",
    "inventory tracking",
    "product stock management",
    "inventory management for small businesses",
    "Inventory System",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Inventory System",
    title: "Inventory Management Software for Small Businesses | Inventory System",
    description: "Track products, monitor stock levels, scan barcodes, manage suppliers and review orders with a straightforward inventory management system.",
  },
  twitter: {
    card: "summary",
    title: "Inventory Management Software | Inventory System",
    description: "Track products, monitor stock levels, scan barcodes and manage orders from one inventory workspace.",
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
