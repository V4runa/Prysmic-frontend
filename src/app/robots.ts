import type { MetadataRoute } from "next";
import { SITE_URL } from "@/marketing/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/notes",
        "/calendar",
        "/habits",
        "/tasks",
        "/moods",
        "/tags",
        "/test",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
