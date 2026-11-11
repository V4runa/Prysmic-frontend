"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../hooks/useApi";
import {
  createCalendarEvent,
  useInvalidateCalendar,
} from "../hooks/useCalendar";
import { localToday } from "../lib/date";
import {
  noteClipboardMarkdown,
  noteClipboardText,
} from "../lib/noteMarkdown";
import { TextField } from "./forms";
import {
  formatCalendarDay,
  isCalendarDateKey,
  noteCalendarEvent,
  noteFlagPayload,
  patchNoteFlags,
  type NoteFlagPatch,
} from "../notes/noteMenu";

export interface NoteMenuNote {
  id: number;
  title: string;
  content?: string | null;
  tags?: { id: number }[] | null;
  isPinned?: boolean;
  isArchived?: boolean;
}

interface NoteActionsMenuProps {
  note: NoteMenuNote;
  variant: "card" | "page";
  onNotice?: (message: string) => void;
}

type Panel = "actions" | "date" | "added";

const menuItemClass =
  "tap-target block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50";

/**
 * Quiet "…" menu for one note. On a card it sits above the open-note link
 * and does not follow that click. The panel is portaled so a card's
 * overflow doesn't clip it.
 */
export default function NoteActionsMenu({
  note,
  variant,
  onNotice,
}: NoteActionsMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateCalendar = useInvalidateCalendar();
  const menuId = `note-actions-${useId().replace(/:/g, "")}`;
  const dateId = `${menuId}-date`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("actions");
  const [day, setDay] = useState(localToday);
  const [addedDate, setAddedDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const pinned = note.isPinned === true;
  const archived = note.isArchived === true;

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false);
    setPanel("actions");
    setError("");
    setStatus("");
    if (restoreFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setPanel("actions");
      setError("");
      setStatus("");
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      setPanel("actions");
      setError("");
      setStatus("");
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const button = buttonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;
      const rect = button.getBoundingClientRect();
      const width = menu.offsetWidth || 256;
      const height = menu.offsetHeight;
      let top = rect.bottom + 6;
      if (height > 0 && top + height > window.innerHeight - 8) {
        const above = rect.top - height - 6;
        if (above >= 8) top = above;
      }
      let left = rect.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setCoords({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, panel, error, status, pending]);

  useEffect(() => {
    if (!open) return;
    if (panel === "date") {
      dateRef.current?.focus();
      return;
    }
    if (panel === "actions") {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
      return;
    }
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [open, panel]);

  const runLocked = async (work: () => Promise<void>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      await work();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const saveFlags = async (patch: NoteFlagPatch): Promise<boolean> => {
    const body = noteFlagPayload(note, patch);
    try {
      const updated = await apiFetch<Record<string, unknown>>(`/notes/${note.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      queryClient.setQueriesData({ queryKey: ["notes"] }, (old) => {
        if (!Array.isArray(old)) return old;
        return patchNoteFlags(
          old as { id: number; isPinned?: boolean; isArchived?: boolean }[],
          note.id,
          body
        );
      });
      queryClient.setQueryData(["note", String(note.id)], (old) =>
        old && typeof old === "object" ? { ...old, ...updated, ...body } : old
      );
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note", String(note.id)] });
      return true;
    } catch {
      setError("Could not update this note.");
      return false;
    }
  };

  const togglePin = () =>
    runLocked(async () => {
      const next = !pinned;
      const ok = await saveFlags({ isPinned: next });
      if (ok) setStatus(next ? "Pinned." : "Unpinned.");
    });

  const toggleArchive = () =>
    runLocked(async () => {
      const next = !archived;
      const ok = await saveFlags({ isArchived: next });
      if (!ok) return;
      if (next && variant === "page") {
        router.push("/notes?notice=archived");
        return;
      }
      onNotice?.(next ? "Archived." : "Unarchived.");
      closeMenu(false);
    });

  const copyNote = (format: "text" | "markdown") =>
    runLocked(async () => {
      try {
        let content = note.content ?? "";
        if (variant === "card") {
          const full = await apiFetch<{ content?: string | null }>(`/notes/${note.id}`);
          content = full.content ?? "";
        }
        const text =
          format === "markdown"
            ? noteClipboardMarkdown(note.title, content)
            : noteClipboardText(note.title, content);
        if (!navigator.clipboard?.writeText) throw new Error("clipboard");
        await navigator.clipboard.writeText(text);
        setStatus(format === "markdown" ? "Copied as Markdown." : "Copied as text.");
      } catch {
        setError("Could not copy.");
      }
    });

  const addToDay = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCalendarDateKey(day)) {
      setError("Pick a day.");
      return;
    }
    void runLocked(async () => {
      try {
        await createCalendarEvent(noteCalendarEvent(note, day));
        invalidateCalendar();
        setAddedDate(day);
        setPanel("added");
      } catch {
        setError("Could not add this note to that day.");
      }
    });
  };

  const openDate = () => {
    setDay(localToday());
    setError("");
    setStatus("");
    setPanel("date");
  };

  const printNote = () => {
    if (variant === "page") {
      closeMenu(false);
      window.print();
      return;
    }
    router.push(`/notes/${note.id}?print=1`);
  };

  const turnIntoContract = () => {
    router.push(`/habits/new?originNoteId=${note.id}`);
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (panel !== "actions") return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.findIndex((item) => item === document.activeElement);
    if (event.key === "Home") {
      items[0]?.focus();
      return;
    }
    if (event.key === "End") {
      items[items.length - 1]?.focus();
      return;
    }
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next = items[(current + delta + items.length) % items.length];
    next?.focus();
  };

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role={panel === "actions" ? "menu" : "dialog"}
            aria-label={
              panel === "date"
                ? "Add to a calendar day"
                : panel === "added"
                  ? "Added to the calendar"
                  : "Note actions"
            }
            onKeyDown={onMenuKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            style={{
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              visibility: coords ? "visible" : "hidden",
            }}
            className="fixed z-[80] w-64 rounded-md border border-white/10 bg-zinc-800 shadow-xl"
          >
            {panel === "actions" && (
              <div className="py-1">
                <button type="button" role="menuitem" disabled={pending} onClick={turnIntoContract} className={menuItemClass}>
                  Turn into a contract
                </button>
                <button type="button" role="menuitem" disabled={pending} onClick={openDate} className={menuItemClass}>
                  Add to a calendar day
                </button>
                <button type="button" role="menuitem" disabled={pending} onClick={togglePin} className={menuItemClass}>
                  {pinned ? "Unpin" : "Pin"}
                </button>
                <button type="button" role="menuitem" disabled={pending} onClick={toggleArchive} className={menuItemClass}>
                  {archived ? "Unarchive" : "Archive"}
                </button>
                <button type="button" role="menuitem" disabled={pending} onClick={() => copyNote("text")} className={menuItemClass}>
                  Copy as text
                </button>
                <button type="button" role="menuitem" disabled={pending} onClick={() => copyNote("markdown")} className={menuItemClass}>
                  Copy as Markdown
                </button>
                <button type="button" role="menuitem" disabled={pending} onClick={printNote} className={menuItemClass}>
                  Print / Save as PDF
                </button>
              </div>
            )}
            {panel === "date" && (
              <form onSubmit={addToDay} className="flex flex-col gap-2 p-3">
                <label htmlFor={dateId} className="text-xs text-slate-400">
                  Calendar day
                </label>
                <TextField
                  ref={dateRef}
                  id={dateId}
                  type="date"
                  required
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setPanel("actions");
                    }}
                    className="tap-target px-2 py-1.5 text-sm text-slate-400 hover:text-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="tap-target rounded-md border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"
                  >
                    {pending ? "Adding…" : "Add"}
                  </button>
                </div>
              </form>
            )}
            {panel === "added" && addedDate && (
              <div className="flex flex-col gap-1 p-3 text-sm text-slate-300">
                <p>Added to the calendar.</p>
                <Link
                  href={`/calendar?date=${addedDate}`}
                  className="text-cyan-300 hover:underline"
                >
                  Open {formatCalendarDay(addedDate)}
                </Link>
              </div>
            )}
            {status && (
              <p role="status" className="px-3 pb-2 text-xs text-slate-400">
                {status}
              </p>
            )}
            {error && (
              <p role="alert" className="px-3 pb-2 text-xs text-rose-300">
                {error}
              </p>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={
        variant === "card" ? "absolute right-3 top-3 z-20" : "relative"
      }
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Note actions"
        title="Note actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((value) => {
            if (!value) {
              setPanel("actions");
              setError("");
              setStatus("");
              setCoords(null);
            }
            return !value;
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setPanel("actions");
            setError("");
            setStatus("");
            setOpen(true);
          }
        }}
        className={
          variant === "page"
            ? "tap-target flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/15 hover:text-slate-100"
            : "tap-target flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white/10 hover:text-slate-200"
        }
      >
        <span aria-hidden="true" className="text-lg leading-none">
          …
        </span>
      </button>
      {menu}
    </div>
  );
}
