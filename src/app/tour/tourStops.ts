/**
 * The six rooms of the first-run walk, in the order the guide travels.
 * Pure data so a native shell can reuse the same route, copy, and targets.
 */

export const TOUR_STOP_IDS = [
  "notes",
  "tags",
  "tasks",
  "contracts",
  "calendar",
  "moods",
] as const;

export type TourStopId = (typeof TOUR_STOP_IDS)[number];

export type TourOptional = "tag" | "task" | "mood" | null;

export type TourStop = {
  id: TourStopId;
  /** Exact path. Sub-routes such as /notes/new are not this stop. */
  route: string;
  /** Nav href that brightens while the guide is in flight. */
  navHref: string;
  /** Element the light pool opens around. */
  target: string;
  /** Where the guide arcs before the route changes. */
  waypoint: string;
  title: string;
  body: string;
  /** Shown for a moment after the optional action. */
  ack: string | null;
  optional: TourOptional;
  /** Mote gathered at this stop. Null on moods; that color arrives with the finale. */
  mote: string | null;
  /** Screen-reader name, without the stop number. */
  label: string;
};

export const TOUR_COPY = {
  welcomeLead: "This is your notebook. A quiet place for your thoughts, your days, and how you feel.",
  welcomeAsk: "Shall I show you around? It takes about a minute.",
  showMe: "Show me around",
  lookAlone: "I'll look on my own",
  tagAck: "That tag can go on any note or task.",
  taskAck: "Added. When you finish it, it shows on that day in your calendar.",
  notToday: "Not today",
  notTodayLine: "The room lights up the first time you log a mood.",
  leave: "Leave tour",
  leftLine: "The tour is in Settings whenever you want it.",
  homeLine: "Welcome home. You can walk this again anytime from Settings.",
  litLine: "Your mood already lights the room.",
  back: "Back",
  next: "Next",
} as const;

/** Spectrum motes. Same hues as PrismBackdrop and the calendar source chips. */
export const TOUR_MOTE = {
  guide: "#67e8f9",
  core: "#a5f3fc",
  notes: "#a78bfa",
  tags: "#a5f3fc",
  tasks: "#7dd3fc",
  contracts: "#fcd34d",
  moods: "#6ee7b7",
  scrim: "#06070a",
  night: "#13161a",
} as const;

export const SCRIM_ARRIVAL = 0.88;
export const SCRIM_STOP = 0.62;

/** PageTransition's curve. Flights use it so the guide and the page agree. */
export const PAGE_EASE = [0.22, 1, 0.36, 1] as const;

export const TOUR_STOPS: readonly TourStop[] = [
  {
    id: "notes",
    route: "/notes",
    navHref: "/notes",
    target: "[data-tour='notes-create']",
    waypoint: "[data-tour-nav='/notes']",
    title: "Notes",
    body: "This is where your thoughts live. Write anything, finished or not.",
    ack: null,
    optional: null,
    mote: TOUR_MOTE.notes,
    label: "Notes",
  },
  {
    id: "tags",
    route: "/tags",
    navHref: "/tags",
    target: "[data-tour='tags-create']",
    waypoint: "[data-tour='manage-tags']",
    title: "Tag Codex",
    body: "Tags gather notes and tasks by theme. Name one now if you like, or keep walking.",
    ack: TOUR_COPY.tagAck,
    optional: "tag",
    mote: TOUR_MOTE.tags,
    label: "Tags",
  },
  {
    id: "tasks",
    route: "/tasks",
    navHref: "/tasks",
    target: "[data-tour='tasks-add']",
    waypoint: "[data-tour-nav='/tasks']",
    title: "Tasks",
    body: "Things to do, kept short. Type one and press Enter.",
    ack: TOUR_COPY.taskAck,
    optional: "task",
    mote: TOUR_MOTE.tasks,
    label: "Tasks",
  },
  {
    id: "contracts",
    route: "/habits",
    navHref: "/habits",
    target: "[data-tour='contracts-heading']",
    waypoint: "[data-tour-nav='/habits']",
    title: "Contracts",
    body: "A contract is a small promise to yourself. Check in each day and watch it hold.",
    ack: null,
    optional: null,
    mote: TOUR_MOTE.contracts,
    label: "Contracts",
  },
  {
    id: "calendar",
    route: "/calendar",
    navHref: "/calendar",
    target: "[data-tour='calendar-grid']",
    waypoint: "[data-tour-nav='/calendar']",
    title: "Calendar",
    body: "Everything meets here. Tasks, contracts, events and moods, day by day.",
    ack: null,
    optional: null,
    mote: null,
    label: "Calendar",
  },
  {
    id: "moods",
    route: "/moods",
    navHref: "/moods",
    target: "[data-tour='mood-grid']",
    waypoint: "[data-tour-nav='/moods']",
    title: "Last stop",
    body: "One small thing before you settle in.",
    ack: null,
    optional: "mood",
    mote: null,
    label: "Moods",
  },
];

export function tourStopByIndex(index: number): TourStop | null {
  return TOUR_STOPS[index] ?? null;
}

export function tourStopIndex(id: TourStopId): number {
  return TOUR_STOP_IDS.indexOf(id);
}

/** True only for the stop's own page, not a nested editor. */
export function routeMatches(pathname: string, route: string): boolean {
  return pathname === route;
}

export function stopIndexForPath(pathname: string): number {
  return TOUR_STOPS.findIndex((stop) => routeMatches(pathname, stop.route));
}

export function welcomeHeading(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "Welcome.";
  const shown = trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
  return `Welcome, ${shown}.`;
}

/** Soft near-black behind tour words. A gradient, not a blur, so phones stay steady. */
export const TOUR_WASH = {
  background:
    "linear-gradient(180deg, rgba(6,7,10,0.97) 0%, rgba(8,10,14,0.96) 72%, rgba(6,7,10,0.94) 100%)",
  borderRadius: 18,
  padding: "14px 16px 12px",
  boxSizing: "border-box" as const,
} as const;

export function stopAnnouncement(index: number): string {
  const stop = tourStopByIndex(index);
  if (!stop) return "";
  return `Stop ${index + 1} of ${TOUR_STOPS.length}, ${stop.label}. ${stop.body}`;
}
