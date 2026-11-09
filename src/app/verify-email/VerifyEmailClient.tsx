"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthFrame from "../components/AuthFrame";
import EmailRequestForm from "../components/EmailRequestForm";
import Spinner from "../components/Spinner";
import { FormButton } from "../components/forms";
import { ApiError, apiFetch } from "../hooks/useApi";
import { verifyOnce, type VerifyPhase } from "../lib/authLink";
import { INVALID_LINK_MESSAGE, interpretVerify } from "../lib/authMessages";
import { clearSignupEmailNote, hasStoredSession, rememberEmailVerified } from "../lib/storedSession";
import { useAuthLink } from "../lib/useAuthLink";
import { usePreferences } from "../hooks/usePreferences";
import { landingHref } from "../lib/preferences";

async function requestVerification(token: string): Promise<VerifyPhase> {
  try {
    await apiFetch("/auth/email/verify", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ token }),
    });
    rememberEmailVerified(true);
    clearSignupEmailNote();
    return "success";
  } catch (err) {
    if (err instanceof ApiError) return interpretVerify(err.status);
    return "failed";
  }
}

export default function VerifyEmailClient() {
  const router = useRouter();
  const link = useAuthLink("verify");
  const prefs = usePreferences();
  const [result, setResult] = useState<VerifyPhase | null>(null);
  const [retrying, setRetrying] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const synced = useRef(false);

  useEffect(() => {
    if (!link) return;
    if (!synced.current) {
      synced.current = true;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (current !== link.nextHref) {
        window.history.replaceState(window.history.state, "", link.nextHref);
      }
      router.replace(link.nextHref, { scroll: false });
    }
    if (!link.token) return;
    let active = true;
    // verifyOnce dedupes the Strict Mode remount so the token is posted once.
    verifyOnce(link.token, requestVerification).then((next) => {
      if (active) setResult(next);
    });
    return () => {
      active = false;
    };
    // Replace the URL once. Router identity must not start another confirmation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const phase: "boot" | "pending" | VerifyPhase = !link
    ? "boot"
    : result
      ? result
      : link.token
        ? "pending"
        : "invalid";

  useEffect(() => {
    if (phase === "boot" || phase === "pending") return;
    headingRef.current?.focus();
  }, [phase]);

  const retry = async () => {
    if (!link?.token || retrying) return;
    setRetrying(true);
    setResult(await requestVerification(link.token));
    setRetrying(false);
  };

  const signedIn = phase === "success" && hasStoredSession();

  return (
    <AuthFrame>
      {phase === "boot" || phase === "pending" ? (
        <div role="status" aria-live="polite">
          <Spinner label="Following the link…" />
        </div>
      ) : phase === "success" ? (
        <div className="text-center">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-slate-100 text-2xl font-medium tracking-wide outline-none"
            style={{ boxShadow: "none" }}
          >
            You&apos;re confirmed
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mt-3" role="status">
            Your email is confirmed. The space is yours.
          </p>
          <Link
            href={signedIn ? landingHref(prefs) : "/login"}
            className="tap-target mt-6 inline-flex items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-400/10 px-5 py-2.5 text-sm text-cyan-100 hover:bg-cyan-400/20 transition"
          >
            {signedIn ? "Continue" : "Sign in"}
          </Link>
        </div>
      ) : (
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-slate-100 text-2xl font-medium mb-3 text-center tracking-wide outline-none"
            style={{ boxShadow: "none" }}
          >
            This link has faded
          </h1>
          <p role="alert" className="text-slate-300 text-sm text-center leading-relaxed mb-6">
            {phase === "invalid"
              ? INVALID_LINK_MESSAGE
              : "We couldn't confirm that just now. You can try once more, or ask for a new link."}
          </p>
          {phase === "failed" && (
            <FormButton
              type="button"
              variant="secondary"
              className="w-full mb-4"
              disabled={retrying}
              onClick={retry}
            >
              Try again
            </FormButton>
          )}
          <p className="text-slate-400 text-sm text-center leading-relaxed mb-4">
            Leave your email and we&apos;ll send another, if there&apos;s an account to reach.
          </p>
          <EmailRequestForm
            endpoint="/auth/email/resend"
            submitLabel="Send another link"
            pendingLabel="Sending…"
            idPrefix="verify-resend"
          />
        </div>
      )}
    </AuthFrame>
  );
}
