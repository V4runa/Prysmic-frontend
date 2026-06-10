"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import AppShell from "./AppShell";
import OnboardingModal from "./OnboardingModal";
import { SessionToastProvider, useSessionToast } from "./SessionToastContext";
import QueryProvider from "../providers/QueryProvider";

function ClientShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPaths = ["/", "/login", "/signup"];
  const isPublic = publicPaths.includes(pathname);
  const toastTriggeredRef = useRef(false);
  const triggerToast = useSessionToast();

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("token");
      if (!token || isPublic || toastTriggeredRef.current) return;

      try {
        const { exp } = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        if (now >= exp) {
          toastTriggeredRef.current = true;
          localStorage.removeItem("token");
          triggerToast();
        }
      } catch (err) {
        console.warn("Token decode failed", err);
      }
    };

    // Run immediately on mount
    checkToken();

    // 🔁 Start polling every 5 seconds
    const interval = setInterval(() => {
      checkToken();
    }, 5000);

    // 🌐 Listen to manual session expiration triggers
    const handleTokenExpired = () => {
      if (!toastTriggeredRef.current) {
        toastTriggeredRef.current = true;
        triggerToast();
      }
    };

    window.addEventListener("token-expired", handleTokenExpired);

    return () => {
      clearInterval(interval);
      window.removeEventListener("token-expired", handleTokenExpired);
    };
  }, [pathname, isPublic, triggerToast]);

  if (isPublic) return <>{children}</>;

  return (
    <AppShell>
      {children}
      <OnboardingModal />
    </AppShell>
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
