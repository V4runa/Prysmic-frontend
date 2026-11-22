/**
 * The five rooms of the walk, in order.
 * Welcome and the close card are not steps. Copy is the approved text.
 *
 * Calendar events are their own records, separate from tasks
 * (the Events filter and EventModal), so the calendar line keeps them.
 */

export const TOUR_STEP_IDS = ["notes", "tasks", "contracts", "calendar", "moods"] as const;

export type TourStepId = (typeof TOUR_STEP_IDS)[number];

export type TourStep = {
  id: TourStepId;
  route: string;
  /** First visible match. Contracts use the create button when the list is empty. */
  target: string;
  title: string;
  body: string;
};

export const TOUR_WELCOME = {
  title: "Welcome to Prysmic",
  body: "This is your private notebook for notes, tasks, contracts, a calendar, and moods. This short tour shows you each area. You can skip it at any time.",
  start: "Start tour",
  skip: "Skip tour",
} as const;

export const TOUR_CLOSE = {
  title: "You're all set",
  body: "You can start this tour again anytime from Settings.",
  done: "Done",
} as const;

export const TOUR_CONTROLS = {
  skip: "Skip tour",
  back: "Back",
  next: "Next",
} as const;

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "notes",
    route: "/notes",
    target: "[data-tour='notes-create']",
    title: "Notes",
    body: "This is where you write. Select New Note to start one. You can add tags to a note to connect it with related notes and tasks.",
  },
  {
    id: "tasks",
    route: "/tasks",
    target: "[data-tour='tasks-field']",
    title: "Tasks",
    body: "This is your to-do list. Type a task and press Enter to add it. When you mark a task done, it shows on that day in the calendar.",
  },
  {
    id: "contracts",
    route: "/habits",
    target: "[data-tour='contracts-create'], [data-tour='contracts-list']",
    title: "Contracts",
    body: "A contract is a daily commitment you set for yourself. Add one, then check it off on this page each day. The days you keep it are saved here and on the calendar.",
  },
  {
    id: "calendar",
    route: "/calendar",
    target: "[data-tour='calendar-today']",
    title: "Calendar",
    body: "The calendar shows your tasks, contracts, events, and moods by day. Select a day to see what is on it, or select an item to open it.",
  },
  {
    id: "moods",
    route: "/moods",
    target: "[data-tour='mood-grid']",
    title: "Moods",
    body: "Here you can log how you feel today. Select a mood, or add your own. If you log one, the notebook takes on that color for the rest of the day.",
  },
];

export const TOUR_STEP_COUNT = TOUR_STEPS.length;

/** How long the card takes to fade. The route waits until this has finished. */
export const TOUR_FADE_MS = 160;

export function tourStepByIndex(index: number): TourStep | null {
  return TOUR_STEPS[index] ?? null;
}

/** Route the card should be standing on. Welcome stays on Notes. Close stays where it is. */
export function tourRouteFor(phase: "welcome" | "step" | "close" | "done", index: number): string | null {
  if (phase === "close") return null;
  if (phase === "step") return tourStepByIndex(index)?.route ?? "/notes";
  return "/notes";
}

export function tourProgressLabel(index: number): string {
  return `${index + 1} of ${TOUR_STEP_COUNT}`;
}

/** Every user-facing sentence in the tour, for the copy lock. */
export function tourFacingCopy(): string[] {
  return [
    TOUR_WELCOME.title,
    TOUR_WELCOME.body,
    TOUR_WELCOME.start,
    TOUR_WELCOME.skip,
    TOUR_CLOSE.title,
    TOUR_CLOSE.body,
    TOUR_CLOSE.done,
    TOUR_CONTROLS.skip,
    TOUR_CONTROLS.back,
    TOUR_CONTROLS.next,
    ...TOUR_STEPS.flatMap((step) => [step.title, step.body, tourProgressLabel(TOUR_STEPS.indexOf(step))]),
  ];
}
