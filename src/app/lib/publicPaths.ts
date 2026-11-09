/**
 * Routes that render outside the authenticated app shell.
 * Login and signup still land on /notes. These paths must never include
 * /notes, /calendar, /habits, /tasks, /moods, /tags, or /account.
 */
export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
  "/reset-password",
  "/privacy",
  "/terms",
] as const;

export function isPublicPath(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return (PUBLIC_PATHS as readonly string[]).includes(path);
}
