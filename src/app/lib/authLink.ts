import { AUTH_LINK_BOOTSTRAP } from "./authLinkBootstrap";

export { AUTH_LINK_BOOTSTRAP };

export type AuthLinkPurpose = "verify" | "reset";

export type VerifyPhase = "success" | "invalid" | "failed";

declare global {
  interface Window {
    __prysmicLinkToken?: string;
  }
}

const held: Record<AuthLinkPurpose, string | null> = {
  verify: null,
  reset: null,
};

const verifyInflight = new Map<string, Promise<VerifyPhase>>();

export function resetAuthLinkMemoryForTests(): void {
  held.verify = null;
  held.reset = null;
  verifyInflight.clear();
}

export function readAuthToken(href: string): string | null {
  const token = new URL(href, "https://www.prysmic.me").searchParams.get("token");
  return token && token.length > 0 ? token : null;
}

/** Path, query, and hash with the token parameter removed. */
export function stripAuthToken(href: string): string {
  const url = new URL(href, "https://www.prysmic.me");
  url.searchParams.delete("token");
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Remember a link token for this tab and return the address to show.
 * A second call after the query is gone (React Strict Mode, or the bootstrap
 * script) returns the same token. Reset links are never auto-submitted.
 */
export function captureLinkToken(
  purpose: AuthLinkPurpose,
  href: string,
  presetToken?: string | null
): { token: string | null; nextHref: string } {
  const fromQuery = readAuthToken(href);
  const preset = presetToken && presetToken.length > 0 ? presetToken : null;
  const incoming = fromQuery ?? preset;
  const nextHref = stripAuthToken(href);
  if (incoming) {
    held[purpose] = incoming;
    return { token: incoming, nextHref };
  }
  return { token: held[purpose], nextHref };
}

/**
 * Start the confirmation POST once per token. A second call — including the
 * extra mount React Strict Mode performs — returns the same promise and does
 * not call `post` again. A manual retry should call `post` directly.
 */
export function verifyOnce(
  token: string,
  post: (token: string) => Promise<VerifyPhase>
): Promise<VerifyPhase> {
  const existing = verifyInflight.get(token);
  if (existing) return existing;
  const task = Promise.resolve().then(() => post(token));
  verifyInflight.set(token, task);
  return task;
}

export function takeBootstrappedToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.__prysmicLinkToken;
  delete window.__prysmicLinkToken;
  return typeof token === "string" && token.length > 0 ? token : null;
}
