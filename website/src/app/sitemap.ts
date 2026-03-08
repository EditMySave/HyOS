import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

export const dynamic = "force-static";

const BASE = "https://hyos.io";
const BUILD_DATE = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    url: `${BASE}${page.url}`,
    lastModified: BUILD_DATE,
    changeFrequency: "weekly" as const,
    priority: page.url === "/docs" ? 0.9 : 0.7,
  }));

  return [
    {
      url: BASE,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    ...docs,
  ];
}
