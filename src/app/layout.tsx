// src/app/layout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ClientShellWrapper from "./components/ClientShellWrapper";
import { WebAnalytics } from "./components/WebAnalytics";
import { INSTALL_PROMPT_BOOTSTRAP } from "./lib/installPrompt";
import { SITE_DESCRIPTION, SITE_URL } from "@/marketing/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Prysmic",
    template: "%s · Prysmic",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Prysmic",
  openGraph: {
    type: "website",
    siteName: "Prysmic",
    locale: "en_US",
    title: "Prysmic",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Prysmic",
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "Prysmic",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom for accessibility; cover lets us use safe-area insets.
  viewportFit: "cover",
  themeColor: "#0b0c0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className={inter.variable}>
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_BOOTSTRAP }} />
        <ClientShellWrapper>{children}</ClientShellWrapper>
        <WebAnalytics />
      </body>
    </html>
  );
}
