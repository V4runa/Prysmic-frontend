// src/app/components/ClientShellWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

export default function ClientShellWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const publicPaths = ["/", "/login", "/signup"];
  const isPublic = publicPaths.includes(pathname);

  return <>{isPublic ? children : <AppShell>{children}</AppShell>}</>;
}
