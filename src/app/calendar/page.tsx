"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import Spinner from "../components/Spinner";
import { useCalendarFeed, useInvalidateCalendar } from "../hooks/useCalendar";
import {
  bucketsForDay,
  dayLabel,
  indexFeed,
  monthGridRange,
  monthLabel,
  shiftDay,
  shiftMonth,
  shiftWeek,
  weekLabel,
  weekRange,
} from "./lib/calendarLib";
import { CalendarView } from "./types";
import { localToday } from "../lib/date";
import { tactile } from "../lib/motion";
import MonthView from "./components/MonthView";
import WeekView from "./components/WeekView";
import DayAgenda from "./components/DayAgenda";
import ViewSwitcher from "./components/ViewSwitcher";
import EventModal from "./components/EventModal";
import CalendarLegend from "./components/CalendarLegend";

const VIEW_STORAGE_KEY = "prysmic.calendarView";

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => localToday());
  const [selectedDay, setSelectedDay] = useState(() => localToday());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    eventId: number | null;
    date: string | null;
  }>({ open: false, eventId: null, date: null });

  const [isNarrow, setIsNarrow] = useState(false);
  const [isXl, setIsXl] = useState(false);

  const invalidateCalendar = useInvalidateCalendar();

  // Responsive flags drive the available views and panel-vs-sheet behavior.
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 639px)");
    const xl = window.matchMedia("(min-width: 1280px)");
    const sync = () => {
      setIsNarrow(narrow.matches);
      setIsXl(xl.matches);
    };
    sync();
    narrow.addEventListener("change", sync);
    xl.addEventListener("change", sync);
    return () => {
      narrow.removeEventListener("change", sync);
      xl.removeEventListener("change", sync);
    };
  }, []);

  // Initialize the view from the last-used preference, else by screen size.
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY) as CalendarView | null;
    if (saved === "month" || saved === "week" || saved === "day") setView(saved);
    else setView(window.matchMedia("(max-width: 639px)").matches ? "day" : "month");
  }, []);

  // Week view isn't offered on phones; fall back to Day if the screen shrinks.
  useEffect(() => {
    if (isNarrow && view === "week") setView("day");
  }, [isNarrow, view]);

  const availableViews: CalendarView[] = isNarrow
    ? ["month", "day"]
    : ["month", "week", "day"];

  const changeView = (next: CalendarView) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  // Fetch window depends on the active view.
  const range = useMemo(() => {
    if (view === "month") return monthGridRange(anchor);
    if (view === "week") return weekRange(anchor);
    return { from: anchor, to: anchor };
  }, [view, anchor]);

  const { data, isLoading, isError } = useCalendarFeed(range.from, range.to);
  const index = useMemo(() => indexFeed(data?.items ?? []), [data]);

  const title =
    view === "month" ? monthLabel(anchor) : view === "week" ? weekLabel(anchor) : dayLabel(anchor);

  const goPrev = () =>
    setAnchor((a) =>
      view === "month" ? shiftMonth(a, -1) : view === "week" ? shiftWeek(a, -1) : shiftDay(a, -1)
    );
  const goNext = () =>
    setAnchor((a) =>
      view === "month" ? shiftMonth(a, 1) : view === "week" ? shiftWeek(a, 1) : shiftDay(a, 1)
    );
  const goToday = () => {
    const t = localToday();
    setAnchor(t);
    setSelectedDay(t);
  };

  const handleSelectDay = (day: string) => {
    setSelectedDay(day);
    if (!isXl) setSheetOpen(true);
  };

  const openCreate = (date: string) =>
    setModal({ open: true, eventId: null, date });
  const openEvent = (eventId: number) =>
    setModal({ open: true, eventId, date: null });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const selectedBuckets = useMemo(
    () => bucketsForDay(index, selectedDay),
    [index, selectedDay]
  );
  const dayViewBuckets = useMemo(
    () => bucketsForDay(index, anchor),
    [index, anchor]
  );

  const showSidePanel = view !== "day";

  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4">
        <div className="w-full max-w-[1400px] h-full min-h-0 flex gap-4 xl:gap-6">
          {/* Main calendar surface */}
          <GlassPanel className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-100 tracking-wide">
                {title}
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center rounded-lg border border-white/10 bg-white/5">
                  <button
                    onClick={goPrev}
                    aria-label="Previous"
                    className="tap-target flex items-center justify-center p-1.5 text-slate-300 hover:text-cyan-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={goToday}
                    className="tap-target px-2 text-xs font-medium text-slate-300 hover:text-cyan-300"
                  >
                    Today
                  </button>
                  <button
                    onClick={goNext}
                    aria-label="Next"
                    className="tap-target flex items-center justify-center p-1.5 text-slate-300 hover:text-cyan-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <ViewSwitcher views={availableViews} value={view} onChange={changeView} />

                <motion.button
                  {...tactile}
                  onClick={() => openCreate(view === "day" ? anchor : selectedDay)}
                  className="tap-target flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-300/30 text-cyan-200 rounded-lg text-xs font-medium"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Event</span>
                </motion.button>
              </div>
            </div>

            {/* Legend — keeps the grid's iconography self-explanatory */}
            {(view === "month" || view === "week") && !isLoading && !isError && (
              <CalendarLegend />
            )}

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner label="Gathering your days..." />
                </div>
              ) : isError ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-rose-400 text-center">Could not load your calendar.</p>
                </div>
              ) : view === "month" ? (
                <MonthView
                  anchor={anchor}
                  index={index}
                  selectedDay={selectedDay}
                  onSelectDay={handleSelectDay}
                  onCreateEvent={openCreate}
                  onOpenEvent={openEvent}
                />
              ) : view === "week" ? (
                <WeekView
                  anchor={anchor}
                  index={index}
                  selectedDay={selectedDay}
                  onSelectDay={handleSelectDay}
                  onCreateEvent={openCreate}
                  onOpenEvent={openEvent}
                />
              ) : (
                <DayAgenda
                  day={anchor}
                  buckets={dayViewBuckets}
                  onOpenEvent={openEvent}
                  onCreateEvent={openCreate}
                />
              )}
            </div>
          </GlassPanel>

          {/* Desktop xl side agenda panel */}
          {showSidePanel && (
            <aside className="hidden xl:flex w-[340px] shrink-0">
              <GlassPanel className="flex-1 min-h-0 flex flex-col">
                <DayAgenda
                  day={selectedDay}
                  buckets={selectedBuckets}
                  onOpenEvent={openEvent}
                  onCreateEvent={openCreate}
                />
              </GlassPanel>
            </aside>
          )}
        </div>
      </div>

      {/* Mobile / tablet day sheet */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {sheetOpen && showSidePanel && (
              <motion.div
                className="xl:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSheetOpen(false)}
              >
                <motion.div
                  className="w-full sm:max-w-md h-[80dvh] sm:h-[70dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-5 shadow-2xl shadow-black/50"
                  initial={{ y: "100%", opacity: 0.6 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0.6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSheetOpen(false)}
                    aria-label="Close"
                    className="tap-target self-end -mt-1 -mr-1 mb-1 flex items-center justify-center p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-h-0">
                    <DayAgenda
                      day={selectedDay}
                      buckets={selectedBuckets}
                      onOpenEvent={openEvent}
                      onCreateEvent={openCreate}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <EventModal
        open={modal.open}
        eventId={modal.eventId}
        initialDate={modal.date}
        onClose={closeModal}
        onSaved={invalidateCalendar}
      />
    </PageTransition>
  );
}
