const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://inventory-system-mu-puce.vercel.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/features"],
        disallow: [
          "/api/",
          "/addProducts",
          "/categories",
          "/forgot-password",
          "/login",
          "/orders",
          "/pos",
          "/products",
          "/reports",
          "/reset-password",
          "/settings",
          "/signup",
          "/suppliers",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
