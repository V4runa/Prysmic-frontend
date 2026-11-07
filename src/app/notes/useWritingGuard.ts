"use client";

import { useEffect, useRef } from "react";

/**
 * Warn before a tab close drops unsaved writing. The session-expired redirect
 * is allowed through once the draft is already stored, so signing in again
 * is not blocked by the browser's leave prompt.
 */
export function useWritingGuard(dirty: boolean, persisted: boolean) {
  const allowAuthRedirect = useRef(false);

  useEffect(() => {
    const onExpired = () => {
      allowAuthRedirect.current = true;
    };
    window.addEventListener("token-expired", onExpired);
    return () => window.removeEventListener("token-expired", onExpired);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowAuthRedirect.current && persisted) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, persisted]);

  useEffect(() => {
    if (!dirty || persisted) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const ok = window.confirm(
        "Leave this page? This writing could not be kept in the tab, so it will be lost."
      );
      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, persisted]);
}
