 
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
    default: "Inventory System | Inventory & Stock Management Software",
    template: "%s | Inventory System",
  },
  description: "Manage products, track stock levels, monitor orders and review inventory activity from one simple inventory management dashboard.",
  applicationName: "Inventory System",
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
    title: "Inventory System | Inventory & Stock Management Software",
    description: "Track products, monitor stock levels and review orders from one straightforward inventory dashboard.",
  },
  twitter: {
    card: "summary",
    title: "Inventory System | Inventory & Stock Management Software",
    description: "Track products, monitor stock levels and review orders from one straightforward inventory dashboard.",
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
