"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, useState } from "react";
import { FormButton, TextField } from "./forms";
import { ApiError, apiFetch } from "../hooks/useApi";
import { readSessionClaims } from "../hooks/useAuth";
import {
  interpretEmailRequest,
  shouldShowVerificationPrompt,
  validateEmail,
  verificationPromptCopy,
} from "../lib/authMessages";
import {
  dismissVerifyPrompt,
  hasStoredSession,
  isVerifyPromptDismissed,
  markEmailVerifiedRefreshed,
  readRememberedEmailVerified,
  readSignupEmailNote,
  rememberEmailVerified,
  shouldRefreshEmailVerified,
} from "../lib/storedSession";

interface PublicUser {
  id: number;
  email?: string;
  emailVerified?: boolean;
}

interface PromptSnapshot {
  hasSession: boolean;
  verified: boolean | null;
  dismissed: boolean;
  justSignedUp: boolean;
  email: string | null;
}

const HIDDEN: PromptSnapshot = {
  hasSession: false,
  verified: null,
  dismissed: true,
  justSignedUp: false,
  email: null,
};

let cached: PromptSnapshot | null = null;
let profileEmail: string | null = null;
const listeners = new Set<() => void>();

function sameSnapshot(a: PromptSnapshot, b: PromptSnapshot): boolean {
  return (
    a.hasSession === b.hasSession &&
    a.verified === b.verified &&
    a.dismissed === b.dismissed &&
    a.justSignedUp === b.justSignedUp &&
    a.email === b.email
  );
}

function readSnapshot(): PromptSnapshot {
  const next: PromptSnapshot = {
    hasSession: hasStoredSession(),
    verified: readRememberedEmailVerified(),
    dismissed: isVerifyPromptDismissed(),
    justSignedUp: readSignupEmailNote(),
    email: profileEmail ?? readSessionClaims()?.email ?? null,
  };
  if (cached && sameSnapshot(cached, next)) return cached;
  cached = next;
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function refreshPrompt(): void {
  cached = null;
  listeners.forEach((listener) => listener());
}

/** Keep the confirmation note aligned with a profile the settings screen just saved. */
export function syncVerificationProfile(input: {
  email?: string | null;
  emailVerified?: boolean | null;
}): void {
  if (typeof input.email === "string" && input.email.trim()) {
    profileEmail = input.email.trim();
  }
  if (input.emailVerified === true || input.emailVerified === false) {
    rememberEmailVerified(input.emailVerified);
  }
  refreshPrompt();
}

export default function EmailVerificationPrompt({ defer = false }: { defer?: boolean }) {
  const prompt = useSyncExternalStore(subscribe, readSnapshot, () => HIDDEN);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!shouldRefreshEmailVerified()) return;
    markEmailVerifiedRefreshed();
    let cancelled = false;
    apiFetch<PublicUser[]>("/users")
      .then((users) => {
        if (cancelled || !Array.isArray(users)) return;
        const me = users[0];
        if (!me || typeof me.emailVerified !== "boolean") return;
        rememberEmailVerified(me.emailVerified);
        if (typeof me.email === "string" && me.email) profileEmail = me.email;
        refreshPrompt();
      })
      .catch(() => {
        // Profile is a hint. Login already stored the flag when the API sent one.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const show = shouldShowVerificationPrompt({
    hasSession: prompt.hasSession,
    emailVerified: prompt.verified,
    dismissed: prompt.dismissed,
  });
  const innerRef = useRef<HTMLDivElement>(null);
  const [fullHeight, setFullHeight] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Done already navigates to a new page. The banner belongs in its final
  // place on that page's first paint, with no height animation afterwards.
  const instant = defer;
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || instant) return;
    setFullHeight(el.scrollHeight);
  }, [show, notice, prompt.email, instant]);
  useEffect(() => {
    if (instant) return;
    if (!show) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
  }, [show, instant]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!show || !instant) {
      if (!show) root.style.setProperty("--verify-banner-h", "0px");
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const apply = () => {
      root.style.setProperty("--verify-banner-h", `${el.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--verify-banner-h", "0px");
    };
  }, [show, notice, prompt.email, instant]);

  useEffect(() => {
    if (instant) return;
    const root = document.documentElement;
    if (!show) {
      root.style.setProperty("--verify-banner-h", "0px");
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const apply = () => {
      root.style.setProperty("--verify-banner-h", `${el.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--verify-banner-h", "0px");
    };
  }, [show, notice, instant]);

  const dismiss = () => {
    dismissVerifyPrompt();
    refreshPrompt();
  };

  const resend = async () => {
    if (sending) return;
    const address = (prompt.email ?? draft).trim().toLowerCase();
    const local = validateEmail(address);
    if (local) {
      setNotice(local);
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      await apiFetch("/auth/email/resend", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email: address }),
      });
      setNotice(interpretEmailRequest({ status: 200, body: null, retryAfter: null }).message);
    } catch (err) {
      if (err instanceof ApiError) {
        setNotice(
          interpretEmailRequest({
            status: err.status,
            body: err.body,
            retryAfter: err.retryAfter,
          }).message
        );
      } else {
        setNotice("Something got in the way. Try again in a moment.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {show && (
        <div
          ref={bannerRef}
          style={
            instant
              ? { overflow: "hidden" }
              : {
                  overflow: "hidden",
                  height: revealed && fullHeight > 0 ? fullHeight : 0,
                  opacity: revealed ? 1 : 0,
                  transition: "height 250ms ease, opacity 250ms ease",
                }
          }
          className="no-print"
        >
          <div ref={innerRef} className="px-3 pt-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20">
          <div
            role="region"
            aria-label="Email confirmation"
            className="glass-card rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-slate-200 leading-relaxed sm:flex-1" aria-live="polite">
              {notice ?? verificationPromptCopy(prompt.justSignedUp)}
            </p>
            {!prompt.email && (
              <label htmlFor="verify-prompt-email" className="mt-3 block text-sm text-slate-300">
                Email
                <TextField
                  id="verify-prompt-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={draft}
                  className="mt-1.5"
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
            )}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <FormButton
                type="button"
                variant="secondary"
                className="text-xs sm:text-sm"
                disabled={sending}
                onClick={resend}
              >
                {sending ? "Sending…" : "Resend confirmation"}
              </FormButton>
              <button
                type="button"
                onClick={dismiss}
                className="tap-target px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
              >
                Not now
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
