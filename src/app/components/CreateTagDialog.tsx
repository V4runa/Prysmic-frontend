"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCreateTag } from "../hooks/useCreateTag";
import { leastUsedTagColor } from "../lib/tagColors";
import type { Tag } from "../lib/tag";
import {
  TAG_CREATE_DUPLICATE,
  TAG_CREATE_NAME,
  duplicateTagName,
  tagCreateErrorMessage,
  tagNameToCreate,
} from "../lib/tagCreate";
import { fieldLabel } from "./forms/styles";
import { FormButton, TextField } from "./forms";
import TagColorChoices from "./TagColorChoices";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CreateTagDialog({
  id,
  tags,
  onCreated,
  onClose,
  returnFocusRef,
}: {
  id: string;
  tags: readonly Tag[];
  onCreated: (tag: Tag) => void;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const nameId = useId();
  const colorLabelId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  const createTag = useCreateTag();
  const [name, setName] = useState("");
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const color = pickedColor ?? leastUsedTagColor(tags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const root = dialogRef.current;
    const returnFocus = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => nameRef.current?.focus());

    const focusable = () => {
      if (!root) return [];
      return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (savingRef.current) return;
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && root.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      const items = focusable();
      (items[0] ?? nameRef.current)?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      returnFocus?.focus();
    };
  }, [returnFocusRef]);

  if (typeof document === "undefined") return null;

  const requestClose = () => {
    if (savingRef.current) return;
    onClose();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (savingRef.current) return;
    const trimmed = tagNameToCreate(name);
    if (!trimmed) {
      setError(TAG_CREATE_NAME);
      nameRef.current?.focus();
      return;
    }
    if (duplicateTagName(trimmed, tags)) {
      setError(TAG_CREATE_DUPLICATE);
      nameRef.current?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const created = await createTag(trimmed, color);
      onCreated(created);
    } catch (err) {
      savingRef.current = false;
      setSaving(false);
      setError(tagCreateErrorMessage(err));
      nameRef.current?.focus();
    }
  };

  const nameInvalid = error === TAG_CREATE_NAME || error === TAG_CREATE_DUPLICATE;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        id={id}
        tabIndex={-1}
        className="w-full max-w-md max-h-[min(32rem,calc(100dvh-2rem))] overflow-y-auto overscroll-contain app-scroll rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-medium tracking-wide text-slate-100">
            New tag
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={requestClose}
            disabled={saving}
            className="tap-target -mr-1 -mt-1 flex shrink-0 items-center justify-center rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className={fieldLabel}>
              Name
            </label>
            <TextField
              ref={nameRef}
              id={nameId}
              value={name}
              readOnly={saving}
              placeholder="Tag name"
              autoComplete="off"
              aria-invalid={nameInvalid ? true : undefined}
              aria-describedby={error ? `${nameId}-error` : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span id={colorLabelId} className={fieldLabel}>
              Color
            </span>
            <TagColorChoices
              value={color}
              onChange={setPickedColor}
              disabled={saving}
              labelledBy={colorLabelId}
              className="tap-target"
            />
          </div>
          {error ? (
            <p id={`${nameId}-error`} role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <FormButton type="button" variant="secondary" onClick={requestClose} disabled={saving} className="w-full sm:w-auto">
              Cancel
            </FormButton>
            <FormButton
              type="submit"
              variant="primary"
              disabled={saving || !name.trim()}
              aria-busy={saving}
              className="w-full sm:w-auto"
            >
              {saving ? "Creating…" : "Create"}
            </FormButton>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
}
