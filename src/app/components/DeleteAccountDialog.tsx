"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { ApiError, apiFetch } from "../hooks/useApi";
import {
  clearDeletedAccount,
  deleteConfirmationReady,
  deletionFailureMessage,
  interpretDeleteAccount,
  signalSessionExpired,
} from "../lib/accountDeletion";
import { Field, FormButton, TextField } from "./forms";

export default function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirmRef = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => confirmRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending.current) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      alive.current = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const ready = deleteConfirmationReady(confirmation, password);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!deleteConfirmationReady(confirmation, password)) {
      setError(
        confirmation.trim() !== "DELETE"
          ? "Type DELETE to confirm."
          : "Enter your current password."
      );
      return;
    }

    pending.current = true;
    setError(null);
    setLoading(true);
    const slowTimer = setTimeout(() => {
      if (alive.current) setSlow(true);
    }, 3500);
    try {
      // Read a 401 body before deciding. A wrong password stays here.
      // A dead token uses the same sign-out path as other expired sessions.
      await apiFetch("/users/me", {
        method: "DELETE",
        keepSessionOn401: true,
        body: JSON.stringify({ password }),
      });
      clearDeletedAccount({ queryClient });
      router.push("/login");
    } catch (err) {
      pending.current = false;
      if (err instanceof ApiError) {
        const outcome = interpretDeleteAccount(err.status, err.body, err.retryAfter);
        if (outcome.type === "expired") {
          signalSessionExpired();
          return;
        }
        if (!alive.current || outcome.type === "deleted") return;
        setLoading(false);
        setSlow(false);
        setError(outcome.message);
        return;
      }
      if (!alive.current) return;
      setLoading(false);
      setSlow(false);
      if (err instanceof TypeError) {
        setError(deletionFailureMessage({ network: true }));
      } else {
        setError(deletionFailureMessage({}));
      }
    } finally {
      clearTimeout(slowTimer);
    }
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-warning"
        className="w-full max-w-md max-h-[88dvh] overflow-y-auto app-scroll rounded-2xl border border-rose-300/20 bg-zinc-900/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-black/50"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="delete-account-title" className="text-lg font-medium text-rose-100 tracking-wide">
            Delete this account?
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={loading}
            className="tap-target flex items-center justify-center p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p id="delete-account-warning" className="text-sm text-slate-300 leading-relaxed">
          This permanently deletes all of your notes, tags, habits, tasks, and moods.
          It can&apos;t be undone.
        </p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          <Field
            label="Type DELETE to confirm"
            htmlFor="delete-account-confirm"
            hint={
              confirmation.trim() !== "DELETE" && confirmation.length > 0
                ? "Type DELETE in capitals."
                : undefined
            }
          >
            <TextField
              ref={confirmRef}
              id="delete-account-confirm"
              value={confirmation}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={confirmation.length > 0 && confirmation.trim() !== "DELETE" ? true : undefined}
              aria-describedby={
                confirmation.trim() !== "DELETE" && confirmation.length > 0
                  ? "delete-account-confirm-hint"
                  : undefined
              }
              onChange={(event) => {
                setConfirmation(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>
          <Field label="Current password" htmlFor="delete-account-password">
            <TextField
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          {slow && !error ? (
            <p className="text-slate-400 text-xs" role="status">
              Waking the server — the first attempt can take a few seconds.
            </p>
          ) : null}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-1">
            <FormButton type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Keep this account
            </FormButton>
            <FormButton
              type="submit"
              variant="danger"
              disabled={!ready || loading}
              aria-busy={loading}
            >
              {loading ? "Deleting…" : "Delete account"}
            </FormButton>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
}
