import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  AUTH_LINK_BOOTSTRAP,
  captureLinkToken,
  readAuthToken,
  resetAuthLinkMemoryForTests,
  stripAuthToken,
  takeBootstrappedToken,
  verifyOnce,
} from "./authLink";
import {
  EMAIL_UNAVAILABLE_MESSAGE,
  GENERIC_EMAIL_MESSAGE,
  INVALID_LINK_MESSAGE,
  PASSWORD_UPDATED_NOTICE,
  RATE_LIMIT_MESSAGE,
  SIGNUP_EMAIL_NOTE,
  interpretEmailRequest,
  interpretPasswordReset,
  interpretSignupError,
  interpretVerify,
  preparePasswordReset,
  shouldShowVerificationPrompt,
  verificationPromptCopy,
} from "./authMessages";
import { resetPersonalCacheOwnerForTests, syncPersonalCache } from "./personalCache";
import { isPublicPath } from "./publicPaths";
import { currentSessionEpoch, resetSessionEpochForTests } from "./sessionBoundary";
import { captureLinkSnapshot, resetAuthLinkSnapshotForTests } from "./useAuthLink";
import {
  ACCESS_TOKEN_KEY,
  applyAuthSession,
  clearStoredSession,
  dismissVerifyPrompt,
  isVerifyPromptDismissed,
  markEmailVerifiedRefreshed,
  readLoginNotice,
  readRememberedEmailVerified,
  readSignupEmailNote,
  rememberEmailVerified,
  setLoginNotice,
  shouldRefreshEmailVerified,
  VERIFY_PROMPT_SNOOZE_MS,
} from "./storedSession";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  };
}

function installStorage() {
  const local = memoryStorage();
  const session = memoryStorage();
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
}

test.beforeEach(() => {
  installStorage();
  resetAuthLinkMemoryForTests();
  resetAuthLinkSnapshotForTests();
  resetSessionEpochForTests();
  resetPersonalCacheOwnerForTests();
});

test("stripAuthToken removes only the token parameter", () => {
  assert.equal(readAuthToken("/verify-email?token=abc&keep=1"), "abc");
  assert.equal(stripAuthToken("/verify-email?token=abc&keep=1"), "/verify-email?keep=1");
  assert.equal(
    stripAuthToken("https://www.prysmic.me/reset-password?b=1&token=ab%2Bcd#quiet"),
    "/reset-password?b=1#quiet"
  );
  assert.equal(readAuthToken("/verify-email?b=1&token=ab%2Bcd#quiet"), "ab+cd");
  assert.equal(readAuthToken("/verify-email#token=abc"), null);
  assert.equal(readAuthToken("/verify-email?token="), null);
  assert.equal(stripAuthToken("/verify-email?token=abc").includes("abc"), false);
});

test("the bootstrap script stashes the token and clears it from the address bar", () => {
  const history = {
    state: { idx: 2 },
    url: "",
    replaceState(state: { idx: number }, _title: string, url: string) {
      this.state = state;
      this.url = url;
    },
  };
  const windowObj = {
    location: {
      search: "?token=link-token&keep=1",
      pathname: "/reset-password",
      hash: "",
    },
    history,
    __prysmicLinkToken: undefined as string | undefined,
  };
  vm.runInNewContext(AUTH_LINK_BOOTSTRAP, { window: windowObj, URLSearchParams });
  assert.equal(windowObj.__prysmicLinkToken, "link-token");
  assert.equal(history.url, "/reset-password?keep=1");
  assert.equal(history.url.includes("token"), false);
  assert.equal(history.state.idx, 2);
});

test("a verification link posts once across a strict-mode remount", async () => {
  const first = captureLinkToken(
    "verify",
    "https://www.prysmic.me/verify-email?token=once"
  );
  assert.equal(first.token, "once");
  assert.equal(first.nextHref, "/verify-email");

  let posts = 0;
  const post = async (token: string) => {
    posts += 1;
    assert.equal(token, "once");
    return "success" as const;
  };
  const started = verifyOnce(first.token!, post);
  const second = captureLinkToken("verify", "https://www.prysmic.me/verify-email");
  const again = verifyOnce(second.token!, post);
  assert.equal(second.token, "once");
  assert.equal(started, again);
  assert.equal(await started, "success");
  assert.equal(posts, 1);
});

test("opening a reset link keeps the token in memory and does not submit", () => {
  const opened = captureLinkToken(
    "reset",
    "https://www.prysmic.me/reset-password?token=secret"
  );
  assert.equal(opened.token, "secret");
  assert.equal(opened.nextHref, "/reset-password");
  const remount = captureLinkToken("reset", "https://www.prysmic.me/reset-password");
  assert.equal(remount.token, "secret");
  assert.equal(remount.nextHref, "/reset-password");

  const ready = preparePasswordReset({
    token: remount.token,
    password: "longer",
    confirm: "longer",
  });
  assert.deepEqual(ready, { ok: true, body: { token: "secret", password: "longer" } });
  assert.equal(
    preparePasswordReset({ token: remount.token, password: "longer", confirm: "other1" }).ok,
    false
  );
  assert.equal(
    preparePasswordReset({ token: null, password: "longer", confirm: "longer" }).ok,
    false
  );
  assert.equal(preparePasswordReset({ token: "secret", password: "short", confirm: "short" }).ok, false);
});

test("the client snapshot clears the token once and stays stable", () => {
  const history = {
    state: { idx: 1 },
    replaceState(_state: unknown, _title: string, url: string) {
      window.location.href = `https://www.prysmic.me${url}`;
      window.location.pathname = url.split("?")[0].split("#")[0];
      window.location.search = url.includes("?") ? `?${url.split("?")[1].split("#")[0]}` : "";
      window.location.hash = url.includes("#") ? `#${url.split("#")[1]}` : "";
    },
  };
  const windowObj = {
    location: {
      href: "https://www.prysmic.me/reset-password?token=secret",
      pathname: "/reset-password",
      search: "?token=secret",
      hash: "",
    },
    history,
  };
  Object.defineProperty(globalThis, "window", { value: windowObj, configurable: true });
  const first = captureLinkSnapshot("reset");
  const second = captureLinkSnapshot("reset");
  assert.equal(first, second);
  assert.equal(first.token, "secret");
  assert.equal(first.nextHref, "/reset-password");
  assert.equal(windowObj.location.search.includes("token"), false);
  delete (globalThis as { window?: unknown }).window;
});

test("a bootstrapped token survives the cleared URL and is read once", () => {
  const windowObj = { __prysmicLinkToken: "from-script" } as Window;
  Object.defineProperty(globalThis, "window", { value: windowObj, configurable: true });
  assert.equal(takeBootstrappedToken(), "from-script");
  assert.equal(takeBootstrappedToken(), null);
  const captured = captureLinkToken("verify", "https://www.prysmic.me/verify-email", "from-script");
  assert.equal(captured.token, "from-script");
  assert.equal(captured.nextHref, "/verify-email");
  delete (globalThis as { window?: unknown }).window;
});

test("forgot-password and resend always confirm with the generic sentence", () => {
  const accepted = interpretEmailRequest({
    status: 200,
    body: { message: "Sent to ada@example.com" },
    retryAfter: null,
  });
  assert.equal(accepted.type, "accepted");
  assert.equal(accepted.message, GENERIC_EMAIL_MESSAGE);
  assert.equal(accepted.message.includes("ada@"), false);
  assert.equal(accepted.message, "If an account exists for that email, a message is on its way.");

  const sameForUnknown = interpretEmailRequest({
    status: 200,
    body: { message: GENERIC_EMAIL_MESSAGE },
    retryAfter: null,
  });
  assert.equal(sameForUnknown.message, accepted.message);
});

test("email request errors distinguish wait, unavailable, and invalid", () => {
  const wait = interpretEmailRequest({
    status: 429,
    body: { statusCode: 429, message: RATE_LIMIT_MESSAGE, error: "Too Many Requests" },
    retryAfter: "42",
  });
  assert.equal(wait.type, "wait");
  if (wait.type === "wait") {
    assert.equal(wait.retryAfterSec, 42);
    assert.match(wait.message, /Too many requests/);
    assert.match(wait.message, /42 seconds/);
  }

  const dated = interpretEmailRequest({
    status: 429,
    body: {},
    retryAfter: "Wed, 21 Oct 2015 07:28:00 GMT",
    now: Date.parse("Wed, 21 Oct 2015 07:27:30 GMT"),
  });
  assert.equal(dated.type, "wait");
  if (dated.type === "wait") assert.equal(dated.retryAfterSec, 30);

  const noHeader = interpretEmailRequest({ status: 429, body: {}, retryAfter: null });
  assert.equal(noHeader.type, "wait");
  if (noHeader.type === "wait") {
    assert.equal(noHeader.retryAfterSec, null);
    assert.equal(noHeader.message.includes("You can try again in"), false);
    assert.match(noHeader.message, /Wait a little/);
  }

  const down = interpretEmailRequest({
    status: 503,
    body: { message: "mailbox ada@example.com missing" },
    retryAfter: null,
  });
  assert.deepEqual(down, { type: "unavailable", message: EMAIL_UNAVAILABLE_MESSAGE });
  assert.equal(down.message.includes("ada@"), false);

  const invalid = interpretEmailRequest({ status: 400, body: { message: ["email must be an email"] }, retryAfter: null });
  assert.equal(invalid.type, "invalid");
  assert.match(invalid.message, /email/i);

  const failed = interpretEmailRequest({ status: 500, body: null, retryAfter: null });
  assert.equal(failed.type, "failed");
});

test("verify and reset responses map to success or an invalid link", () => {
  assert.equal(interpretVerify(200), "success");
  assert.equal(interpretVerify(400), "invalid");
  assert.equal(interpretVerify(503), "failed");
  assert.deepEqual(
    interpretPasswordReset(400, { message: INVALID_LINK_MESSAGE }),
    { type: "invalid-link" }
  );
  assert.deepEqual(
    interpretPasswordReset(400, { message: ["password must be longer than or equal to 6 characters"] }),
    { type: "rejected", message: "Use at least 6 characters." }
  );
  assert.equal(interpretPasswordReset(200, { passwordUpdated: true }).type, "updated");
  assert.equal(PASSWORD_UPDATED_NOTICE.includes("password"), true);
});

test("signup errors stay specific when the API names the conflict", () => {
  assert.equal(
    interpretSignupError(409, { message: "Username already taken!" }),
    "That username is already taken."
  );
  assert.equal(
    interpretSignupError(409, { message: "Email already in use!" }),
    "That email is already in use."
  );
  assert.match(interpretSignupError(500, null), /try again/i);
});

function jwt(sub: number): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub, username: "Ada", email: "ada@prysmic.test" })}.sig`;
}

test("the verification prompt snoozes per user for three days", () => {
  assert.equal(
    shouldShowVerificationPrompt({ hasSession: true, emailVerified: false, dismissed: false }),
    true
  );
  assert.equal(
    shouldShowVerificationPrompt({ hasSession: true, emailVerified: false, dismissed: true }),
    false
  );
  assert.equal(
    shouldShowVerificationPrompt({ hasSession: false, emailVerified: false, dismissed: false }),
    false
  );
  assert.equal(
    shouldShowVerificationPrompt({ hasSession: true, emailVerified: null, dismissed: false }),
    false
  );
  assert.equal(
    shouldShowVerificationPrompt({ hasSession: true, emailVerified: true, dismissed: false }),
    false
  );
  assert.equal(verificationPromptCopy(true), SIGNUP_EMAIL_NOTE);
  assert.notEqual(verificationPromptCopy(false), SIGNUP_EMAIL_NOTE);

  const now = Date.parse("2026-11-09T00:00:00.000Z");
  const token = jwt(7);
  applyAuthSession({ token, emailVerified: false, signedUp: true });
  assert.equal(localStorage.getItem(ACCESS_TOKEN_KEY), token);
  assert.equal(ACCESS_TOKEN_KEY, "token");
  assert.equal(readRememberedEmailVerified(), false);
  assert.equal(readSignupEmailNote(), true);
  dismissVerifyPrompt(now);
  assert.equal(isVerifyPromptDismissed(now), true);
  assert.equal(isVerifyPromptDismissed(now + VERIFY_PROMPT_SNOOZE_MS - 1), true);
  assert.equal(isVerifyPromptDismissed(now + VERIFY_PROMPT_SNOOZE_MS), false);

  sessionStorage.clear();
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  assert.equal(isVerifyPromptDismissed(now), true);
  assert.equal(readRememberedEmailVerified(), false);

  applyAuthSession({ token, emailVerified: false });
  assert.equal(isVerifyPromptDismissed(now), true);

  localStorage.setItem(ACCESS_TOKEN_KEY, jwt(8));
  assert.equal(isVerifyPromptDismissed(now), false);

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  rememberEmailVerified(true);
  assert.equal(readRememberedEmailVerified(), true);
  assert.equal(isVerifyPromptDismissed(now), false);
  assert.equal(shouldRefreshEmailVerified(), false);

  rememberEmailVerified(false);
  assert.equal(shouldRefreshEmailVerified(), true);
  markEmailVerifiedRefreshed();
  assert.equal(shouldRefreshEmailVerified(), false);
});

test("password reset clears the stored token and keeps the login notice", () => {
  localStorage.setItem("token", "old-session");
  localStorage.setItem("lastMoodDate", "2026-11-09");
  applyAuthSession({ token: "old-session", emailVerified: false, signedUp: true });
  syncPersonalCache({ clear() {} }, 4);
  const epoch = currentSessionEpoch();
  let cleared = 0;
  clearStoredSession({
    clear() {
      cleared += 1;
    },
  });
  setLoginNotice(PASSWORD_UPDATED_NOTICE);
  assert.equal(localStorage.getItem("token"), null);
  assert.equal(localStorage.getItem("lastMoodDate"), "2026-11-09");
  assert.equal(readRememberedEmailVerified(), null);
  assert.equal(readSignupEmailNote(), false);
  assert.equal(readLoginNotice(), PASSWORD_UPDATED_NOTICE);
  assert.ok(currentSessionEpoch() > epoch);
  assert.equal(cleared, 1);
});

test("confirmation and reset pages are public, noindex, and do not leak referrers", () => {
  for (const path of ["/verify-email", "/reset-password", "/forgot-password", "/verify-email/"]) {
    assert.equal(isPublicPath(path), true);
  }
  assert.equal(isPublicPath("/notes"), false);

  const config = readFileSync(new URL("../../../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /no-referrer/);
  assert.match(config, /\/verify-email/);
  assert.match(config, /\/reset-password/);

  for (const file of ["../verify-email/layout.tsx", "../reset-password/layout.tsx"]) {
    const layout = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(layout, /AUTH_LINK_BOOTSTRAP/);
    assert.match(layout, /no-referrer/);
    assert.match(layout, /index:\s*false/);
  }

  const shell = readFileSync(new URL("../components/ClientShellWrapper.tsx", import.meta.url), "utf8");
  assert.match(shell, /isPublicPath/);
  const login = readFileSync(new URL("../login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /Forgot password\?/);
  assert.match(login, /href="\/forgot-password"/);
  const signup = readFileSync(new URL("../signup/page.tsx", import.meta.url), "utf8");
  assert.match(signup, /signedUp: res\.emailVerified !== true/);
  const onboarding = readFileSync(new URL("../components/OnboardingModal.tsx", import.meta.url), "utf8");
  assert.match(onboarding, /SIGNUP_EMAIL_NOTE/);
  const prompt = readFileSync(new URL("../components/EmailVerificationPrompt.tsx", import.meta.url), "utf8");
  assert.match(prompt, /dismissVerifyPrompt/);
  assert.match(prompt, /shouldShowVerificationPrompt/);
  assert.match(prompt, /shouldRefreshEmailVerified/);
  assert.equal(prompt.includes("fixed z-40"), false);
  const appShell = readFileSync(new URL("../components/AppShell.tsx", import.meta.url), "utf8");
  assert.match(appShell, /EmailVerificationPrompt/);
});

test("reset submits only from the form, and the forgot message is not built from the address", () => {
  const reset = readFileSync(new URL("../reset-password/ResetPasswordClient.tsx", import.meta.url), "utf8");
  const effectStart = reset.indexOf("useEffect(");
  const submitStart = reset.indexOf("async function onSubmit");
  assert.ok(effectStart >= 0 && submitStart > effectStart);
  const effect = reset.slice(effectStart, submitStart);
  assert.equal(effect.includes("/auth/password/reset"), false);
  assert.equal(effect.includes("verifyOnce"), false);
  assert.match(effect, /history\.replaceState/);
  assert.match(effect, /router\.replace/);
  assert.equal(effect.includes("apiFetch"), false);
  assert.match(reset, /useAuthLink\("reset"\)/);
  assert.match(reset, /\/auth\/password\/reset/);
  assert.match(reset, /preparePasswordReset/);
  const linkHook = readFileSync(new URL("./useAuthLink.ts", import.meta.url), "utf8");
  assert.match(linkHook, /captureLinkToken/);
  assert.match(linkHook, /history\.replaceState/);

  const verify = readFileSync(new URL("../verify-email/VerifyEmailClient.tsx", import.meta.url), "utf8");
  assert.match(verify, /verifyOnce/);
  assert.match(verify, /history\.replaceState/);
  assert.match(verify, /\/auth\/email\/verify/);

  const form = readFileSync(new URL("../components/EmailRequestForm.tsx", import.meta.url), "utf8");
  assert.equal(form.includes("${email}"), false);
  assert.match(form, /outcome\.message/);
  assert.match(form, /interpretEmailRequest/);
  assert.match(form, /retryAfter: err\.retryAfter/);

  const session = readFileSync(new URL("./storedSession.ts", import.meta.url), "utf8");
  assert.equal(session.includes("clearDraft"), false);
  assert.match(session, /ACCESS_TOKEN_KEY = "token"/);
});
