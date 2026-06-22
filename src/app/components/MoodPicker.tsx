"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Pencil, Trash2, Plus, X, Check, SlidersHorizontal } from "lucide-react";
import { apiFetch } from "../hooks/useApi";
import {
  MoodOption,
  useMoodOptions,
  useInvalidateMoodOptions,
} from "../hooks/useMoodOptions";
import {
  MOOD_COLORS,
  MOOD_COLOR_VALUES,
  DEFAULT_MOOD_COLOR,
  moodColor,
} from "../lib/moodColors";
import { tactile, tactileSubtle } from "../lib/motion";

interface MoodPickerProps {
  onSelect: (mood: MoodOption) => void;
}

const EMOJI_SUGGESTIONS = [
  "😀", "😌", "😴", "😢", "😡", "😍", "🤔", "😎", "🥳", "😰",
  "🔥", "🌈", "✨", "💪", "🧘", "☕", "🌙", "⭐", "🌊", "🍃",
];

interface EditorState {
  id?: number;
  label: string;
  emoji: string;
  color: string;
}

export default function MoodPicker({ onSelect }: MoodPickerProps) {
  const { data: options = [], isLoading } = useMoodOptions();
  const invalidate = useInvalidateMoodOptions();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const openCreate = () =>
    setEditor({ label: "", emoji: "", color: DEFAULT_MOOD_COLOR });

  const openEdit = (o: MoodOption) =>
    setEditor({ id: o.id, label: o.label, emoji: o.emoji, color: o.color });

  const closeEditor = () => {
    setEditor(null);
    setFormError("");
  };

  const handleSave = async () => {
    if (!editor) return;
    const label = editor.label.trim();
    const emoji = editor.emoji.trim();
    if (!label || !emoji) {
      setFormError("Give your mood a name and an emoji.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editor.id) {
        await apiFetch(`/mood-options/${editor.id}`, {
          method: "PUT",
          body: JSON.stringify({ label, emoji, color: editor.color }),
        });
      } else {
        await apiFetch("/mood-options", {
          method: "POST",
          body: JSON.stringify({ label, emoji, color: editor.color }),
        });
      }
      await invalidate();
      closeEditor();
    } catch {
      setFormError("Couldn't save that mood. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o: MoodOption) => {
    if (!window.confirm(`Remove "${o.label}" from your moods?`)) return;
    try {
      await apiFetch(`/mood-options/${o.id}`, { method: "DELETE" });
      await invalidate();
    } catch {
      // Non-fatal: the list simply won't change.
    }
  };

  const handlePick = (o: MoodOption) => {
    if (managing || selectedId) return;
    setSelectedId(o.id);
    setTimeout(() => onSelect(o), 700);
  };

  return (
    <div className="app-scroll relative w-full h-full overflow-y-auto">
      <div className="flex flex-col items-center w-full min-h-full px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="w-full max-w-5xl flex items-center justify-between gap-3 mb-6 sm:mb-10">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xl sm:text-4xl font-semibold text-slate-100 tracking-wide"
          >
            {managing ? "Customize your moods" : "How are you feeling today?"}
          </motion.h2>

          <motion.button
            {...tactileSubtle}
            onClick={() => {
              setManaging((m) => !m);
              setSelectedId(null);
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-slate-300 hover:text-white border border-white/10 rounded-full hover:bg-white/10 transition-colors"
          >
            {managing ? (
              <>
                <Check className="h-4 w-4" /> Done
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-4 w-4" /> Edit
              </>
            )}
          </motion.button>
        </div>

        {isLoading ? (
          <p className="text-slate-400 mt-10">Loading your moods...</p>
        ) : (
          <motion.div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-5 place-items-center w-full max-w-5xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            {options.map((mood, i) => {
              const def = MOOD_COLORS[mood.color] ?? moodColor(mood.color);
              const isSelected = selectedId === mood.id;
              return (
                <motion.div
                  key={mood.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 180 }}
                  className="relative w-full max-w-[9rem] mx-auto"
                >
                  <motion.button
                    onClick={() => (managing ? openEdit(mood) : handlePick(mood))}
                    disabled={!managing && !!selectedId && !isSelected}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                    className={`relative flex flex-col items-center justify-center w-full aspect-square p-2
                      rounded-2xl sm:rounded-3xl bg-gradient-to-br ${def.gradient}
                      text-white/90 shadow-md backdrop-blur-md border border-white/10 transition-all duration-300 overflow-hidden
                      ${
                        isSelected
                          ? "scale-110 ring-4 ring-white/20 shadow-xl"
                          : "brightness-95 hover:brightness-110"
                      }`}
                  >
                    <motion.span
                      className="text-3xl sm:text-5xl mb-1 sm:mb-2 drop-shadow-sm"
                      animate={
                        isSelected
                          ? { scale: [1, 1.4, 1], rotate: [0, 8, -8, 0] }
                          : {}
                      }
                      transition={{ duration: 0.8 }}
                    >
                      {mood.emoji}
                    </motion.span>
                    <span className="text-xs sm:text-base font-medium tracking-wide z-10 text-white truncate max-w-full px-1">
                      {mood.label}
                    </span>
                  </motion.button>

                  {/* Manage affordances */}
                  {managing && (
                    <div className="absolute -top-2 -right-2 flex gap-1">
                      <motion.button
                        {...tactileSubtle}
                        onClick={() => openEdit(mood)}
                        title="Edit"
                        className="tap-target flex items-center justify-center h-7 w-7 rounded-full bg-slate-900/80 border border-white/20 text-cyan-300 hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </motion.button>
                      <motion.button
                        {...tactileSubtle}
                        onClick={() => handleDelete(mood)}
                        title="Delete"
                        className="tap-target flex items-center justify-center h-7 w-7 rounded-full bg-slate-900/80 border border-white/20 text-red-300 hover:bg-slate-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Add tile (manage mode only) */}
            {managing && (
              <motion.button
                {...tactile}
                onClick={openCreate}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[9rem] mx-auto aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl sm:rounded-3xl border-2 border-dashed border-white/20 text-slate-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors"
              >
                <Plus className="h-7 w-7 sm:h-9 sm:w-9" />
                <span className="text-xs sm:text-sm">Add mood</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </div>

      {/* Editor overlay */}
      <AnimatePresence>
        {editor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-start sm:items-center justify-center overflow-y-auto app-scroll bg-slate-950/70 backdrop-blur-sm p-4"
            onClick={closeEditor}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md my-auto rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl p-5 sm:p-6 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">
                  {editor.id ? "Edit mood" : "New mood"}
                </h3>
                <button
                  onClick={closeEditor}
                  className="tap-target p-1 text-slate-400 hover:text-white"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Live preview */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br ${moodColor(
                    editor.color
                  ).gradient} text-3xl shadow-md border border-white/10`}
                >
                  {editor.emoji || "🙂"}
                </div>
                <span className="text-slate-200 font-medium truncate">
                  {editor.label.trim() || "Your mood"}
                </span>
              </div>

              {/* Name */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Name</span>
                <input
                  value={editor.label}
                  maxLength={40}
                  autoFocus
                  onChange={(e) =>
                    setEditor((s) => s && { ...s, label: e.target.value })
                  }
                  placeholder="e.g. Energized"
                  className="w-full px-3 py-2 bg-white/10 text-slate-200 rounded-md border border-white/10 focus-band text-sm"
                />
              </label>

              {/* Emoji */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-slate-400">Emoji</span>
                <div className="flex items-center gap-2">
                  <input
                    value={editor.emoji}
                    maxLength={8}
                    onChange={(e) =>
                      setEditor((s) => s && { ...s, emoji: e.target.value })
                    }
                    placeholder="🙂"
                    className="w-16 text-center px-2 py-2 bg-white/10 text-slate-200 rounded-md border border-white/10 focus-band text-2xl"
                  />
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {EMOJI_SUGGESTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() =>
                          setEditor((s) => s && { ...s, emoji: em })
                        }
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10 text-lg"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-slate-400">Color</span>
                <div className="flex flex-wrap gap-2">
                  {MOOD_COLOR_VALUES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={MOOD_COLORS[c].name}
                      onClick={() => setEditor((s) => s && { ...s, color: c })}
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${
                        MOOD_COLORS[c].gradient
                      } border border-white/10 transition-transform ${
                        editor.color === c
                          ? "ring-2 ring-white scale-110"
                          : "hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-400" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 mt-1">
                <motion.button
                  {...tactile}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-md font-medium text-white border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-400/20 transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save mood"}
                </motion.button>
                <motion.button
                  {...tactile}
                  onClick={closeEditor}
                  className="px-4 py-2 rounded-md font-medium text-slate-300 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
