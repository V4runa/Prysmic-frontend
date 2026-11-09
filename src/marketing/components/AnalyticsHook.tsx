import Script from "next/script";

/**
 * Privacy-friendly analytics slot.
 *
 * Nothing loads unless both variables are set at build time:
 *   NEXT_PUBLIC_ANALYTICS_SRC — script URL of the provider you choose
 *   NEXT_PUBLIC_ANALYTICS_ID  — site id, passed through as data-website-id
 *
 * Leave them unset. No tracking script ships with the site. When a provider
 * is chosen, name it in the privacy draft before turning this on, and prefer
 * one that does not sell visitor data.
 */
export function AnalyticsHook() {
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
  const id = process.env.NEXT_PUBLIC_ANALYTICS_ID;
  if (!src) return null;

  return (
    <Script src={src} strategy="afterInteractive" data-website-id={id} />
  );
}
