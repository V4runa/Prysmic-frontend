"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { monthLabel, WEEKDAY_LABELS } from "../calendar/lib/calendarLib";
import { apiFetch, ApiError } from "../hooks/useApi";
import { calendarDayHref } from "../lib/calendarDay";
import {
  buildRecordDays,
  canStepRecordMonth,
  checkinRangeForMonth,
  checkinsPath,
  contractSignedDay,
  parseCheckins,
  stepRecordMonth,
} from "../lib/contractRecord";
import { localToday } from "../lib/date";
import { isMissingRecord } from "../lib/missingRecord";
import { tactileSubtle } from "../lib/motion";

const RECORD_KEPT: Record<string, string> = {
  cyan: "bg-cyan-400/30 text-cyan-50",
  violet: "bg-violet-400/30 text-violet-50",
  rose: "bg-rose-400/30 text-rose-50",
  amber: "bg-amber-400/30 text-amber-50",
  emerald: "bg-emerald-400/30 text-emerald-50",
  blue: "bg-blue-400/30 text-blue-50",
};

const RECORD_TODAY: Record<string, string> = {
  cyan: "ring-1 ring-inset ring-cyan-200/80",
  violet: "ring-1 ring-inset ring-violet-200/80",
  rose: "ring-1 ring-inset ring-rose-200/80",
  amber: "ring-1 ring-inset ring-amber-200/80",
  emerald: "ring-1 ring-inset ring-emerald-200/80",
  blue: "ring-1 ring-inset ring-blue-200/80",
};

export function checkinsQueryKey(habitId: number, from: string, to: string) {
  return ["habit-checkins", habitId, from, to] as const;
}

export default function ContractRecord({
  habitId,
  createdAt,
  color,
}: {
  habitId: number;
  createdAt?: string | null;
  color?: string;
}) {
  const [anchor, setAnchor] = useState(() => localToday());
  const today = localToday();
  const range = checkinRangeForMonth(anchor);
  const keptClass = RECORD_KEPT[color ?? "cyan"] ?? RECORD_KEPT.cyan;
  const todayClass = RECORD_TODAY[color ?? "cyan"] ?? RECORD_TODAY.cyan;

  const query = useQuery({
    queryKey: checkinsQueryKey(habitId, range.from, range.to),
    queryFn: async () => {
      const body = await apiFetch<unknown>(checkinsPath(habitId, anchor));
      const parsed = parseCheckins(body);
      if (!parsed) throw new Error("Unexpected check-in record");
      return parsed;
    },
    retry: (failureCount, err) => {
      if (isMissingRecord(err)) return false;
      if (err instanceof ApiError && err.status === 400) return false;
      return failureCount < 2;
    },
  });

  const signedDay = contractSignedDay(createdAt, query.data);
  const weeks = query.data
    ? buildRecordDays({
        anchor,
        today,
        signedDay,
        dates: query.data.dates,
      })
    : [];
  const title = monthLabel(anchor);
  const canForward = canStepRecordMonth(anchor, today, 1);

  return (
    <section
      className="max-w-sm"
      aria-labelledby="contract-record-title"
      aria-busy={query.isPending && !query.data}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 id="contract-record-title" className="text-xs text-slate-400">
            Record
          </h3>
          <p className="text-sm text-slate-100" aria-live="polite">
            {title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <motion.button
            type="button"
            {...tactileSubtle}
            aria-label="Earlier month"
            onClick={() => setAnchor((current) => stepRecordMonth(current, today, -1))}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </motion.button>
          <motion.button
            type="button"
            {...tactileSubtle}
            aria-label="Later month"
            disabled={!canForward}
            onClick={() => setAnchor((current) => stepRecordMonth(current, today, 1))}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      {query.isError && !query.data ? (
        <div className="mt-3 flex flex-col items-start gap-2">
          <p className="text-sm text-slate-400">This month could not be loaded.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="text-sm text-slate-300 underline decoration-white/20 underline-offset-2 hover:text-slate-100"
          >
            Try again
          </button>
        </div>
      ) : !query.data ? (
        <p className="mt-3 text-sm text-slate-400">Loading this month.</p>
      ) : (
        <div className="mt-3" role="grid" aria-label={`${title} record`}>
          <div role="row" className="grid grid-cols-7">
            {WEEKDAY_LABELS.map((label) => (
              <div
                role="columnheader"
                key={label}
                className="pb-1 text-center text-[10px] font-medium uppercase tracking-widest text-slate-500"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {weeks.map((week) => (
              <div role="row" key={week[0]?.key} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const number = Number(day.key.slice(8, 10));
                  const className = clsx(
                    "flex h-11 w-full items-center justify-center rounded-md text-sm",
                    day.beforeContract && "text-slate-600",
                    !day.beforeContract && !day.inMonth && "text-slate-600",
                    !day.beforeContract && day.inMonth && !day.kept && "text-slate-300",
                    day.kept && keptClass,
                    day.isToday && todayClass
                  );
                  return (
                    <div role="gridcell" key={day.key} aria-label={day.kept ? undefined : day.label} className="min-w-0">
                      {day.kept ? (
                        <Link
                          href={calendarDayHref(day.key)}
                          aria-label={day.label}
                          className={className}
                        >
                          {number}
                        </Link>
                      ) : (
                        <span className={className}>{number}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
