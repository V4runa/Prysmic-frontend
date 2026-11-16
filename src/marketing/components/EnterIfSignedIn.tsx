"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { landingHref } from "@/app/lib/preferences";
import { restoreSessionIfNeeded } from "@/app/lib/refreshSession";

/**
 * A live session belongs in the app. A missing or expired access token can
 * still have the sign-in cookie, so try that once before staying on the
 * marketing page. Login and signup already land on the saved default page.
 */
export function EnterIfSignedIn() {
  const router = useRouter();

  useEffect(() => {
    let live = true;
    restoreSessionIfNeeded().then((ok) => {
      if (live && ok) router.replace(landingHref());
    });
    return () => {
      live = false;
    };
  }, [router]);

  return null;
}
