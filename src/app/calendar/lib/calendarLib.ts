import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarEventItem,
  CalendarHabitItem,
  CalendarItem,
  CalendarMoodItem,
  CalendarNoteItem,
  CalendarTaskItem,
} from "../types";
import { localDateKey } from "../../lib/date";

// Monday-start weeks (locked product decision).
const WEEK_OPTS = { weekStartsOn: 1 as const };

export const dayKey = (d: Date): string => format(d, "yyyy-MM-dd");
export const parseDayKey = (key: string): Date => parseISO(key);

export const shiftMonth = (key: string, n: number): string =>
  dayKey(addMonths(parseDayKey(key), n));
export const shiftWeek = (key: string, n: number): string =>
  dayKey(addWeeks(parseDayKey(key), n));
export const shiftDay = (key: string, n: number): string =>
  dayKey(addDays(parseDayKey(key), n));

/** The 6-week (or 5-week) grid covering the month that `anchor` falls in. */
export function monthGridRange(anchor: string): { from: string; to: string } {
  const date = parseDayKey(anchor);
  const from = startOfWeek(startOfMonth(date), WEEK_OPTS);
  const to = endOfWeek(endOfMonth(date), WEEK_OPTS);
  return { from: dayKey(from), to: dayKey(to) };
}

export function weekRange(anchor: string): { from: string; to: string } {
  const date = parseDayKey(anchor);
  return {
    from: dayKey(startOfWeek(date, WEEK_OPTS)),
    to: dayKey(endOfWeek(date, WEEK_OPTS)),
  };
}

export interface MonthCell {
  key: string;
  date: Date;
  inMonth: boolean;
}

/** Weeks → days matrix for the month grid. */
export function buildMonthMatrix(anchor: string): MonthCell[][] {
  const { from, to } = monthGridRange(anchor);
  const days = eachDayOfInterval({ start: parseDayKey(from), end: parseDayKey(to) });
  const anchorDate = parseDayKey(anchor);
  const weeks: MonthCell[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days.slice(i, i + 7).map((date) => ({
        key: dayKey(date),
        date,
        inMonth: isSameMonth(date, anchorDate),
      }))
    );
  }
  return weeks;
}

export function weekDays(anchor: string): MonthCell[] {
  const { from } = weekRange(anchor);
  const start = parseDayKey(from);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { key: dayKey(date), date, inMonth: true };
  });
}

// --------------------------- Item placement ---------------------------

/** Local day a single-placement item belongs to. */
export function itemDay(item: CalendarItem): string {
  switch (item.source) {
    case "task":
      return localDateKey(item.dueDate);
    case "note":
      return localDateKey(item.createdAt);
    case "habit":
    case "mood":
      return item.date;
    case "event":
      return item.startDate;
  }
}

export function eventCoversDay(ev: CalendarEventItem, day: string): boolean {
  return ev.startDate <= day && ev.endDate >= day;
}

export interface DayBuckets {
  events: CalendarEventItem[];
  tasks: CalendarTaskItem[];
  habits: CalendarHabitItem[];
  moods: CalendarMoodItem[];
  notes: CalendarNoteItem[];
}

function emptyBuckets(): DayBuckets {
  return { events: [], tasks: [], habits: [], moods: [], notes: [] };
}

/**
 * Pre-index a feed so each grid cell is O(1) to populate. Single-placement
 * items are grouped by their local day; events stay in a flat list because they
 * can span multiple days.
 */
export interface CalendarIndex {
  byDay: Map<string, DayBuckets>;
  events: CalendarEventItem[];
}

export function indexFeed(items: CalendarItem[]): CalendarIndex {
  const byDay = new Map<string, DayBuckets>();
  const events: CalendarEventItem[] = [];

  const bucket = (day: string): DayBuckets => {
    let b = byDay.get(day);
    if (!b) {
      b = emptyBuckets();
      byDay.set(day, b);
    }
    return b;
  };

  for (const item of items) {
    if (item.source === "event") {
      events.push(item);
      continue;
    }
    const day = itemDay(item);
    const b = bucket(day);
    if (item.source === "task") b.tasks.push(item);
    else if (item.source === "habit") b.habits.push(item);
    else if (item.source === "mood") b.moods.push(item);
    else if (item.source === "note") b.notes.push(item);
  }

  // Stable ordering within a day: tasks by priority desc (3=high first).
  for (const b of byDay.values()) {
    b.tasks.sort((a, c) => c.priority - a.priority);
    b.habits.sort((a, c) => a.title.localeCompare(c.title));
  }

  return { byDay, events };
}

/** Everything active on a given day (events expanded to each covered day). */
export function bucketsForDay(
  index: CalendarIndex,
  day: string
): DayBuckets {
  const base = index.byDay.get(day) ?? emptyBuckets();
  const events = index.events
    .filter((ev) => eventCoversDay(ev, day))
    .sort(sortEvents);
  return { ...base, events };
}

/** All-day events first, then timed events by start time. */
export function sortEvents(a: CalendarEventItem, b: CalendarEventItem): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  const at = a.startTime ?? "";
  const bt = b.startTime ?? "";
  if (at !== bt) return at.localeCompare(bt);
  return a.title.localeCompare(b.title);
}

// ----------------------- Month spanning-bar layout -----------------------

export interface BarSegment {
  event: CalendarEventItem;
  lane: number;
  startCol: number; // 0-6 within the week
  endCol: number; // 0-6 inclusive
  continuesLeft: boolean;
  continuesRight: boolean;
}

export interface WeekBarLayout {
  segments: BarSegment[];
  laneCount: number;
  /** Hidden-bar count per column (events beyond maxLanes). */
  overflowByCol: number[];
}

/**
 * Greedy lane-packing of event bars across one week row. Longer/earlier events
 * take the top lanes; anything past `maxLanes` is counted as per-column
 * overflow so the cell can render a "+N more" affordance.
 */
export function layoutWeekBars(
  week: MonthCell[],
  events: CalendarEventItem[],
  maxLanes: number
): WeekBarLayout {
  const weekStart = week[0].key;
  const weekEnd = week[6].key;
  const startDate = parseDayKey(weekStart);

  const overlapping = events
    .filter((ev) => ev.startDate <= weekEnd && ev.endDate >= weekStart)
    .map((ev) => {
      const rawStart = differenceInCalendarDays(parseDayKey(ev.startDate), startDate);
      const rawEnd = differenceInCalendarDays(parseDayKey(ev.endDate), startDate);
      return {
        event: ev,
        startCol: Math.max(0, rawStart),
        endCol: Math.min(6, rawEnd),
        continuesLeft: rawStart < 0,
        continuesRight: rawEnd > 6,
      };
    })
    .sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      const lenA = a.endCol - a.startCol;
      const lenB = b.endCol - b.startCol;
      if (lenA !== lenB) return lenB - lenA;
      return sortEvents(a.event, b.event);
    });

  const laneEnds: number[] = []; // last occupied col per lane
  const segments: BarSegment[] = [];
  const overflowByCol = new Array(7).fill(0);

  for (const seg of overlapping) {
    let lane = laneEnds.findIndex((end) => end < seg.startCol);
    if (lane === -1) lane = laneEnds.length;

    if (lane >= maxLanes) {
      for (let c = seg.startCol; c <= seg.endCol; c++) overflowByCol[c] += 1;
      continue;
    }

    laneEnds[lane] = seg.endCol;
    segments.push({ ...seg, lane });
  }

  return {
    segments,
    laneCount: Math.min(laneEnds.length, maxLanes),
    overflowByCol,
  };
}

// ----------------------------- Formatting -----------------------------

/** "9:00 AM" from a stored "HH:MM:SS" local time. */
export function formatClock(time?: string | null): string {
  if (!time) return "";
  const [hRaw, m] = time.split(":");
  let h = parseInt(hRaw, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${period}`;
}

export function monthLabel(anchor: string): string {
  return format(parseDayKey(anchor), "MMMM yyyy");
}

export function weekLabel(anchor: string): string {
  const { from, to } = weekRange(anchor);
  const a = parseDayKey(from);
  const b = parseDayKey(to);
  if (isSameMonth(a, b)) return `${format(a, "MMM d")} – ${format(b, "d, yyyy")}`;
  return `${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
}

export function dayLabel(anchor: string): string {
  return format(parseDayKey(anchor), "EEEE, MMMM d, yyyy");
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
