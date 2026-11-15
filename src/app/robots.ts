import type { MetadataRoute } from "next";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep API endpoints out of search; private app pages send X-Robots-Tag: noindex.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
