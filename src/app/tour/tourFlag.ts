/**
 * Guided tour master switch.
 *
 * On for local dev and Vercel preview. Off in production until
 * NEXT_PUBLIC_TOUR_ENABLED is exactly "true".
 * NEXT_PUBLIC_VERCEL_ENV is inlined from VERCEL_ENV in next.config,
 * so a production build cannot miss the variable and turn the tour on.
 */
export function tourEnabledFromEnv(env: {
  vercelEnv?: string;
  tourFlag?: string;
}): boolean {
  return env.vercelEnv !== "production" || env.tourFlag === "true";
}

export const TOUR_ENABLED: boolean = tourEnabledFromEnv({
  vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
  tourFlag: process.env.NEXT_PUBLIC_TOUR_ENABLED,
});
