"use client";

import { useEffect, useRef, useState } from "react";
import { Field, FormButton, TextField } from "./forms";
import { ApiError, apiFetch } from "../hooks/useApi";
import {
  interpretEmailRequest,
  validateEmail,
  type EmailRequestOutcome,
} from "../lib/authMessages";

interface EmailRequestFormProps {
  endpoint: "/auth/email/resend" | "/auth/password/forgot";
  submitLabel: string;
  pendingLabel?: string;
  idPrefix?: string;
}

export default function EmailRequestForm({
  endpoint,
  submitLabel,
  pendingLabel = "Sending…",
  idPrefix = "email-request",
}: EmailRequestFormProps) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<EmailRequestOutcome | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const fieldId = `${idPrefix}-email`;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!outcome) return;
    if (outcome.type === "accepted") statusRef.current?.focus();
    else if (outcome.type === "invalid") inputRef.current?.focus();
    else alertRef.current?.focus();
  }, [outcome]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const address = email.trim().toLowerCase();
    const local = validateEmail(address);
    if (local) {
      setFieldError(local);
      setOutcome(null);
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    setOutcome(null);
    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), 3500);
    try {
      await apiFetch(endpoint, {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email: address }),
      });
      setOutcome(interpretEmailRequest({ status: 200, body: null, retryAfter: null }));
    } catch (err) {
      if (err instanceof ApiError) {
        setOutcome(
          interpretEmailRequest({
            status: err.status,
            body: err.body,
            retryAfter: err.retryAfter,
          })
        );
      } else {
        setOutcome({
          type: "failed",
          message: "Something got in the way. Try again in a moment.",
        });
      }
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
    }
  };

  if (outcome?.type === "accepted") {
    return (
      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="text-slate-200 text-sm text-center leading-relaxed outline-none"
        style={{ boxShadow: "none" }}
      >
        {outcome.message}
      </p>
    );
  }

  const shownError =
    fieldError ?? (outcome?.type === "invalid" ? outcome.message : null);
  const describedBy = shownError ? `${fieldId}-error` : undefined;
  const alertTone =
    outcome?.type === "wait" || outcome?.type === "unavailable"
      ? "text-slate-200"
      : "text-rose-300";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Email" htmlFor={fieldId} error={shownError ?? undefined}>
        <TextField
          ref={inputRef}
          id={fieldId}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError(null);
          }}
        />
      </Field>

      {outcome && outcome.type !== "invalid" && (
        <p
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className={`${alertTone} text-sm text-center leading-relaxed outline-none`}
          style={{ boxShadow: "none" }}
        >
          {outcome.message}
        </p>
      )}

      <FormButton
        type="submit"
        variant="primary"
        className="w-full disabled:opacity-70"
        disabled={loading}
      >
        {loading ? pendingLabel : submitLabel}
      </FormButton>

      {slow && (
        <p className="text-slate-400 text-xs text-center" role="status">
          Waking the server — the first attempt can take a few seconds.
        </p>
      )}
    </form>
  );
}
