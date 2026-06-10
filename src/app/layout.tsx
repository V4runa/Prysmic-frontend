// src/app/layout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ClientShellWrapper from "./components/ClientShellWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Prysmic",
  description: "Prysmic is an extension to your cognition. A smoothly designed space to capture thoughts, track habits, and organize tasks.",
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
