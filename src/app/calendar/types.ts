// Mirrors the backend's normalised calendar feed (see
// Prysmic-backend/src/modules/calendar/calendar.types.ts). The aggregation
// endpoint returns native date/timestamp fields; the client buckets items onto
// the grid using the user's local timezone.

export type CalendarRecurrence = "none" | "daily" | "weekly" | "monthly";
export type CalendarLinkType = "note" | "task" | "habit";
export type CalendarSource = "event" | "task" | "habit" | "mood" | "note";

export interface CalendarLinkRef {
  type: CalendarLinkType;
  id: number;
  title: string;
}

export interface CalendarEventItem {
  source: "event";
  key: string;
  id: number;
  title: string;
  description?: string | null;
  color: string;
  location?: string | null;
  allDay: boolean;
  startDate: string; // YYYY-MM-DD (local)
  endDate: string; // YYYY-MM-DD (local, inclusive)
  startTime?: string | null; // HH:MM:SS
  endTime?: string | null;
  recurrence: CalendarRecurrence;
  isRecurringInstance: boolean;
  linked?: CalendarLinkRef;
}

export interface CalendarTaskItem {
  source: "task";
  id: number;
  title: string;
  priority: number;
  isComplete: boolean;
  dueDate: string; // ISO timestamp
}

export interface CalendarHabitItem {
  source: "habit";
  key: string;
  id: number;
  title: string;
  color: string;
  icon?: string | null;
  date: string; // YYYY-MM-DD (local)
  expected: boolean;
  checked: boolean;
}

export interface CalendarMoodItem {
  source: "mood";
  id: number;
  moodType: string;
  emoji: string;
  color?: string | null;
  date: string; // YYYY-MM-DD (local)
}

export interface CalendarNoteItem {
  source: "note";
  id: number;
  title: string;
  createdAt: string; // ISO timestamp
}

export type CalendarItem =
  | CalendarEventItem
  | CalendarTaskItem
  | CalendarHabitItem
  | CalendarMoodItem
  | CalendarNoteItem;

export interface CalendarFeed {
  from: string;
  to: string;
  items: CalendarItem[];
}

/** The full stored event (returned by GET /calendar/events/:id) for editing. */
export interface CalendarEventRecord {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  allDay: boolean;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  color: string;
  location?: string | null;
  recurrence: CalendarRecurrence;
  recurrenceEndDate?: string | null;
  linkedType?: CalendarLinkType | null;
  linkedId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type CalendarView = "month" | "week" | "day";
