import type { MetadataRoute } from "next";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/settings",
        "/reports",
        "/orders",
        "/pos",
        "/products",
        "/categories",
        "/suppliers",
        "/addProducts",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
