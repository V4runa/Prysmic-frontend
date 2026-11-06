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

// The hour (0-23, local) at which a new "logical" day begins for the purpose of
// logging habits and moods. Setting this to 6am gives late-night users grace:
// anything logged between midnight and 6am still counts toward the day that just
// ended, so someone recounting their day at 2am caps off *yesterday* rather than
// being forced to record for a day they never lived yet.
export const DAY_RESET_HOUR = 6;

// The current *logical* day for habit/mood logging and streaks (YYYY-MM-DD).
// Before DAY_RESET_HOUR this returns the previous calendar day. This is
// deliberately separate from `localToday()` — the calendar's "today" highlight
// stays anchored to the real calendar midnight.
export function logicalToday(): string {
  const shifted = new Date();
  shifted.setHours(shifted.getHours() - DAY_RESET_HOUR);
  return format(shifted);
}

// Step a YYYY-MM-DD key back by one day (local, DST-safe).
export function prevDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return format(d);
}
