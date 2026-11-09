// src/app/layout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ClientShellWrapper from "./components/ClientShellWrapper";
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
      <body className={inter.variable}>
        <ClientShellWrapper>{children}</ClientShellWrapper>
      </body>
    </html>
  );
}
