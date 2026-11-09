import { SITE_URL } from "../../marketing/site";
import { isPublicPath } from "./publicPaths";

export type AnalyticsEvent = {
  type: "pageview" | "event";
  url: string;
};

/**
 * Cookieless page views stay on the public site. Signed-in screens are dropped.
 * Query strings and hashes are removed so reset and verify tokens are never sent.
 * The returned event carries only its type and the cleaned URL.
 */
export function prepareAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent | null {
  let url: URL;
  try {
    url = new URL(event.url, SITE_URL);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!isPublicPath(url.pathname)) return null;
  url.search = "";
  url.hash = "";
  return { type: event.type, url: url.toString() };
}
