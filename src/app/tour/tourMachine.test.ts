import assert from "node:assert/strict";
import test from "node:test";
import {
  gatheredMotes,
  initialTourState,
  tourHoldsMoodTimeline,
  tourReducer,
  tourStopId,
  type TourState,
} from "./tourMachine";
import { TOUR_COPY, TOUR_MOTE, TOUR_STOPS, stopAnnouncement, welcomeHeading } from "./tourStops";

function walkTo(index: number): TourState {
  let state = tourReducer(initialTourState, { type: "open" });
  state = tourReducer(state, { type: "begin" });
  for (let i = 0; i < index; i += 1) {
    state = tourReducer(state, { type: "arrived" });
    state = tourReducer(state, { type: "target-ready" });
    state = tourReducer(state, { type: "next" });
  }
  state = tourReducer(state, { type: "arrived" });
  state = tourReducer(state, { type: "target-ready" });
  return state;
}

test("every stop carries its route, target, and the approved copy", () => {
  assert.deepEqual(
    TOUR_STOPS.map((stop) => stop.id),
    ["notes", "tags", "tasks", "contracts", "calendar", "moods"]
  );
  assert.equal(TOUR_STOPS[0]?.route, "/notes");
  assert.equal(TOUR_STOPS[1]?.route, "/tags");
  assert.equal(TOUR_STOPS[1]?.waypoint, "[data-tour='manage-tags']");
  assert.equal(TOUR_STOPS[2]?.route, "/tasks");
  assert.equal(TOUR_STOPS[3]?.route, "/habits");
  assert.equal(TOUR_STOPS[3]?.navHref, "/habits");
  assert.equal(TOUR_STOPS[4]?.route, "/calendar");
  assert.equal(TOUR_STOPS[5]?.route, "/moods");
  assert.equal(TOUR_STOPS[0]?.body, "This is where your thoughts live. Write anything, finished or not.");
  assert.equal(
    TOUR_STOPS[1]?.body,
    "Tags gather notes and tasks by theme. Name one now if you like, or keep walking."
  );
  assert.equal(TOUR_STOPS[2]?.body, "Things to do, kept short. Type one and press Enter.");
  assert.equal(
    TOUR_STOPS[3]?.body,
    "A contract is a small promise to yourself. Check in each day and watch it hold."
  );
  assert.equal(
    TOUR_STOPS[4]?.body,
    "Everything meets here. Tasks, contracts, events and moods, day by day."
  );
  assert.equal(TOUR_STOPS[5]?.body, "One small thing before you settle in.");
  assert.equal(TOUR_STOPS[1]?.optional, "tag");
  assert.equal(TOUR_STOPS[2]?.optional, "task");
  assert.equal(TOUR_STOPS[5]?.optional, "mood");
  assert.equal(TOUR_STOPS[3]?.optional, null);
  assert.equal(welcomeHeading("anu"), "Welcome, Anu.");
  assert.equal(welcomeHeading("Ada"), "Welcome, Ada.");
  assert.equal(welcomeHeading("  "), "Welcome.");
  assert.equal(stopAnnouncement(2), `Stop 3 of 6, Tasks. ${TOUR_STOPS[2]?.body}`);
});

test("a walk moves arrival to each stop and gathers motes along the way", () => {
  let state = tourReducer(initialTourState, { type: "open" });
  assert.equal(state.phase, "arrival");
  assert.equal(state.persistSeen, false);
  assert.equal(tourHoldsMoodTimeline(state), true);

  state = tourReducer(state, { type: "begin" });
  assert.equal(state.phase, "travel");
  assert.equal(tourStopId(state), "notes");

  state = tourReducer(state, { type: "arrived" });
  assert.equal(state.phase, "settle");
  state = tourReducer(state, { type: "target-ready" });
  assert.equal(state.phase, "present");
  assert.deepEqual(gatheredMotes(state), [TOUR_MOTE.notes]);

  state = tourReducer(state, { type: "next" });
  state = tourReducer(state, { type: "arrived" });
  state = tourReducer(state, { type: "target-ready" });
  assert.equal(tourStopId(state), "tags");

  const ignored = tourReducer(state, { type: "action", line: "nope" });
  assert.equal(ignored.phase, "present");
  state = tourReducer(state, { type: "action", line: TOUR_COPY.tagAck });
  assert.equal(state.phase, "ack");
  assert.equal(state.ackLine, TOUR_COPY.tagAck);
  state = tourReducer(state, { type: "ack-done" });
  assert.equal(state.phase, "travel");
  assert.equal(tourStopId(state), "tasks");

  const tasks = walkTo(2);
  assert.equal(tourStopId(tasks), "tasks");
  const acked = tourReducer(tasks, { type: "action", line: TOUR_COPY.taskAck });
  assert.equal(tourReducer(acked, { type: "ack-done" }).index, 3);

  const calendar = walkTo(4);
  assert.equal(tourStopId(calendar), "calendar");
  assert.deepEqual(gatheredMotes(calendar), [
    TOUR_MOTE.notes,
    TOUR_MOTE.tags,
    TOUR_MOTE.tasks,
    TOUR_MOTE.contracts,
  ]);
  assert.equal(tourReducer(calendar, { type: "next" }).index, 5);
});

test("back returns one stop, and the first stop returns to the welcome", () => {
  const notes = walkTo(0);
  const welcome = tourReducer(notes, { type: "back" });
  assert.equal(welcome.phase, "arrival");
  assert.equal(welcome.persistSeen, false);

  const tasks = walkTo(2);
  const traveling = tourReducer(tasks, { type: "back" });
  assert.equal(traveling.phase, "travel");
  assert.equal(traveling.index, 1);

  const aligned = tourReducer(traveling, { type: "align", index: 1 });
  assert.equal(aligned.phase, "settle");
  assert.equal(aligned.index, 1);
});

test("a mood pick steps back, then lighting the room ends as seen", () => {
  const moods = walkTo(5);
  assert.equal(tourReducer(moods, { type: "next" }), moods);
  const reflect = tourReducer(moods, { type: "mood-picked" });
  assert.equal(reflect.phase, "reflect");
  assert.equal(tourHoldsMoodTimeline(reflect), true);

  const light = tourReducer(reflect, { type: "mood-kept", color: "emerald" });
  assert.equal(light.phase, "light");
  assert.equal(light.moodColor, "emerald");
  assert.equal(light.persistSeen, false);

  const home = tourReducer(light, { type: "light-done" });
  assert.equal(home.phase, "closing");
  assert.equal(home.closing, "home");
  assert.equal(home.persistSeen, true);
  assert.equal(tourHoldsMoodTimeline(home), false);

  const done = tourReducer(home, { type: "closing-done" });
  assert.equal(done.phase, "done");
  assert.equal(tourHoldsMoodTimeline(done), false);
});

test("Not today, Leave, and looking alone all end as seen", () => {
  const moods = walkTo(5);
  const skipped = tourReducer(moods, { type: "not-today" });
  assert.equal(skipped.closing, "not-today");
  assert.equal(skipped.persistSeen, true);
  assert.equal(tourHoldsMoodTimeline(skipped), true);

  const notes = walkTo(0);
  const left = tourReducer(notes, { type: "leave" });
  assert.equal(left.closing, "left");
  assert.equal(left.persistSeen, true);
  assert.equal(tourReducer(left, { type: "leave" }).phase, "done");

  const arrival = tourReducer(initialTourState, { type: "open" });
  const declined = tourReducer(arrival, { type: "decline" });
  assert.equal(declined.closing, "declined");
  assert.equal(declined.persistSeen, true);
  assert.equal(tourReducer(declined, { type: "closing-done" }).phase, "done");
});

test("a mood already logged skips the question and lights the room", () => {
  const moods = walkTo(5);
  const lit = tourReducer(moods, { type: "target-ready", todayMood: "emerald" });
  assert.equal(lit.phase, "present");
  const settled = tourReducer(
    { ...moods, phase: "settle" },
    { type: "target-ready", todayMood: "emerald" }
  );
  assert.equal(settled.phase, "light");
  assert.equal(settled.alreadyLit, true);
  assert.equal(settled.moodColor, "emerald");
  const closing = tourReducer(settled, { type: "light-done" });
  assert.equal(closing.closing, "lit");
  assert.equal(tourHoldsMoodTimeline(closing), false);
  assert.equal(tourHoldsMoodTimeline(settled), true);
});

test("ignored events do not skip ahead, and a replay can open again from done", () => {
  assert.equal(tourReducer(initialTourState, { type: "begin" }).phase, "idle");
  assert.equal(tourReducer(initialTourState, { type: "leave" }).phase, "idle");
  const arrival = tourReducer(initialTourState, { type: "open" });
  assert.equal(tourReducer(arrival, { type: "mood-picked" }).phase, "arrival");
  assert.equal(tourReducer(arrival, { type: "open" }).phase, "arrival");

  const done = tourReducer(tourReducer(arrival, { type: "decline" }), { type: "closing-done" });
  assert.equal(tourReducer(done, { type: "open" }).phase, "arrival");
});

test("the browser landing on another stop settles there without a new flight", () => {
  const tasks = walkTo(2);
  const tags = tourReducer(tasks, { type: "align", index: 1 });
  assert.equal(tags.phase, "settle");
  assert.equal(tags.index, 1);
  assert.equal(tourReducer(tags, { type: "align", index: 1 }), tags);
  assert.equal(tourReducer(tasks, { type: "align", index: 9 }), tasks);
});
