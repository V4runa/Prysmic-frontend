import { Cormorant_Garamond } from "next/font/google";
import { AnalyticsHook } from "@/marketing/components/AnalyticsHook";
import { SiteFooter } from "@/marketing/components/SiteFooter";
import { SiteHeader } from "@/marketing/components/SiteHeader";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`marketing-root ${display.variable} text-slate-100`}>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-slate-100 focus:px-3 focus:py-2 focus:text-slate-900"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content">{children}</main>
      <SiteFooter />
      <AnalyticsHook />
    </div>
  );
}
