// src/app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientShellWrapper from "./components/ClientShellWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prysmic",
  description: "Prysmic is an exptention to your cognition. A smoothly designed space to capture thoughts, track habits, and organize tasks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientShellWrapper>{children}</ClientShellWrapper>
      </body>
    </html>
  );
}
