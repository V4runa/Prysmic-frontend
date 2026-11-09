import type { MetadataRoute } from "next";
import { SITE_URL } from "@/marketing/site";
import { PRIVATE_PATH_PREFIXES } from "./lib/privatePaths";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_PATH_PREFIXES],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
