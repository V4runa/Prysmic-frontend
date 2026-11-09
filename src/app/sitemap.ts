import type { MetadataRoute } from "next";
import { SITE_URL } from "@/marketing/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/login", "/signup", "/privacy", "/terms"].map((path) => ({
    url: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified: now,
  }));
}
