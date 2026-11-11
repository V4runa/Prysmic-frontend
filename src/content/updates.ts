/**
 * Product updates and the short list of what is still planned.
 *
 * Add a shipped change by putting an object at the top of `productUpdates`
 * (newest first). Keep `id` unique and stable once it has shipped. Set
 * `highlight: true` only when the change should show a one-time card.
 *
 * The marketing site can import `toPublicChangelog()` later. That returns
 * plain data for the shipped list and the planned list, with no React and
 * no browser storage.
 */

export const UPDATE_KINDS = ["new", "improved", "fixed"] as const;

export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const UPDATE_KIND_LABELS: Record<UpdateKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

export type ProductUpdate = {
  /** Stable id. Do not reuse or rename an id after it ships. */
  id: string;
  /** Calendar day the change shipped, YYYY-MM-DD. */
  date: string;
  kind: UpdateKind;
  title: string;
  /** One or two plain sentences, addressed to the person using Prysmic. */
  summary: string;
  /** One-time card the first time someone opens the app after this entry. */
  highlight?: boolean;
};

export type PlannedUpdate = {
  id: string;
  title: string;
  summary: string;
};

export const productUpdates = [
  {
    id: "note-into-task",
    date: "2026-11-11",
    kind: "new",
    title: "Make a task from a note",
    summary:
      "You can make a task from a note you already wrote. It starts with the note's title, the task links back to the note, and the note lists the tasks that came from it.",
  },
  {
    id: "note-actions",
    date: "2026-11-11",
    kind: "new",
    title: "More you can do with a note",
    summary:
      "A note has a quiet menu: turn it into a contract, put it on a calendar day, pin or archive it, copy it as text or Markdown, or print it.",
  },
  {
    id: "calendar-day-links",
    date: "2026-11-11",
    kind: "new",
    title: "Calendar day links",
    summary:
      "A day on the calendar opens the note, task, contract, or mood it shows. The date on a note, task, mood, or contract opens that day.",
  },
  {
    id: "calendar-finished-tasks",
    date: "2026-11-11",
    kind: "improved",
    title: "Finished tasks on the day you finish them",
    summary:
      "Finished tasks now show on the calendar on the day you finish them, marked done. A task that was also due on another day still shows on that day, marked done too.",
  },
  {
    id: "shared-tags-notes-tasks",
    date: "2026-11-10",
    kind: "new",
    highlight: true,
    title: "Tags now work across Notes and Tasks",
    summary:
      "One tag can gather your notes and tasks: you can add tags to a task, filter tasks by tag, and open either list from the Tags page, which shows how many notes and tasks use each tag. Deleting a tag that is still in use shows a clearer message.",
  },
  {
    id: "updates-view",
    date: "2026-11-10",
    kind: "new",
    title: "Updates",
    summary: "Coming Soon is now Updates, where you can see what's new and what's coming.",
  },
  {
    id: "plain-first-run-copy",
    date: "2026-11-09",
    kind: "improved",
    title: "A clearer welcome and plainer starter notes",
    summary:
      "The first-run welcome is clearer, and the Start Here note and sample notes, contracts, and tasks are rewritten in plain language.",
  },
  {
    id: "settings-page",
    date: "2026-11-09",
    kind: "new",
    title: "Settings",
    summary:
      "You can change your password, update your email and confirm the new address, and pick an avatar. You can also choose the page that opens after login, a 12- or 24-hour clock, and the hour when your habit and mood day rolls over.",
  },
  {
    id: "privacy-and-terms",
    date: "2026-11-09",
    kind: "new",
    title: "Privacy Policy and Terms",
    summary:
      "The Privacy Policy and Terms are published. You can open them from signup and from Settings.",
  },
  {
    id: "account-deletion",
    date: "2026-11-09",
    kind: "new",
    title: "Delete your account",
    summary:
      "You can delete your account from Settings. You confirm with your current password and the word DELETE, and your notes, tags, habits, tasks, and moods are removed.",
  },
] as const satisfies readonly ProductUpdate[];

export const comingSoon: readonly PlannedUpdate[] = [];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** `2026-11-10` → `Nov 10, 2026`, without shifting the day across time zones. */
export function formatUpdateDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const month = MONTHS[Number(match[2]) - 1];
  const day = Number(match[3]);
  if (!month || day < 1 || day > 31) return isoDate;
  return `${month} ${day}, ${match[1]}`;
}

let publishedCache: readonly ProductUpdate[] | null = null;

/** Shipped entries, newest first. Same-day entries keep the order they are written in. */
export function publishedUpdates(): readonly ProductUpdate[] {
  if (publishedCache) return publishedCache;
  publishedCache = productUpdates
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.date === b.entry.date) return a.index - b.index;
      return a.entry.date < b.entry.date ? 1 : -1;
    })
    .map(({ entry }) => entry);
  return publishedCache;
}

export type PublicChangelogEntry = {
  id: string;
  date: string;
  kind: UpdateKind;
  title: string;
  summary: string;
  highlight: boolean;
};

export type PublicChangelogPlan = {
  id: string;
  title: string;
  summary: string;
};

export type PublicChangelog = {
  updates: PublicChangelogEntry[];
  comingSoon: PublicChangelogPlan[];
};

/** Plain changelog for a public page. Import this instead of copying the list. */
export function toPublicChangelog(): PublicChangelog {
  return {
    updates: publishedUpdates().map((entry) => ({
      id: entry.id,
      date: entry.date,
      kind: entry.kind,
      title: entry.title,
      summary: entry.summary,
      highlight: entry.highlight === true,
    })),
    comingSoon: comingSoon.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
    })),
  };
}
