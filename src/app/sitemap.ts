import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/marketing/journal";
import { modules } from "@/marketing/modules";
import { stories } from "@/marketing/stories";
import { SITE_URL } from "@/marketing/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/modules",
    "/stories",
    "/blog",
    "/press",
    "/pricing",
    "/login",
    "/signup",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: `${SITE_URL}${path || "/"}`,
      lastModified: now,
    })),
    ...modules.map((module) => ({
      url: `${SITE_URL}/modules/${module.slug}`,
      lastModified: now,
    })),
    ...stories.map((story) => ({
      url: `${SITE_URL}/stories/${story.slug}`,
      lastModified: now,
    })),
    ...getPublishedPosts().map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00Z`),
    })),
  ];
}
