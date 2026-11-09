import type { Metadata } from "next";
import { AUTH_LINK_BOOTSTRAP } from "../lib/authLinkBootstrap";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: AUTH_LINK_BOOTSTRAP }} />
      {children}
    </>
  );
}
