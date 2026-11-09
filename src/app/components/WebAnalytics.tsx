"use client";

import { Analytics } from "@vercel/analytics/next";
import { prepareAnalyticsEvent } from "../lib/webAnalytics";

/**
 * Vercel Web Analytics is cookieless. beforeSend keeps it on public pages
 * and strips tokens from reset-password and verify-email links.
 * The root layout is a Server Component, so this client wrapper mounts the
 * script where every navigation can be filtered.
 */
export function WebAnalytics() {
  return <Analytics beforeSend={prepareAnalyticsEvent} />;
}
