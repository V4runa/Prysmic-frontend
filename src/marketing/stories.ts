export type StoryDay = {
  label: string;
  title: string;
  body: string;
};

export type Story = {
  slug: string;
  title: string;
  kicker: string;
  dek: string;
  days: StoryDay[];
  close: string;
};

/**
 * Illustrative weeks. The people in them are not real, and the copy must
 * never be presented as a quote, testimonial, or case study.
 */
export const stories: Story[] = [
  {
    slug: "a-week-of-pages",
    title: "A week of pages",
    kicker: "An illustrative week",
    dek: "A writer — invented for this page — moves through seven days of notes, a contract, a mood, and one task that is really a paragraph.",
    days: [
      {
        label: "Monday",
        title: "The sentence",
        body: "Before anything else, the writer keeps the morning-pages contract: three pages, and permission to stop. One sentence survives. It goes into a note called The sentence I kept, tagged dawn and draft. The mood that day is named Clear. None of these records belong to a living person. They are the shape of the rooms.",
      },
      {
        label: "Tuesday",
        title: "The room",
        body: "The note is shorter. What the room was doing — the lamp, the coat on the chair — tagged threshold. The point of the note is to put the room down so it does not have to be carried. A task appears beside it, low and undated: choose nothing, on purpose.",
      },
      {
        label: "Wednesday",
        title: "Rain",
        body: "Field note, the color of rain, tagged river. The task that belongs to the same tag asks for the paragraph to be revised by the end of the week. On the calendar, the note and the task sit on different days and still share a thread, because the tag is the thread. There is no search to do.",
      },
      {
        label: "Thursday",
        title: "A letter",
        body: "A letter is written in full and then not sent. The note is tagged correspondence. The task, once done, is only to put the letter in a drawer. The writing was the conversation. The calendar shows the note on the day it was written and the task on the day it was finished.",
      },
      {
        label: "Friday",
        title: "The margin",
        body: "A short note called Margin, tagged draft and threshold. It is not a plan. The evening-sit contract is kept: twenty quiet minutes, and no record of what occurred inside them. The mood is Held. The week, looked at from the month, has a climate.",
      },
      {
        label: "The weekend",
        title: "Returning",
        body: "Saturday holds a walk, which is an event on the calendar, not a task. Sunday holds the note On returning, tagged practice. The writer does not review the week in a dashboard. The week is already the calendar. This person does not exist. The sequence is only here so the rooms can be seen in one life.",
      },
    ],
    close: "Read this as a floor plan, not a result. Nothing in the week was achieved. It was kept.",
  },
  {
    slug: "a-week-of-returning",
    title: "A week of returning",
    kicker: "An illustrative week",
    dek: "A person with a contemplative practice — also invented — uses the same rooms more quietly. Fewer notes. The same calendar.",
    days: [
      {
        label: "Monday",
        title: "Begin, then stop",
        body: "The contract is the practice: an evening sit, with an intention written on it and a line to return to. The check-in is the whole record. A mood named Liminal is enough of a note. There is no essay.",
      },
      {
        label: "Tuesday",
        title: "Before the kettle",
        body: "One note, Tuesday, before the kettle, tagged practice and dawn. Three lines. The morning-pages contract is kept and then left alone. The day on the calendar shows the check, the mood, and the short note, and does not ask for more.",
      },
      {
        label: "Wednesday",
        title: "A gap",
        body: "The sit is missed. The streak changes. The contract is still there in the evening, with the same intention, the same color. The miss is visible and unremarked. That is the tone the room is built for.",
      },
      {
        label: "Thursday",
        title: "Weather",
        body: "The mood is Weathered. A single sentence could be written, and isn't. The timeline keeps the emoji. Looking back is not the same as explaining yourself.",
      },
      {
        label: "Friday",
        title: "The long way",
        body: "A walk is placed on the calendar as an event, with a time and a color, not as a task to complete. The sit is kept again. Two marks on one day. The month begins to look inhabited without becoming busy.",
      },
      {
        label: "The weekend",
        title: "What was kept",
        body: "The person scrolls the mood timeline, not to measure a self, but to see the weather of the week: Liminal, Held, a gap, Weathered, Tender. The tags on the few notes — practice, dawn — are the only index. This is an illustration of a practice. It is not a person, and it is not advice.",
      },
    ],
    close: "The rooms are the same as in the writer's week. The life imagined inside them is quieter. Both weeks are fiction.",
  },
];

export const storyMap: Record<string, Story> = Object.fromEntries(
  stories.map((story) => [story.slug, story])
);
