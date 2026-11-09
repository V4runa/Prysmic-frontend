/**
 * Signed-in app screens. These stay out of search indexes and out of analytics.
 * Public auth pages such as /login are not in this list.
 */
export const PRIVATE_PATH_PREFIXES = [
  "/notes",
  "/calendar",
  "/habits",
  "/tasks",
  "/moods",
  "/tags",
  "/account",
  "/test",
] as const;
