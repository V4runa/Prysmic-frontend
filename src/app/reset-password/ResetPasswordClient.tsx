"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import AuthFrame from "../components/AuthFrame";
import { Field, FormButton, TextField } from "../components/forms";
import { ApiError, apiFetch } from "../hooks/useApi";
import {
  INVALID_LINK_MESSAGE,
  PASSWORD_UPDATED_NOTICE,
  interpretPasswordReset,
  preparePasswordReset,
} from "../lib/authMessages";
import { clearStoredSession, setLoginNotice } from "../lib/storedSession";
import { useAuthLink } from "../lib/useAuthLink";

export default function ResetPasswordClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const link = useAuthLink("reset");
  const [rejected, setRejected] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorTarget, setErrorTarget] = useState<"password" | "confirm" | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const synced = useRef(false);

  useEffect(() => {
    if (!link || synced.current) return;
    synced.current = true;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== link.nextHref) {
      window.history.replaceState(window.history.state, "", link.nextHref);
    }
    router.replace(link.nextHref, { scroll: false });
    // Submit is the only path that posts. Opening the link must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const phase = rejected || (link && !link.token) ? "invalid" : link ? "form" : "boot";

  useEffect(() => {
    if (phase === "form") passwordRef.current?.focus();
    if (phase === "invalid") headingRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!error) return;
    if (errorTarget === "confirm") confirmRef.current?.focus();
    else passwordRef.current?.focus();
  }, [error, errorTarget]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    const decision = preparePasswordReset({ token: link?.token ?? null, password, confirm });
    if (!decision.ok) {
      if (decision.reason === "invalid-link") {
        setRejected(true);
        return;
      }
      setError(decision.message);
      setErrorTarget(decision.reason === "mismatch" ? "confirm" : "password");
      return;
    }

    setError(null);
    setErrorTarget(null);
    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), 3500);
    try {
      await apiFetch("/auth/password/reset", {
        method: "POST",
        auth: false,
        body: JSON.stringify(decision.body),
      });
      clearStoredSession(queryClient);
      setLoginNotice(PASSWORD_UPDATED_NOTICE);
      router.push("/login");
    } catch (err) {
      const outcome =
        err instanceof ApiError
          ? interpretPasswordReset(err.status, err.body)
          : { type: "failed" as const, message: "Something got in the way. Try again in a moment." };
      if (outcome.type === "invalid-link") {
        setRejected(true);
        return;
      }
      if (outcome.type === "updated") return;
      setError(outcome.message);
      setErrorTarget("password");
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
    }
  }

  if (phase === "boot") {
    return (
      <AuthFrame>
        <p role="status" className="text-slate-400 text-sm text-center">
          One moment…
        </p>
      </AuthFrame>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthFrame>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-slate-100 text-2xl font-medium mb-3 text-center tracking-wide outline-none"
          style={{ boxShadow: "none" }}
        >
          This link has faded
        </h1>
        <p role="alert" className="text-slate-300 text-sm text-center leading-relaxed">
          {INVALID_LINK_MESSAGE}
        </p>
        <p className="text-slate-400 text-sm mt-6 text-center">
          <Link href="/forgot-password" className="text-cyan-300 hover:underline">
            Request a new link
          </Link>
        </p>
      </AuthFrame>
    );
  }

  const passwordDescribedBy =
    errorTarget === "password" && error ? "new-password-error" : "new-password-hint";

  return (
    <AuthFrame>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-slate-100 text-2xl font-medium mb-3 text-center tracking-wide outline-none"
        style={{ boxShadow: "none" }}
      >
        A new password
      </h1>
      <p className="text-slate-300 text-sm text-center leading-relaxed mb-6">
        Choose something you&apos;ll remember. This link works once.
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="New password"
          htmlFor="new-password"
          hint="At least 6 characters."
          error={errorTarget === "password" ? error ?? undefined : undefined}
        >
          <TextField
            ref={passwordRef}
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={errorTarget === "password" && error ? true : undefined}
            aria-describedby={passwordDescribedBy}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errorTarget === "password") {
                setError(null);
                setErrorTarget(null);
              }
            }}
          />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="confirm-password"
          error={errorTarget === "confirm" ? error ?? undefined : undefined}
        >
          <TextField
            ref={confirmRef}
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            aria-invalid={errorTarget === "confirm" && error ? true : undefined}
            aria-describedby={
              errorTarget === "confirm" && error ? "confirm-password-error" : undefined
            }
            onChange={(event) => {
              setConfirm(event.target.value);
              if (errorTarget === "confirm") {
                setError(null);
                setErrorTarget(null);
              }
            }}
          />
        </Field>
        <FormButton
          type="submit"
          variant="primary"
          className="w-full mt-2 disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Updating…" : "Update password"}
        </FormButton>
        {slow && !error && (
          <p className="text-slate-400 text-xs text-center" role="status">
            Waking the server — the first attempt can take a few seconds.
          </p>
        )}
      </form>
    </AuthFrame>
  );
}
