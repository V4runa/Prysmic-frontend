/**
 * Shared pieces for the note actions menu.
 *
 * Pin and archive always send the current tag ids. The previous notes API
 * cleared tags when `tagIds` was omitted; the newer API leaves omitted tags
 * alone. Sending the ids is safe for both. Both flags go along so a pin does
 * not clear archive on a server that writes every flag it receives.
 *
 * List responses are filtered again here. A server that does not understand
 * `archived=true` still returns every note, and this keeps archived notes off
 * the main list without reordering what the server sent.
 */

import { ApiError } from "../hooks/useApi";

export interface NoteFlagSource {
  tags?: { id: number }[] | null;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface NoteFlagPatch {
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface NoteFlagPayload {
  isPinned: boolean;
  isArchived: boolean;
  tagIds: number[];
}

export function noteFlagPayload(
  note: NoteFlagSource,
  patch: NoteFlagPatch
): NoteFlagPayload {
  return {
    isPinned: patch.isPinned ?? note.isPinned === true,
    isArchived: patch.isArchived ?? note.isArchived === true,
    tagIds: Array.isArray(note.tags) ? note.tags.map((tag) => tag.id) : [],
  };
}

export function patchNoteFlags<
  T extends { id: number; isPinned?: boolean; isArchived?: boolean },
>(notes: T[], id: number, flags: { isPinned: boolean; isArchived: boolean }): T[] {
  return notes.map((note) =>
    note.id === id
      ? { ...note, isPinned: flags.isPinned, isArchived: flags.isArchived }
      : note
  );
}

export function notesForList<T extends { isArchived?: boolean }>(
  notes: T[],
  archived: boolean
): T[] {
  return notes.filter((note) =>
    archived ? note.isArchived === true : note.isArchived !== true
  );
}

export interface NoteCalendarEventInput {
  title: string;
  description: null;
  allDay: true;
  startDate: string;
  endDate: null;
  startTime: null;
  endTime: null;
  color: "cyan";
  location: null;
  recurrence: "none";
  recurrenceEndDate: null;
  linkedType: "note";
  linkedId: number;
}

/** All-day calendar event titled with the note and linked back to it. */
export function noteCalendarEvent(
  note: { id: number; title: string },
  date: string
): NoteCalendarEventInput {
  return {
    title: note.title.trim() || "Note",
    description: null,
    allDay: true,
    startDate: date,
    endDate: null,
    startTime: null,
    endTime: null,
    color: "cyan",
    location: null,
    recurrence: "none",
    recurrenceEndDate: null,
    linkedType: "note",
    linkedId: note.id,
  };
}

export function parseOriginNoteId(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

export interface OriginRef {
  id: number;
  title: string;
}

export function readOriginNote(value: unknown): OriginRef | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { id?: unknown; title?: unknown };
  if (typeof record.id !== "number" || !Number.isFinite(record.id)) return null;
  if (typeof record.title !== "string") return null;
  return { id: record.id, title: record.title };
}

export function readOriginatedContracts(value: unknown): OriginRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const ref = readOriginNote(item);
    return ref ? [ref] : [];
  });
}

function errorText(err: unknown): string {
  if (!(err instanceof ApiError)) return "";
  return typeof err.body === "string" ? err.body : JSON.stringify(err.body ?? "");
}

/** A 400 that names a field the current server does not accept yet. */
export function apiErrorMentionsField(err: unknown, field: string): boolean {
  if (!(err instanceof ApiError) || err.status !== 400) return false;
  return errorText(err).toLowerCase().includes(field.toLowerCase());
}

export function isNoteNotFound(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 404) return false;
  return errorText(err).includes("Note not found");
}
