"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Trash2, X, Link2 } from "lucide-react";
import { apiFetch } from "../../hooks/useApi";
import { getUserFromToken } from "../../hooks/useAuth";
import {
  CalendarEventInput,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  updateCalendarEvent,
} from "../../hooks/useCalendar";
import { CalendarLinkType, CalendarRecurrence } from "../types";
import {
  EVENT_COLOR_TOKENS,
  getEventColor,
} from "../../lib/calendarColors";
import { tactile } from "../../lib/motion";

interface EventModalProps {
  open: boolean;
  /** Present = edit mode. */
  eventId?: number | null;
  /** Prefill date for create mode (YYYY-MM-DD). */
  initialDate?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface LinkOption {
  id: number;
  title: string;
}

const RECURRENCE_LABELS: Record<CalendarRecurrence, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const fieldClass =
  "w-full rounded-md px-3 py-2 bg-white/10 text-slate-100 placeholder-white/40 border border-white/10 focus-band transition text-sm";

export default function EventModal({
  open,
  eventId,
  initialDate,
  onClose,
  onSaved,
}: EventModalProps) {
  const isEdit = !!eventId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("cyan");
  const [location, setLocation] = useState("");
  const [recurrence, setRecurrence] = useState<CalendarRecurrence>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [linkedType, setLinkedType] = useState<CalendarLinkType | "">("");
  const [linkedId, setLinkedId] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState("");

  // Reset / hydrate whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setError("");
    if (isEdit && eventId) {
      setHydrating(true);
      getCalendarEvent(eventId)
        .then((ev) => {
          setTitle(ev.title);
          setDescription(ev.description ?? "");
          setAllDay(ev.allDay);
          setStartDate(ev.startDate);
          setEndDate(ev.endDate ?? "");
          setStartTime(ev.startTime ? ev.startTime.slice(0, 5) : "");
          setEndTime(ev.endTime ? ev.endTime.slice(0, 5) : "");
          setColor(ev.color || "cyan");
          setLocation(ev.location ?? "");
          setRecurrence(ev.recurrence);
          setRecurrenceEndDate(ev.recurrenceEndDate ?? "");
          setLinkedType(ev.linkedType ?? "");
          setLinkedId(ev.linkedId ?? "");
        })
        .catch(() => setError("Could not load this event."))
        .finally(() => setHydrating(false));
    } else {
      setTitle("");
      setDescription("");
      setAllDay(true);
      setStartDate(initialDate || "");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setColor("cyan");
      setLocation("");
      setRecurrence("none");
      setRecurrenceEndDate("");
      setLinkedType("");
      setLinkedId("");
    }
  }, [open, isEdit, eventId, initialDate]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lazily load link target options for the chosen type.
  const userId = useMemo(
    () => (typeof window !== "undefined" ? getUserFromToken()?.userId : null),
    []
  );
  const { data: linkOptions = [] } = useQuery({
    queryKey: ["calendar-link-options", linkedType, userId],
    enabled: open && !!linkedType,
    queryFn: async (): Promise<LinkOption[]> => {
      if (linkedType === "note") {
        const notes = await apiFetch<{ id: number; title: string }[]>(
          `/notes/user/${userId}`
        );
        return notes.map((n) => ({ id: n.id, title: n.title }));
      }
      if (linkedType === "task") {
        const tasks = await apiFetch<{ id: number; title: string }[]>("/tasks");
        return tasks.map((t) => ({ id: t.id, title: t.title }));
      }
      const habits = await apiFetch<{ id: number; name: string }[]>(
        `/habits?today=${startDate || ""}`
      );
      return habits.map((h) => ({ id: h.id, title: h.name }));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give your event a title.");
    if (!startDate) return setError("Pick a start date.");
    if (!allDay && !startTime) return setError("Timed events need a start time.");
    if (endDate && endDate < startDate)
      return setError("End date can't be before the start date.");
    if (recurrence !== "none" && recurrenceEndDate && recurrenceEndDate < startDate)
      return setError("Repeat-until can't be before the start date.");

    const payload: CalendarEventInput = {
      title: title.trim(),
      description: description.trim() || null,
      allDay,
      startDate,
      endDate: endDate || null,
      startTime: allDay ? null : startTime || null,
      endTime: allDay ? null : endTime || null,
      color,
      location: location.trim() || null,
      recurrence,
      recurrenceEndDate: recurrence === "none" ? null : recurrenceEndDate || null,
      linkedType: linkedType || null,
      linkedId: linkedType && linkedId !== "" ? Number(linkedId) : null,
    };

    setLoading(true);
    setError("");
    try {
      if (isEdit && eventId) await updateCalendarEvent(eventId, payload);
      else await createCalendarEvent(payload);
      onSaved();
      onClose();
    } catch {
      setError("Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    const ok = window.confirm(
      recurrence !== "none"
        ? "Delete this event and its whole repeating series?"
        : "Delete this event?"
    );
    if (!ok) return;
    setLoading(true);
    try {
      await deleteCalendarEvent(eventId);
      onSaved();
      onClose();
    } catch {
      setError("Could not delete this event.");
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg max-h-[88dvh] overflow-y-auto app-scroll rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-black/50"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white tracking-wide">
                {isEdit ? "Edit Event" : "New Event"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="tap-target flex items-center justify-center p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {hydrating ? (
              <p className="text-slate-400 text-sm py-8 text-center">Loading…</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  className={clsx(fieldClass, "text-base")}
                />

                {/* All-day toggle */}
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm text-slate-300">All-day</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allDay}
                    onClick={() => setAllDay((v) => !v)}
                    className={clsx(
                      "relative h-6 w-11 rounded-full transition-colors",
                      allDay ? "bg-cyan-500/60" : "bg-white/15"
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={clsx(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
                        allDay ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                </label>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      {allDay ? "Start" : "Start date"}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={clsx(fieldClass, "[color-scheme:dark]")}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      End {allDay ? "" : "date"} <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={clsx(fieldClass, "[color-scheme:dark]")}
                    />
                  </div>
                </div>

                {/* Times */}
                {!allDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Start time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={clsx(fieldClass, "[color-scheme:dark]")}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        End time <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={clsx(fieldClass, "[color-scheme:dark]")}
                      />
                    </div>
                  </div>
                )}

                {/* Color */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Color</label>
                  <div className="flex flex-wrap gap-2.5">
                    {EVENT_COLOR_TOKENS.map((token) => {
                      const c = getEventColor(token);
                      return (
                        <motion.button
                          type="button"
                          key={token}
                          {...tactile}
                          onClick={() => setColor(token)}
                          aria-label={token}
                          className={clsx(
                            "w-7 h-7 rounded-full transition",
                            c.swatch,
                            color === token
                              ? "ring-2 ring-white/80 ring-offset-2 ring-offset-zinc-900"
                              : "opacity-70 hover:opacity-100"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Recurrence */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Repeat</label>
                    <select
                      value={recurrence}
                      onChange={(e) =>
                        setRecurrence(e.target.value as CalendarRecurrence)
                      }
                      className={fieldClass}
                    >
                      {(Object.keys(RECURRENCE_LABELS) as CalendarRecurrence[]).map(
                        (r) => (
                          <option key={r} value={r}>
                            {RECURRENCE_LABELS[r]}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  {recurrence !== "none" && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        Until <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        min={startDate || undefined}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className={clsx(fieldClass, "[color-scheme:dark]")}
                      />
                    </div>
                  )}
                </div>

                {/* Location */}
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (optional)"
                  className={fieldClass}
                />

                {/* Link */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <Link2 className="h-3.5 w-3.5" /> Link to
                    </label>
                    <select
                      value={linkedType}
                      onChange={(e) => {
                        setLinkedType(e.target.value as CalendarLinkType | "");
                        setLinkedId("");
                      }}
                      className={fieldClass}
                    >
                      <option value="">Nothing</option>
                      <option value="note">Note</option>
                      <option value="task">Task</option>
                      <option value="habit">Habit</option>
                    </select>
                  </div>
                  {linkedType && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        Which {linkedType}
                      </label>
                      <select
                        value={linkedId}
                        onChange={(e) =>
                          setLinkedId(e.target.value ? Number(e.target.value) : "")
                        }
                        className={fieldClass}
                      >
                        <option value="">Select…</option>
                        {linkOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Notes (optional)"
                  className={fieldClass}
                />

                {error && <p className="text-rose-400 text-sm">{error}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <motion.button
                    {...tactile}
                    type="submit"
                    disabled={loading}
                    className="tap-target flex-1 flex items-center justify-center px-4 py-2.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-300/30 text-cyan-200 rounded-md font-medium text-sm disabled:opacity-50"
                  >
                    {loading ? "Saving…" : isEdit ? "Save changes" : "Create event"}
                  </motion.button>
                  {isEdit && (
                    <motion.button
                      {...tactile}
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      aria-label="Delete event"
                      className="tap-target flex items-center justify-center px-3 py-2.5 border border-rose-400/30 text-rose-300 hover:bg-rose-500/10 rounded-md disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
