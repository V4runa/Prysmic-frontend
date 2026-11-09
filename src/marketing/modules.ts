export type ModuleSlug =
  | "calendar"
  | "notes"
  | "tags"
  | "habits"
  | "moods"
  | "tasks";

export type Figure = {
  src: string;
  alt: string;
  caption: string;
};

export type Clip = {
  mp4: string;
  webm: string;
  poster: string;
  label: string;
};

export type ModulePage = {
  slug: ModuleSlug;
  /** Short name in the navigation. */
  nav: string;
  /** Room name as the product speaks it. */
  title: string;
  kicker: string;
  /** One sentence under the title on the module page. */
  deck: string;
  /** Shorter line for the home-page hinge. */
  hinge: string;
  /** Home chapter, kept short. The module page holds the rest. */
  home: string;
  paragraphs: string[];
  points: { title: string; text: string }[];
  figure: Figure;
  secondary?: Figure;
  clip?: Clip;
};

export const modules: ModulePage[] = [
  {
    slug: "calendar",
    nav: "Calendar",
    title: "Calendar",
    kicker: "The center",
    deck: "Every room arrives on one timeline. The week can be read as a life, not a list of apps.",
    hinge: "Where the week is read.",
    home: "Notes keep the day they were written. A mood colors the day it belongs to. A contract leaves a mark when you keep it. A task asks for a date. The calendar is where those traces sit beside one another.",
    paragraphs: [
      "The calendar is not a planner you are meant to serve. It is the room that gathers the others. Open a day and the note, the mood, the contract, and the task are already there, in the order the day actually had.",
      "Month, week, and day are three distances from the same life. Nothing has to be copied from one tool into another, because there was never a second tool.",
    ],
    points: [
      {
        title: "One timeline",
        text: "Events, notes, tasks, habit check-ins, and moods share the grid. A day is a place, not a category.",
      },
      {
        title: "The day, up close",
        text: "Choose a date and the agenda shows what that day held: what you wrote, what you felt, what you kept, what was asking.",
      },
      {
        title: "Quiet marks",
        text: "A mood tints the day. A contract draws a small ring. The month can be glanced at before it is studied.",
      },
    ],
    figure: {
      src: "/marketing/calendar.webp",
      alt: "The month view in a fictional workspace, with moods, habit rings, notes, and a few events across the days.",
      caption: "A month in the fictional workspace folio. Sample entries only.",
    },
    secondary: {
      src: "/marketing/calendar-day.webp",
      alt: "A single day's agenda, gathering a mood, habit check-ins, a note, and a task.",
      caption: "One day, opened. The other rooms are already in it.",
    },
    clip: {
      mp4: "/marketing/clips/calendar.mp4",
      webm: "/marketing/clips/calendar.webm",
      poster: "/marketing/clips/calendar.jpg",
      label: "Opening a day on the calendar in the fictional workspace.",
    },
  },
  {
    slug: "notes",
    nav: "Notes",
    title: "Notes",
    kicker: "Capture",
    deck: "A note is a moment given a place. You come back by the tags you chose, not by searching the pile.",
    hinge: "A moment, set down.",
    home: "Write the sentence before it cools. Give it the tags that will let you find the thread later. There is no text search, on purpose — returning is an act of recognition, not a query.",
    paragraphs: [
      "Notes are for what you want to keep near: a line, a room, a letter you will not send, the color of the rain. The editor is quiet. The page does not hurry you toward a system.",
      "You do not retrieve a note by hunting through its words. You marked it when you wrote it. The mark is how you return.",
    ],
    points: [
      {
        title: "Set it down",
        text: "A title, a body, and the tags that belong to it. That is the whole gesture.",
      },
      {
        title: "Tags, not search",
        text: "Prysmic deliberately has no text search. The way back is the vocabulary you made.",
      },
      {
        title: "Files, when a moment needs them",
        text: "A note can hold attachments. Their names, types, and sizes travel with an export; the bytes stay with the note.",
      },
    ],
    figure: {
      src: "/marketing/notes.webp",
      alt: "Eight fictional notes arranged with tags such as dawn, draft, river, and correspondence.",
      caption: "Notes in folio, tagged by hand. Nothing here is a real journal.",
    },
    secondary: {
      src: "/marketing/note.webp",
      alt: "An open note titled The sentence I kept, tagged dawn and draft.",
      caption: "The sentence, kept. Tags are the way back to it.",
    },
    clip: {
      mp4: "/marketing/clips/notes.mp4",
      webm: "/marketing/clips/notes.webm",
      poster: "/marketing/clips/notes.jpg",
      label: "Filtering fictional notes by a tag.",
    },
  },
  {
    slug: "tags",
    nav: "Tags",
    title: "Tags",
    kicker: "The way back",
    deck: "Tags are the center of memory here. You name them. You color them. A tag is a door you can open later.",
    hinge: "The marks you leave.",
    home: "A tag is not a folder and not a search facet. It is a word you trust. Dawn, river, correspondence, practice — the set is yours, and the notes gather under the words you gave them.",
    paragraphs: [
      "Other tools offer a box that searches every sentence you ever wrote. Prysmic asks you to choose a mark at the moment of writing, and to trust that mark later. The limitation is the practice.",
      "Color is part of the mark. Astral, ember, whisper, pulse, verdant, sunwake — a small palette, so a tag can be recognized before it is read.",
    ],
    points: [
      {
        title: "You make the vocabulary",
        text: "Nothing is filed for you. The words that matter are the ones you were willing to give a name.",
      },
      {
        title: "Shared by notes and tasks",
        text: "The same tag can sit on a paragraph and on something that needs doing, so a thread can cross rooms.",
      },
      {
        title: "A codex, not a dump",
        text: "The tags room is where the vocabulary lives. Rename a word and the thread keeps its identity.",
      },
    ],
    figure: {
      src: "/marketing/tags.webp",
      alt: "The tags room with a fictional vocabulary: dawn, draft, threshold, river, correspondence, and practice.",
      caption: "A vocabulary made for the pictures. Yours would be your own.",
    },
  },
  {
    slug: "habits",
    nav: "Contracts",
    title: "Habit contracts",
    kicker: "A promise",
    deck: "A contract has a name, an intention, an affirmation, a color, an icon, and a rhythm. Checking in is a small rite. The streak is the trace, not a score.",
    hinge: "A promise with a shape.",
    home: "This is not a checkbox with a flame attached. You name the practice, say why you are keeping it, and leave a line you can repeat. The app calls the room Habits. What you forge is a contract.",
    paragraphs: [
      "Morning pages. An evening sit. Whatever the practice is, it gets a color and an icon so you can see it across a month without reading a sentence. Frequency can be daily, weekly, or monthly.",
      "A check-in records that you returned. The streak counts the days you returned. Miss one and the number changes. The contract does not scold you. It waits where you left it.",
    ],
    points: [
      {
        title: "Intention first",
        text: "Before the streak, there is a reason. The intention stays on the contract so the practice can remember itself.",
      },
      {
        title: "An affirmation",
        text: "A line to say, or just to keep. It is part of the object, the way a color is.",
      },
      {
        title: "On the calendar",
        text: "Expected days and kept days show on the same timeline as everything else you did.",
      },
    ],
    figure: {
      src: "/marketing/habits.webp",
      alt: "Two fictional habit contracts, Morning pages and Evening sit, with colors, icons, and streaks.",
      caption: "Two contracts in folio. The streaks are sample check-ins.",
    },
    secondary: {
      src: "/marketing/habit.webp",
      alt: "The Morning pages contract open to its intention and affirmation.",
      caption: "Name, intention, affirmation. The check-in comes after the meaning.",
    },
    clip: {
      mp4: "/marketing/clips/habit.mp4",
      webm: "/marketing/clips/habit.webm",
      poster: "/marketing/clips/habit.jpg",
      label: "Checking in on a fictional habit contract.",
    },
  },
  {
    slug: "moods",
    nav: "Moods",
    title: "Moods",
    kicker: "Weather",
    deck: "Name the weather of a day. Give it an emoji and a color. The timeline keeps the noticing. It does not grade it.",
    hinge: "The weather of a day.",
    home: "Moods are yours to name. A palette arrives so the first day is not empty, and then you can change it — new names, new marks, the ones that actually fit. They line up by the day they belong to.",
    paragraphs: [
      "A mood is a check-in with how the day actually felt. You can leave a short note with it, or nothing. The timeline is a record of attention, and a streak simply means you kept looking.",
      "Days you fill in later are marked as such, so a past you reconstruct does not pretend to be a streak you earned. The calendar still shows them. The count does not.",
    ],
    points: [
      {
        title: "A palette you edit",
        text: "Start from the moods that are already there, or replace them. The names should sound like you.",
      },
      {
        title: "One day, one weather",
        text: "Each day holds a mood. Change it if the day changes. The timeline keeps the latest name you gave it.",
      },
      {
        title: "Visible from the month",
        text: "The emoji sits on the calendar, so the month has a climate before you read a word.",
      },
    ],
    figure: {
      src: "/marketing/moods.webp",
      alt: "A mood timeline in a fictional workspace, with a streak and entries such as Clear, Held, and Tender.",
      caption: "A few weeks of invented weather. Not a real person's record.",
    },
    secondary: {
      src: "/marketing/moods-palette.webp",
      alt: "A custom mood palette including Liminal, Held, Clear, Tender, and Weathered.",
      caption: "The palette, edited. These names were made for the demonstration.",
    },
    clip: {
      mp4: "/marketing/clips/moods.mp4",
      webm: "/marketing/clips/moods.webm",
      poster: "/marketing/clips/moods.jpg",
      label: "Moving through a fictional mood timeline.",
    },
  },
  {
    slug: "tasks",
    nav: "Tasks",
    title: "Tasks",
    kicker: "What is asking",
    deck: "The few things that want a day. They live on the same calendar as the rest of a life, so a task never floats free of it.",
    hinge: "What is asking to be done.",
    home: "A task is allowed to be small. Revise a paragraph. Copy the morning pages into the notebook. It can have a priority, a due day, and a tag — and then it sits on the date, beside the mood and the note.",
    paragraphs: [
      "Tasks are here because a reflective life still has things that ask to be done. They are not a scoreboard. Finish one, or don't. The day keeps the record either way.",
      "Give a task a tag and it joins the same thread as the writing. The river paragraph and the note about the river can find each other without a search.",
    ],
    points: [
      {
        title: "A day, if it needs one",
        text: "Due dates stay on the calendar day you picked. A task with no date simply waits in the list.",
      },
      {
        title: "Priority as weight, not rank",
        text: "High, medium, low — a way to see what is leaning on you. Not a system to optimize.",
      },
      {
        title: "Beside everything else",
        text: "On the calendar, a task is one mark among the day's other marks.",
      },
    ],
    figure: {
      src: "/marketing/tasks.webp",
      alt: "A short fictional task list, with due dates and tags, including one thing already done.",
      caption: "A few things asking. Invented, like the rest of folio.",
    },
  },
];

export const moduleMap: Record<ModuleSlug, ModulePage> = Object.fromEntries(
  modules.map((module) => [module.slug, module])
) as Record<ModuleSlug, ModulePage>;

/** Reading order on the home page: the center, then the rooms that feed it. */
export const homeChapters: ModuleSlug[] = [
  "calendar",
  "notes",
  "tags",
  "habits",
  "moods",
  "tasks",
];

/** The hinge puts the calendar in the middle, between what you keep and what returns. */
export const hingeBefore: ModuleSlug[] = ["notes", "tags"];
export const hingeAfter: ModuleSlug[] = ["habits", "moods", "tasks"];
