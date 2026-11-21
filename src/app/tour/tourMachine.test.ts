import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { initialTourState, tourIsOpen, tourReducer, type TourState } from "./tourMachine";
import {
  TOUR_CLOSE,
  TOUR_CONTROLS,
  TOUR_STEPS,
  TOUR_WELCOME,
  tourFacingCopy,
  tourProgressLabel,
  tourRouteFor,
} from "./tourStops";

function walkTo(index: number): TourState {
  let state = tourReducer(initialTourState, { type: "open" });
  state = tourReducer(state, { type: "start" });
  for (let i = 0; i < index; i += 1) state = tourReducer(state, { type: "next" });
  return state;
}

test("the tour is five steps with the approved copy", () => {
  assert.deepEqual(
    TOUR_STEPS.map((step) => step.id),
    ["notes", "tasks", "contracts", "calendar", "moods"]
  );
  assert.equal(TOUR_STEPS[0]?.route, "/notes");
  assert.equal(TOUR_STEPS[0]?.target, "[data-tour='notes-create']");
  assert.equal(TOUR_STEPS[1]?.route, "/tasks");
  assert.equal(TOUR_STEPS[1]?.target, "[data-tour='tasks-field']");
  assert.equal(TOUR_STEPS[2]?.route, "/habits");
  assert.equal(TOUR_STEPS[2]?.target, "[data-tour='contracts-create'], [data-tour='contracts-list']");
  assert.equal(TOUR_STEPS[3]?.route, "/calendar");
  assert.equal(TOUR_STEPS[3]?.target, "[data-tour='calendar-today']");
  assert.equal(TOUR_STEPS[4]?.route, "/moods");
  assert.equal(TOUR_STEPS[4]?.target, "[data-tour='mood-grid']");

  assert.equal(TOUR_WELCOME.title, "Welcome to Prysmic");
  assert.equal(
    TOUR_WELCOME.body,
    "This is your private notebook for notes, tasks, contracts, a calendar, and moods. This short tour shows you each area. You can skip it at any time."
  );
  assert.equal(TOUR_WELCOME.start, "Start tour");
  assert.equal(TOUR_WELCOME.skip, "Skip tour");
  assert.equal(
    TOUR_STEPS[0]?.body,
    "This is where you write. Select New Note to start one. You can add tags to a note to connect it with related notes and tasks."
  );
  assert.equal(
    TOUR_STEPS[1]?.body,
    "This is your to-do list. Type a task and press Enter to add it. When you mark a task done, it shows on that day in the calendar."
  );
  assert.equal(
    TOUR_STEPS[2]?.body,
    "A contract is a daily commitment you set for yourself. Add one, then check it off on this page each day. The days you keep it are saved here and on the calendar."
  );
  assert.equal(
    TOUR_STEPS[3]?.body,
    "The calendar shows your tasks, contracts, events, and moods by day. Select a day to see what is on it, or select an item to open it."
  );
  assert.equal(
    TOUR_STEPS[4]?.body,
    "Here you can log how you feel today. Select a mood, or add your own. If you log one, the notebook takes on that color for the rest of the day."
  );
  assert.equal(TOUR_CLOSE.title, "You're all set");
  assert.equal(TOUR_CLOSE.body, "You can start this tour again anytime from Settings.");
  assert.equal(TOUR_CLOSE.done, "Done");
  assert.equal(TOUR_CONTROLS.back, "Back");
  assert.equal(TOUR_CONTROLS.next, "Next");
  assert.equal(tourProgressLabel(0), "1 of 5");
  assert.equal(tourProgressLabel(4), "5 of 5");

  const facing = tourFacingCopy().join("\n");
  assert.equal(/tap/i.test(facing), false);
  assert.equal(/habit/i.test(facing), false);
});

test("start, next, and back move through the steps without marking seen", () => {
  let state = tourReducer(initialTourState, { type: "open" });
  assert.equal(state.phase, "welcome");
  assert.equal(state.persistSeen, false);
  assert.equal(tourIsOpen(state), true);
  assert.equal(tourRouteFor("welcome", -1), "/notes");

  state = tourReducer(state, { type: "start" });
  assert.equal(state.phase, "step");
  assert.equal(state.index, 0);
  assert.equal(tourRouteFor("step", 0), "/notes");

  state = walkTo(4);
  assert.equal(state.index, 4);
  assert.equal(tourRouteFor("step", 4), "/moods");
  assert.equal(state.persistSeen, false);

  state = tourReducer(state, { type: "back" });
  assert.equal(state.index, 3);
  assert.equal(tourRouteFor("step", 3), "/calendar");

  state = tourReducer(walkTo(0), { type: "back" });
  assert.equal(state.phase, "welcome");
});

test("the last next opens the close card, and skip ends the tour as seen", () => {
  const finished = tourReducer(walkTo(4), { type: "next" });
  assert.equal(finished.phase, "close");
  assert.equal(finished.persistSeen, false);
  assert.equal(finished.returnNotes, false);
  assert.equal(tourRouteFor("close", -1), "/notes");

  const skipped = tourReducer(walkTo(1), { type: "skip" });
  assert.equal(skipped.phase, "done");
  assert.equal(skipped.persistSeen, true);
  assert.equal(skipped.returnNotes, false);
  assert.equal(tourIsOpen(skipped), false);

  const fromWelcome = tourReducer(tourReducer(initialTourState, { type: "open" }), { type: "skip" });
  assert.equal(fromWelcome.phase, "done");
  assert.equal(fromWelcome.persistSeen, true);

  const fromClose = tourReducer(finished, { type: "skip" });
  assert.equal(fromClose.phase, "done");
  assert.equal(fromClose.persistSeen, true);
});

test("done marks the tour seen and a later open can replay", () => {
  const closed = tourReducer(walkTo(4), { type: "next" });
  assert.equal(tourReducer(closed, { type: "done" }).phase, "done");
  const done = tourReducer(closed, { type: "done" });
  assert.equal(done.persistSeen, true);
  assert.equal(tourIsOpen(done), false);
  assert.equal(tourRouteFor("done", -1), "/notes");

  const replay = tourReducer(done, { type: "open" });
  assert.equal(replay.phase, "welcome");
  assert.equal(replay.persistSeen, false);
  assert.equal(tourReducer(initialTourState, { type: "done" }).phase, "idle");
  assert.equal(tourReducer(walkTo(1), { type: "start" }).index, 1);
});

test("settings and updates use the approved tour lines", () => {
  const settings = readFileSync(new URL("../settings/page.tsx", import.meta.url), "utf8");
  assert.match(settings, /A short tour of the main areas in Prysmic\./);
  assert.match(settings, /Start the tour again/);
  const updates = readFileSync(new URL("../../content/updates.ts", import.meta.url), "utf8");
  assert.match(updates, /A tour of Prysmic/);
  assert.match(
    updates,
    /A short tour shows you notes, tasks, contracts, the calendar, and moods\. You can start it again anytime from Settings\./
  );
  assert.match(updates, /Start the tour/);
});
