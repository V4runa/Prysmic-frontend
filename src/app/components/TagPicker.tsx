"use client";

import { useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCreateTag } from "../hooks/useCreateTag";
import type { Tag } from "../lib/tag";
import { leastUsedTagColor, tagActiveTone, tagTone } from "../lib/tagColors";
import {
  TAG_CREATE_DUPLICATE,
  duplicateTagName,
  selectionWithCreatedTag,
  tagCreateErrorMessage,
  tagNameToCreate,
} from "../lib/tagCreate";
import { TextField, FormButton } from "./forms";
import TagColorChoices from "./TagColorChoices";
import CreateTagDialog from "./CreateTagDialog";

interface TagPickerProps {
  tags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  allowCreate?: boolean;
  /**
   * Note editors open a dialog so the title and body stay put.
   * Tasks keep the inline name field.
   */
  createInDialog?: boolean;
  /** Editor chips match the note form. Filter chips match the notes list. */
  appearance?: "editor" | "filter";
  selection?: "multiple" | "single";
  groupLabel?: string;
}

/** Selectable tag chips, shared by notes and tasks. */
export default function TagPicker({
  tags,
  selectedIds,
  onChange,
  disabled = false,
  allowCreate = false,
  createInDialog = false,
  appearance = "editor",
  selection = "multiple",
  groupLabel = "Tags",
}: TagPickerProps) {
  const createTag = useCreateTag();
  const inputId = useId();
  const dialogId = useId();
  const newTagRef = useRef<HTMLButtonElement>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const color = pickedColor ?? leastUsedTagColor(tags);
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

  const selectCreated = (tag: Tag) => {
    if (typeof tag.id === "number") {
      onChange(selectionWithCreatedTag(selectedIds, tag.id, selection));
    }
    setName("");
    setCreating(false);
    setError("");
  };

  const create = async () => {
    const trimmed = tagNameToCreate(name);
    if (!trimmed || saving || disabled) return;
    if (duplicateTagName(trimmed, tags)) {
      setError(TAG_CREATE_DUPLICATE);
      return;
    }
    setSaving(true);
    setError("");
    try {
      selectCreated(await createTag(trimmed, color));
    } catch (err) {
      setError(tagCreateErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const rowClass =
    appearance === "filter"
      ? "flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hidden px-0.5 py-1 sm:flex-wrap sm:overflow-x-visible"
      : "flex flex-wrap gap-2 sm:gap-3";

  const openDialog = creating && createInDialog;

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
        {allowCreate && createInDialog && (
          <button
            ref={newTagRef}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={openDialog}
            aria-controls={openDialog ? dialogId : undefined}
            onClick={() => {
              setError("");
              setCreating(true);
            }}
            className={`interactive-chip tap-target whitespace-nowrap px-3 sm:px-4 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition-colors text-slate-300 border-white/10 disabled:opacity-40 ${
              openDialog ? "bg-white/10 ring-1 ring-inset ring-white/20" : "hover:bg-white/10"
            }`}
          >
            + New tag
          </button>
        )}
        {allowCreate && !createInDialog && (
          <button
            type="button"
            disabled={disabled || saving}
            aria-expanded={creating}
            onClick={() => {
              setCreating((open) => {
                if (!open) setPickedColor(null);
                return !open;
              });
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

      {allowCreate && !createInDialog && creating && (
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
          <TagColorChoices value={color} onChange={setPickedColor} disabled={disabled || saving} />
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

      {allowCreate && !createInDialog && error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}

      {openDialog && (
        <CreateTagDialog
          id={dialogId}
          tags={tags}
          returnFocusRef={newTagRef}
          onClose={() => setCreating(false)}
          onCreated={selectCreated}
        />
      )}
    </div>
  );
}
