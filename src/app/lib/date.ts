import { readDayResetHour } from "./preferences";

// Local-day date utilities.
//
// We intentionally avoid `toISOString()` (which returns the UTC date) so that
// streaks and "today" are anchored to the user's *local* calendar day rather
// than UTC, which can be a day ahead/behind depending on timezone.

function format(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The user's local calendar date for an arbitrary timestamp/date, as YYYY-MM-DD.
export function localDateKey(input: string | number | Date): string {
  return format(new Date(input));
}

// A date-only value (`YYYY-MM-DD`) and the UTC-midnight timestamp the API
// returns after storing one in a `timestamp` column. `new Date("YYYY-MM-DD")`
// is defined to be UTC midnight, and that instant's UTC calendar date is the
// day the user picked. Re-reading it with local getters shifts it to the
// previous day in timezones behind UTC (America/New_York on 2026-11-06 showed
// November 5th). A timestamp with a real time-of-day is an instant and stays
// on the local day, the same rule notes already use.
const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})$/;
const UTC_DATE_MIDNIGHT =
  /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)$/;

export function taskDueDayKey(input: string): string {
  const dateOnly = DATE_ONLY.exec(input);
  if (dateOnly) return dateOnly[1];
  const midnight = UTC_DATE_MIDNIGHT.exec(input);
  if (midnight) return midnight[1];
  return localDateKey(input);
}

// The user's local calendar date for right now, as YYYY-MM-DD.
export function localToday(): string {
  return format(new Date());
}

// Default hour (0-23, local) at which a new "logical" day begins for habits and
// moods. 6am gives late-night users grace: anything logged between midnight and
// 6am still counts toward the day that just ended. Settings can store another
// hour from midnight through 8 AM; logicalToday reads that preference unless a
// caller passes an hour explicitly.
export const DAY_RESET_HOUR = 6;

function boundaryHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 8) return DAY_RESET_HOUR;
  return hour;
}

// The current *logical* day for habit/mood logging and streaks (YYYY-MM-DD).
// Before the rollover hour this returns the previous calendar day. This is
// deliberately separate from `localToday()` — the calendar's "today" highlight
// stays anchored to the real calendar midnight. Week start stays Monday.
export function logicalToday(now = new Date(), resetHour = readDayResetHour()): string {
  const shifted = new Date(now);
  shifted.setHours(shifted.getHours() - boundaryHour(resetHour));
  return format(shifted);
}

// Step a YYYY-MM-DD key back by one day (local, DST-safe).
export function prevDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return format(d);
}
