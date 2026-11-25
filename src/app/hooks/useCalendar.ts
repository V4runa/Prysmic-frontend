"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./useApi";
import {
  CalendarEventRecord,
  CalendarFeed,
  CalendarLinkType,
  CalendarRecurrence,
} from "../calendar/types";
import { calendarFeedPath } from "../lib/calendarDay";

export const calendarQueryKey = ["calendar"] as const;

/**
 * Fetches the aggregated feed for an inclusive local-day window. Keyed by the
 * range so navigating months keeps each window cached independently.
 */
export function useCalendarFeed(from: string, to: string) {
  return useQuery({
    queryKey: [...calendarQueryKey, from, to],
    queryFn: () =>
      apiFetch<CalendarFeed>(calendarFeedPath(from, to)),
    enabled: !!from && !!to,
    // The rest of the app keeps a page warm for five minutes. This feed is
    // what someone opens to see a check, a mood, a task, or an event they
    // just saved. A visit always asks again, including when a fetch that
    // started before the save lands afterwards and would otherwise look fresh.
    staleTime: 0,
  });
}

export function useInvalidateCalendar() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: calendarQueryKey });
}

export interface CalendarEventInput {
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
}

export function getCalendarEvent(id: number) {
  return apiFetch<CalendarEventRecord>(`/calendar/events/${id}`);
}

export function createCalendarEvent(input: CalendarEventInput) {
  return apiFetch<CalendarEventRecord>("/calendar/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCalendarEvent(
  id: number,
  input: Partial<CalendarEventInput>
) {
  return apiFetch<CalendarEventRecord>(`/calendar/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCalendarEvent(id: number) {
  return apiFetch<{ success: boolean }>(`/calendar/events/${id}`, {
    method: "DELETE",
  });
}

/** Toggle a habit check-in for a specific local day, from the calendar. */
export function toggleHabitCheck(habitId: number, date: string) {
  return apiFetch(`/habits/${habitId}/check`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

/** Quick-add a task due on a specific local day, from the calendar. */
export function quickAddTask(title: string, dueDate: string) {
  return apiFetch("/tasks", {
    method: "POST",
    body: JSON.stringify({ title, dueDate, priority: 2 }),
  });
}
