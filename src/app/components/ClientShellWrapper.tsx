"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import AppShell from "./AppShell";
import OnboardingModal from "./OnboardingModal";
import PrismBackdrop from "./PrismBackdrop";
import { SessionToastProvider, useSessionToast } from "./SessionToastContext";
import { isPublicPath } from "../lib/publicPaths";
import { isAccessTokenCurrent, refreshAccessSession } from "../lib/refreshSession";
import { discardExpiredAccessToken, isSessionRestoreSuppressed, readStoredToken } from "../lib/storedSession";
import QueryProvider from "../providers/QueryProvider";

function ClientShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);
  const toastTriggeredRef = useRef(false);
  const triggerToast = useSessionToast();

  useEffect(() => {
    let cancelled = false;

    const renewOrSignIn = async () => {
      if (cancelled || toastTriggeredRef.current || isPublic || isSessionRestoreSuppressed()) return;
      const token = readStoredToken();
      if (isAccessTokenCurrent(token)) return;
      const refreshed = await refreshAccessSession(token);
      if (cancelled || toastTriggeredRef.current || isPublic || isSessionRestoreSuppressed()) return;
      if (!refreshed.ok && refreshed.reason !== "paused") {
        discardExpiredAccessToken();
      }
    };

    let interval = 0;
    if (!isPublic) {
      void renewOrSignIn();
      interval = window.setInterval(() => {
        void renewOrSignIn();
      }, 5000);
    }

    // A failed refresh, and any 401 that cannot be repaired, still uses this.
    const handleTokenExpired = () => {
      if (!toastTriggeredRef.current) {
        toastTriggeredRef.current = true;
        triggerToast();
      }
    };

    window.addEventListener("token-expired", handleTokenExpired);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      window.removeEventListener("token-expired", handleTokenExpired);
    };
  }, [pathname, isPublic, triggerToast]);

  // Render the prism backdrop once, above the public/app branch, so it stays
  // mounted across every navigation — landing, login, signup AND into the
  // authenticated app — and its animation runs continuously instead of
  // restarting. Authenticated routes lay a darker scrim over it (see AppShell)
  // so it recedes behind dense content.
  return (
    <>
      <PrismBackdrop />
      {isPublic ? (
        children
      ) : (
        <AppShell>
          {children}
          <OnboardingModal />
        </AppShell>
      )}
    </>
  );
}

export default function ClientShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SessionToastProvider>
        <ClientShellInner>{children}</ClientShellInner>
      </SessionToastProvider>
    </QueryProvider>
  );
}
