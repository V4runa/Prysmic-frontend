"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { landingHref } from "@/app/lib/preferences";

/**
 * A valid session still belongs in the app. Login and signup already
 * land on the saved default page; opening the public home follows them.
 * Expired or unreadable tokens stay on the marketing page.
 */
function hasLiveSession(): boolean {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;
    const part = token.split(".")[1];
    if (!part) return false;
    const payload = JSON.parse(atob(part)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function EnterIfSignedIn() {
  const router = useRouter();

  useEffect(() => {
    if (hasLiveSession()) router.replace(landingHref());
  }, [router]);

  return null;
}
