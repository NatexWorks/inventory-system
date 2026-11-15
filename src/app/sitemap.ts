import type { MetadataRoute } from "next";

const SITE_URL = "https://inventory-system-mu-puce.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: SITE_URL + "/features",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/barcode-inventory-management",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/guides/small-business-inventory-management",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
