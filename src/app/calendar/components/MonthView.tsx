"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Plus } from "lucide-react";
import {
  buildMonthMatrix,
  bucketsForDay,
  CalendarIndex,
  dayStats,
  filterBuckets,
  layoutWeekBars,
  SourceFilter,
  WEEKDAY_LABELS,
  WeekBarLayout,
  formatClock,
} from "../lib/calendarLib";
import { getEventColor, SOURCE_ACCENT } from "../../lib/calendarColors";
import { resolveMoodVisual } from "../../lib/moodColors";
import { localToday } from "../../lib/date";
import DaySummary from "./DaySummary";
import DayAura from "./DayAura";
import HabitProgressRing from "./HabitProgressRing";

const BAR_H = 18;
const BAR_GAP = 3;
const DATE_ROW = 22;
const MAX_LANES = 3;

const EMPTY_LAYOUT: WeekBarLayout = {
  segments: [],
  laneCount: 0,
  overflowByCol: new Array(7).fill(0),
};

const perfectGlow =
  "radial-gradient(circle at 50% 100%, rgba(251,191,36,0.20), transparent 70%)";

interface MonthViewProps {
  anchor: string;
  index: CalendarIndex;
  sources: SourceFilter;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onCreateEvent: (date: string) => void;
  onOpenEvent: (eventId: number) => void;
}

export default function MonthView(props: MonthViewProps) {
  const weeks = useMemo(() => buildMonthMatrix(props.anchor), [props.anchor]);
  return (
    <>
      <div className="hidden sm:flex flex-col h-full min-h-0">
        <DesktopMonth {...props} weeks={weeks} />
      </div>
      <div className="sm:hidden flex flex-col h-full min-h-0">
        <MobileMonth {...props} weeks={weeks} />
      </div>
    </>
  );
}

type InnerProps = MonthViewProps & { weeks: ReturnType<typeof buildMonthMatrix> };

function DesktopMonth({
  weeks,
  index,
  sources,
  anchor,
  selectedDay,
  onSelectDay,
  onCreateEvent,
  onOpenEvent,
}: InnerProps) {
  const today = localToday();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="grid grid-cols-7 mb-1.5 shrink-0">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] uppercase tracking-widest text-slate-500 font-semibold"
          >
            {d}
          </div>
        ))}
      </div>

      <motion.div
        key={anchor}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex-1 overflow-y-auto app-scroll min-h-0 flex flex-col gap-1"
      >
        {weeks.map((week, wi) => {
          const layout = sources.event
            ? layoutWeekBars(week, index.events, MAX_LANES)
            : EMPTY_LAYOUT;
          const barsRegion = layout.laneCount * (BAR_H + BAR_GAP);

          return (
            <div key={wi} className="relative flex-1 min-h-[96px]">
              {/* Day cells */}
              <div className="grid grid-cols-7 h-full gap-1">
                {week.map((cell, ci) => {
                  const b = filterBuckets(bucketsForDay(index, cell.key), sources);
                  const stats = dayStats(b);
                  const mood = b.moods[0];
                  const moodViz = mood
                    ? resolveMoodVisual({
                        moodType: mood.moodType,
                        emoji: mood.emoji,
                        color: mood.color ?? undefined,
                      })
                    : null;

                  const barOverflow = layout.overflowByCol[ci] || 0;
                  const isToday = cell.key === today;
                  const isSelected = cell.key === selectedDay;

                  return (
                    <div
                      key={cell.key}
                      onClick={() => onSelectDay(cell.key)}
                      className={clsx(
                        "group relative flex flex-col rounded-lg border px-1.5 pb-1 overflow-hidden cursor-pointer transition-colors",
                        cell.inMonth
                          ? "bg-white/[0.03] hover:bg-white/[0.06]"
                          : "bg-transparent text-slate-600",
                        stats.isPerfect
                          ? "border-amber-300/40"
                          : cell.inMonth
                          ? "border-white/10"
                          : "border-white/5",
                        isSelected && "ring-1 ring-cyan-300/50 bg-cyan-400/5"
                      )}
                    >
                      <DayAura
                        moodColorToken={moodViz?.color}
                        heat={moodViz ? 0 : stats.heat}
                      />
                      {stats.isPerfect && (
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{ background: perfectGlow }}
                        />
                      )}

                      {/* Date row */}
                      <div
                        className="relative flex items-center justify-between"
                        style={{ height: DATE_ROW }}
                      >
                        <span
                          className={clsx(
                            "text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full",
                            isToday
                              ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-300/60"
                              : cell.inMonth
                              ? "text-slate-300"
                              : "text-slate-600"
                          )}
                        >
                          {cell.date.getDate()}
                        </span>
                        <span className="flex items-center gap-1">
                          {moodViz && (
                            <span className="text-sm leading-none group-hover:opacity-0 transition-opacity">
                              {moodViz.emoji}
                            </span>
                          )}
                          {stats.habitExpected > 0 && (
                            <span className="group-hover:opacity-0 transition-opacity">
                              <HabitProgressRing
                                done={stats.habitDone}
                                total={stats.habitExpected}
                                size={16}
                                strokeWidth={2.5}
                              />
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateEvent(cell.key);
                            }}
                            aria-label="New event"
                            className="absolute right-0 opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-cyan-300"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>

                      {/* Reserve space for the spanning bars overlay */}
                      <div style={{ height: barsRegion }} />

                      {/* Segmented summary of the day's non-event sources */}
                      <DaySummary buckets={b} eventOverflow={barOverflow} className="relative" />
                    </div>
                  );
                })}
              </div>

              {/* Spanning event bars overlay */}
              <div className="absolute left-0 right-0 pointer-events-none" style={{ top: DATE_ROW + 2 }}>
                {layout.segments.map((seg) => {
                  const c = getEventColor(seg.event.color);
                  const leftPct = (seg.startCol / 7) * 100;
                  const widthPct = ((seg.endCol - seg.startCol + 1) / 7) * 100;
                  return (
                    <button
                      key={`${seg.event.key}-${seg.lane}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEvent(seg.event.id);
                      }}
                      style={{
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                        top: seg.lane * (BAR_H + BAR_GAP),
                        height: BAR_H,
                      }}
                      className={clsx(
                        "pointer-events-auto absolute flex items-center px-1.5 text-[10px] font-medium truncate border transition",
                        c.bar,
                        c.barHover,
                        seg.continuesLeft ? "rounded-l-none border-l-0" : "rounded-l",
                        seg.continuesRight ? "rounded-r-none border-r-0" : "rounded-r"
                      )}
                      title={seg.event.title}
                    >
                      <span className="truncate">
                        {!seg.event.allDay && !seg.continuesLeft && seg.event.startTime
                          ? `${formatClock(seg.event.startTime)} `
                          : ""}
                        {seg.event.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function MobileMonth({
  weeks,
  index,
  sources,
  anchor,
  selectedDay,
  onSelectDay,
}: InnerProps) {
  const today = localToday();
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="grid grid-cols-7 mb-1 shrink-0">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            {d[0]}
          </div>
        ))}
      </div>
      <motion.div
        key={anchor}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex-1 overflow-y-auto app-scroll min-h-0 grid grid-rows-6 gap-1"
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell) => {
              const b = filterBuckets(bucketsForDay(index, cell.key), sources);
              const stats = dayStats(b);
              const mood = b.moods[0];
              const moodViz = mood
                ? resolveMoodVisual({
                    moodType: mood.moodType,
                    emoji: mood.emoji,
                    color: mood.color ?? undefined,
                  })
                : null;
              const dots: string[] = [];
              if (b.events.length) dots.push(getEventColor(b.events[0].color).dot);
              if (b.tasks.length) dots.push(SOURCE_ACCENT.task.dot);
              if (b.notes.length) dots.push(SOURCE_ACCENT.note.dot);
              const isToday = cell.key === today;
              const isSelected = cell.key === selectedDay;
              return (
                <button
                  key={cell.key}
                  onClick={() => onSelectDay(cell.key)}
                  className={clsx(
                    "relative flex flex-col items-center justify-start gap-1 rounded-lg border py-1.5 overflow-hidden transition-colors",
                    stats.isPerfect
                      ? "border-amber-300/40"
                      : cell.inMonth
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-white/5",
                    isSelected && "ring-1 ring-cyan-300/60 bg-cyan-400/10"
                  )}
                >
                  <DayAura
                    moodColorToken={moodViz?.color}
                    heat={moodViz ? 0 : stats.heat}
                  />
                  {stats.isPerfect && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: perfectGlow }}
                    />
                  )}
                  <span
                    className={clsx(
                      "relative text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                      isToday
                        ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-300/60"
                        : cell.inMonth
                        ? "text-slate-300"
                        : "text-slate-600"
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                  <span className="relative flex items-center gap-0.5 h-3.5">
                    {stats.habitExpected > 0 && (
                      <HabitProgressRing
                        done={stats.habitDone}
                        total={stats.habitExpected}
                        size={12}
                        strokeWidth={2}
                      />
                    )}
                    {moodViz ? (
                      <span className="text-[10px] leading-none">{moodViz.emoji}</span>
                    ) : (
                      dots.slice(0, 3).map((d, i) => (
                        <span key={i} className={clsx("h-1 w-1 rounded-full", d)} />
                      ))
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
