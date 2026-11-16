"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreSessionIfNeeded } from "../lib/refreshSession";

/** Older links to /account land on Settings. A cookie can still be signed in. */
export default function AccountPage() {
  const router = useRouter();

  useEffect(() => {
    let live = true;
    restoreSessionIfNeeded().then((ok) => {
      if (live) router.replace(ok ? "/settings" : "/login");
    });
    return () => {
      live = false;
    };
  }, [router]);

  return null;
}
