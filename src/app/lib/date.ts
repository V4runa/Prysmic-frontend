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

// The user's local calendar date for right now, as YYYY-MM-DD.
export function localToday(): string {
  return format(new Date());
}
