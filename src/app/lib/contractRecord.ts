import { buildMonthMatrix, monthGridRange, shiftMonth } from "../calendar/lib/calendarLib";
import { isCalendarDayKey, formatCalendarDay } from "./calendarDay";
import { taskDueDayKey } from "./date";

/**
 * One month of a contract's kept days.
 *
 * GET /habits/:id/checkins?from=YYYY-MM-DD&to=YYYY-MM-DD
 * returns `{ from, to, dates }`. `dates` are the YYYY-MM-DD days the
 * contract was kept. The range is capped at about 62 days, so each request
 * is one calendar month (the Monday-start grid, including the leading and
 * trailing days).
 *
 * Days before the contract was signed come from `signedAt` or `createdAt`
 * on that response when the API sends one, and otherwise from the habit's
 * own `createdAt`.
 */
export const CHECKIN_RANGE_MAX_DAYS = 62;

const SIGNED_FIELDS = ["signedAt", "signedOn", "createdAt"] as const;

export type CheckinRecord = {
  from: string;
  to: string;
  dates: string[];
  /** Local calendar day the contract was signed, when the response includes one. */
  signedDay: string | null;
};

export type RecordDay = {
  key: string;
  inMonth: boolean;
  kept: boolean;
  beforeContract: boolean;
  isToday: boolean;
  label: string;
};

function yearMonthValue(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(day);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return Number(match[1]) * 12 + (month - 1);
}

/** Inclusive day count between two YYYY-MM-DD keys. Independent of timezone. */
export function inclusiveDaySpan(from: string, to: string): number {
  const start = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const end = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!start || !end) return Number.POSITIVE_INFINITY;
  const startUtc = Date.UTC(Number(start[1]), Number(start[2]) - 1, Number(start[3]));
  const endUtc = Date.UTC(Number(end[1]), Number(end[2]) - 1, Number(end[3]));
  return Math.round((endUtc - startUtc) / 86400000) + 1;
}

function dayFromUnknown(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const day = taskDueDayKey(value);
  return isCalendarDayKey(day) ? day : null;
}

/** The month grid the calendar already uses, kept inside the API's range cap. */
export function checkinRangeForMonth(anchor: string): { from: string; to: string } {
  const range = monthGridRange(anchor);
  if (inclusiveDaySpan(range.from, range.to) > CHECKIN_RANGE_MAX_DAYS) {
    throw new Error("Check-in range is too wide for one month");
  }
  return range;
}

export function checkinsPath(habitId: number, anchor: string): string {
  const { from, to } = checkinRangeForMonth(anchor);
  return `/habits/${habitId}/checkins?from=${from}&to=${to}`;
}

export function parseCheckins(body: unknown): CheckinRecord | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const from = dayFromUnknown(record.from);
  const to = dayFromUnknown(record.to);
  if (!from || !to || !Array.isArray(record.dates)) return null;
  const dates: string[] = [];
  for (const value of record.dates) {
    const day = dayFromUnknown(value);
    if (day && !dates.includes(day)) dates.push(day);
  }
  let signedDay: string | null = null;
  for (const field of SIGNED_FIELDS) {
    signedDay = dayFromUnknown(record[field]);
    if (signedDay) break;
  }
  return { from, to, dates, signedDay };
}

/**
 * Day the contract was signed. A field on the check-in response wins.
 * Otherwise the habit's `createdAt` is used.
 */
export function contractSignedDay(
  habitCreatedAt: string | null | undefined,
  record: { signedDay: string | null } | null | undefined
): string | null {
  if (record?.signedDay) return record.signedDay;
  return dayFromUnknown(habitCreatedAt);
}

export function canStepRecordMonth(anchor: string, today: string, direction: -1 | 1): boolean {
  if (direction < 0) return true;
  const next = shiftMonth(anchor, 1);
  const nextMonth = yearMonthValue(next);
  const current = yearMonthValue(today);
  if (nextMonth == null || current == null) return false;
  return nextMonth <= current;
}

/** Move one month. Forward stops on the month that contains `today`. */
export function stepRecordMonth(anchor: string, today: string, direction: -1 | 1): string {
  if (!canStepRecordMonth(anchor, today, direction)) return anchor;
  const next = shiftMonth(anchor, direction);
  const nextMonth = yearMonthValue(next);
  const current = yearMonthValue(today);
  if (nextMonth == null || current == null || nextMonth > current) return anchor;
  return next;
}

export function recordDayLabel(day: {
  key: string;
  kept: boolean;
  beforeContract: boolean;
  isToday: boolean;
}): string {
  const notes: string[] = [];
  if (day.isToday) notes.push("today");
  if (day.beforeContract) notes.push("before this contract");
  else if (day.kept) notes.push("kept");
  const base = formatCalendarDay(day.key);
  return notes.length ? `${base}, ${notes.join(", ")}` : base;
}

/** Monday-start weeks. Kept days are the dates the API returned, on that exact day. */
export function buildRecordDays(input: {
  anchor: string;
  today: string;
  signedDay: string | null;
  dates: readonly string[];
}): RecordDay[][] {
  const kept = new Set(input.dates.filter((day) => isCalendarDayKey(day)));
  return buildMonthMatrix(input.anchor).map((week) =>
    week.map((cell) => {
      const beforeContract = input.signedDay != null && cell.key < input.signedDay;
      const day = {
        key: cell.key,
        inMonth: cell.inMonth,
        kept: kept.has(cell.key) && !beforeContract,
        beforeContract,
        isToday: cell.key === input.today,
        label: "",
      };
      day.label = recordDayLabel(day);
      return day;
    })
  );
}

export function applyCheckinDate(record: CheckinRecord, day: string, kept: boolean): CheckinRecord {
  if (!isCalendarDayKey(day)) return record;
  const dates = record.dates.filter((value) => value !== day);
  if (kept) dates.push(day);
  return { ...record, dates };
}
