"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readStoredToken } from "../lib/storedSession";

/** Older links to /account land on Settings. */
export default function AccountPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(readStoredToken() ? "/settings" : "/login");
  }, [router]);

  return null;
}
