const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://inventory-system-mu-puce.vercel.app";

export default function sitemap() {
  return [
    {
      url: `${siteUrl}/features`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
