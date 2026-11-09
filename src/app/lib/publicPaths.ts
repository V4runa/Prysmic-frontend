/**
 * Routes that render outside the authenticated app shell.
 * Login and signup land in the app. Notes is the default; a saved preference
 * can choose another private screen. These paths must never include the
 * signed-in screens. The account and settings screens stay private.
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
