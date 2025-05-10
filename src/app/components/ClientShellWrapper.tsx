"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import AppShell from "./AppShell";
import { SessionToastProvider, useSessionToast } from "./SessionToastContext";

function ClientShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPaths = ["/", "/login", "/signup"];
  const isPublic = publicPaths.includes(pathname);
  const toastTriggeredRef = useRef(false);
  const triggerToast = useSessionToast();

  useEffect(() => {
    console.log("✅ ClientShellInner mounted");

    const checkToken = () => {
      const token = localStorage.getItem("token");
      if (!token || isPublic || toastTriggeredRef.current) return;

      try {
        const { exp } = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);
        console.log("🧠 Token exp:", exp, "| Now:", now);

        if (now >= exp) {
          console.log("💀 Token expired (polling loop)");
          toastTriggeredRef.current = true;
          localStorage.removeItem("token");
          triggerToast();
        }
      } catch (err) {
        console.warn("❌ Token decode failed", err);
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
        console.log("💥 Token expired (event)");
        toastTriggeredRef.current = true;
        triggerToast();
      }
    };

    window.addEventListener("token-expired", handleTokenExpired);

    return () => {
      clearInterval(interval);
      window.removeEventListener("token-expired", handleTokenExpired);
    };
  }, [pathname]);

  return isPublic ? children : <AppShell>{children}</AppShell>;
}

export default function ClientShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionToastProvider>
      <ClientShellInner>{children}</ClientShellInner>
    </SessionToastProvider>
  );
}
