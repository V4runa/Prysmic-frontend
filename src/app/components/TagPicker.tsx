"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ApiError, apiFetch } from "../hooks/useApi";
import { tagsQueryKey } from "../hooks/useTags";
import type { Tag } from "../lib/tag";
import { tagActiveTone, tagTone } from "../lib/tagColors";
import { messageFromBody } from "../lib/authMessages";
import { TextField, FormButton } from "./forms";
import TagColorChoices from "./TagColorChoices";

interface TagPickerProps {
  tags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  allowCreate?: boolean;
  /** Editor chips match the note form. Filter chips match the notes list. */
  appearance?: "editor" | "filter";
  selection?: "multiple" | "single";
  groupLabel?: string;
}

function createErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) {
    const message = messageFromBody(err.body);
    if (message && message.length <= 500) return message;
  }
  return "Could not create tag";
}

/** Selectable tag chips, shared by notes and tasks. */
export default function TagPicker({
  tags,
  selectedIds,
  onChange,
  disabled = false,
  allowCreate = false,
  appearance = "editor",
  selection = "multiple",
  groupLabel = "Tags",
}: TagPickerProps) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("cyan");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: number) => {
    if (disabled) return;
    if (selection === "single") {
      onChange(selectedIds.length === 1 && selectedIds[0] === id ? [] : [id]);
      return;
    }
    onChange(selectedIds.includes(id) ? selectedIds.filter((current) => current !== id) : [...selectedIds, id]);
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving || disabled) return;
    setSaving(true);
    setError("");
    try {
      const created = await apiFetch<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, color }),
      });
      queryClient.setQueryData<Tag[]>(tagsQueryKey, (prev) => {
        const list = prev ?? [];
        if (list.some((tag) => tag.id === created.id)) return list;
        return [...list, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      void queryClient.invalidateQueries({ queryKey: tagsQueryKey });
      if (typeof created.id === "number") {
        onChange(
          selection === "single"
            ? [created.id]
            : selectedIds.includes(created.id)
              ? selectedIds
              : [...selectedIds, created.id]
        );
      }
      setName("");
      setCreating(false);
    } catch (err) {
      setError(createErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const rowClass =
    appearance === "filter"
      ? "flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hidden px-0.5 py-1 sm:flex-wrap sm:overflow-x-visible"
      : "flex flex-wrap gap-2 sm:gap-3";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className={rowClass} role="group" aria-label={groupLabel}>
        {tags.map((tag, index) => {
          const selected = selectedIds.includes(tag.id);
          const tone = tagTone(tag.color, appearance === "filter" ? "slate" : "cyan");
          const className =
            appearance === "filter"
              ? `interactive-chip shrink-0 text-xs px-3 py-1 rounded-full border whitespace-nowrap transition-colors duration-200 ${tone} ${
                  selected ? tagActiveTone(tag.color, "slate") : "hover:bg-white/10"
                }`
              : `interactive-chip px-3 sm:px-4 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition-colors ${
                  selected
                    ? `${tone} ring-1 ring-inset ring-white/20`
                    : "text-slate-300 border-white/10 hover:bg-white/10"
                }`;
          return (
            <motion.button
              key={tag.id}
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index, 12) * 0.04 }}
              whileTap={disabled ? undefined : { scale: appearance === "filter" ? 0.95 : 0.93 }}
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggle(tag.id)}
              className={className}
            >
              {tag.name}
            </motion.button>
          );
        })}
        {allowCreate && (
          <button
            type="button"
            disabled={disabled || saving}
            aria-expanded={creating}
            onClick={() => {
              setCreating((open) => !open);
              setError("");
            }}
            className="interactive-chip px-3 sm:px-4 py-1 text-xs rounded-full border border-dashed border-white/20 text-slate-300 hover:bg-white/10 disabled:opacity-40"
          >
            New tag
          </button>
        )}
      </div>

      {allowCreate && tags.length === 0 && !creating && (
        <p className="text-xs text-slate-500">No tags yet.</p>
      )}

      {allowCreate && creating && (
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={inputId} className="sr-only">
            Tag name
          </label>
          <TextField
            id={inputId}
            value={name}
            disabled={disabled || saving}
            placeholder="Tag name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.stopPropagation();
              void create();
            }}
          />
          <TagColorChoices value={color} onChange={setColor} disabled={disabled || saving} />
          <div className="flex flex-wrap gap-2">
            <FormButton type="button" variant="primary" disabled={disabled || saving || !name.trim()} onClick={() => void create()}>
              {saving ? "Creating..." : "Create"}
            </FormButton>
            <FormButton
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setCreating(false);
                setError("");
              }}
            >
              Cancel
            </FormButton>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
