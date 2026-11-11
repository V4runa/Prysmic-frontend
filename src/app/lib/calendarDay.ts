// Day doorways between the calendar and the other modules.
// A day key is always YYYY-MM-DD. It is not parsed with `new Date(string)`,
// which would treat a date-only value as UTC midnight and shift the day.

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** True when `value` is a real calendar day, written YYYY-MM-DD. */
export function isCalendarDayKey(value: string | null | undefined): value is string {
  if (!value) return false;
  const match = DAY_KEY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** `2026-11-11` → `Nov 11, 2026`, without shifting the day across time zones. */
export function formatCalendarDay(day: string): string {
  const match = DAY_KEY.exec(day);
  if (!match || !isCalendarDayKey(day)) return day;
  const month = MONTHS[Number(match[2]) - 1];
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

/** The `date` query on `/calendar`, or null when it is missing or not a real day. */
export function calendarDayFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get("date");
  return isCalendarDayKey(value) ? value : null;
}

export function calendarDayHref(day: string): string {
  return `/calendar?date=${day}`;
}

export function noteHref(id: number): string {
  return `/notes/${id}`;
}

export function taskHref(id: number): string {
  return `/tasks?task=${id}`;
}

/** Positive task id from `task` on the tasks page. */
export function parseTaskFocus(search: string): number | null {
  const raw = new URLSearchParams(search).get("task");
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function habitHref(id: number, day?: string): string {
  if (day && isCalendarDayKey(day)) return `/habits/${id}?date=${day}`;
  return `/habits/${id}`;
}

export function moodHref(day: string): string {
  return `/moods?date=${day}`;
}

export function linkedItemHref(
  type: "note" | "task" | "habit",
  id: number,
  day?: string
): string {
  if (type === "note") return noteHref(id);
  if (type === "task") return taskHref(id);
  return habitHref(id, day);
}
