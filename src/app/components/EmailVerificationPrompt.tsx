"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  readRememberedEmailVerified,
  readSignupEmailNote,
  rememberEmailVerified,
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

export default function EmailVerificationPrompt() {
  const prompt = useSyncExternalStore(subscribe, readSnapshot, () => HIDDEN);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!hasStoredSession()) return;
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
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="fixed z-40 inset-x-3 bottom-[calc(var(--bottomnav-h)+0.75rem)] sm:inset-x-auto sm:right-6 sm:bottom-auto sm:top-[calc(var(--header-h)+0.75rem)] sm:w-full sm:max-w-sm"
        >
          <div
            role="region"
            aria-label="Email confirmation"
            className="glass-card rounded-xl px-4 py-3.5 shadow-lg shadow-black/40"
          >
            <p className="text-sm text-slate-200 leading-relaxed" aria-live="polite">
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
