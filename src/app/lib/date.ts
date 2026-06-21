// Returns the user's *local* calendar date as YYYY-MM-DD.
//
// We intentionally avoid `toISOString()` here because that returns the UTC
// date, which can be a day ahead/behind the user's real day depending on
// timezone. Habit streaks are anchored to the user's local day, so the server
// is told which day "today" is from the client's perspective.
export function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
