import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { preparePasswordReset } from "./authMessages";
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  assessPassword,
  passwordBlockMessage,
  passwordMatchesIdentity,
  passwordStrength,
  utf8ByteLength,
} from "./passwordPolicy";

test("hard rules allow a light password and refuse length, bytes, and identity", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  assert.equal(PASSWORD_MAX_BYTES, 72);
  assert.deepEqual(
    PASSWORD_REQUIREMENTS.map((rule) => rule.label),
    [
      "At least 8 characters",
      "No more than 72 bytes",
      "Not your email, the part before @, or your username",
    ]
  );

  assert.equal(passwordBlockMessage("abcdefgh"), null);
  assert.equal(passwordStrength("abcdefgh"), "weak");
  assert.equal(assessPassword("").rules.length, "idle");
  assert.match(passwordBlockMessage("") ?? "", /8 characters/);

  assert.match(passwordBlockMessage("short") ?? "", /8 characters/);
  assert.equal(passwordBlockMessage("short")?.includes("72"), false);

  const within = "é".repeat(36);
  const over = "é".repeat(37);
  assert.equal(utf8ByteLength(within), 72);
  assert.equal(utf8ByteLength(over), 74);
  assert.equal(passwordBlockMessage(within), null);
  assert.match(passwordBlockMessage("a".repeat(73)) ?? "", /72 bytes/);
  assert.match(passwordBlockMessage(over) ?? "", /72 bytes/);

  const identity = { email: "Ada@Prysmic.test", username: "Wanderer" };
  assert.equal(passwordMatchesIdentity("ada@prysmic.test", identity), true);
  assert.equal(passwordMatchesIdentity("ADA", identity), true);
  assert.equal(passwordMatchesIdentity("  wanderer  ", identity), true);
  assert.equal(passwordMatchesIdentity("prysmic.test", identity), false);
  assert.equal(passwordMatchesIdentity("quiet-path", identity), false);
  assert.equal(passwordMatchesIdentity("quiet-path", {}), false);

  const both = passwordBlockMessage("ada", identity) ?? "";
  assert.match(both, /8 characters/);
  assert.match(both, /email or username/);

  const matched = passwordBlockMessage("wanderer", identity) ?? "";
  assert.equal(matched.includes("8 characters"), false);
  assert.match(matched, /email or username/);

  const known = assessPassword("quiet-path", identity);
  assert.equal(known.rules.length, "met");
  assert.equal(known.rules.bytes, "met");
  assert.equal(known.rules.identity, "met");
  assert.equal(known.strength === "empty", false);

  const unknown = assessPassword("quiet-path", {});
  assert.equal(unknown.identityKnown, false);
  assert.equal(unknown.rules.identity, "idle");
  assert.equal(passwordBlockMessage("quiet-path", {}), null);
});

test("strength never decides the reset gate", () => {
  const weak = preparePasswordReset({
    token: "secret",
    password: "abcdefgh",
    confirm: "abcdefgh",
  });
  assert.equal(passwordStrength("abcdefgh"), "weak");
  assert.deepEqual(weak, { ok: true, body: { token: "secret", password: "abcdefgh" } });

  const local = preparePasswordReset({
    token: "secret",
    password: "ada",
    confirm: "ada",
    email: "Ada@Prysmic.test",
  });
  assert.equal(local.ok, false);
  if (!local.ok) {
    assert.equal(local.reason, "short");
    assert.match(local.message, /email or username/);
  }

  const bytes = preparePasswordReset({
    token: "secret",
    password: "é".repeat(37),
    confirm: "é".repeat(37),
  });
  assert.equal(bytes.ok, false);
  if (!bytes.ok) assert.equal(bytes.reason, "long");
});

test("signup and reset show the rules and no longer mention 6 characters", () => {
  const signup = readFileSync(new URL("../signup/page.tsx", import.meta.url), "utf8");
  const reset = readFileSync(new URL("../reset-password/ResetPasswordClient.tsx", import.meta.url), "utf8");
  const messages = readFileSync(new URL("./authMessages.ts", import.meta.url), "utf8");
  for (const source of [signup, reset, messages]) {
    assert.equal(/6 characters/i.test(source), false);
  }
  assert.match(signup, /PasswordHints/);
  assert.match(signup, /passwordBlockMessage/);
  const submit = signup.slice(signup.indexOf("handleSubmit"), signup.indexOf("return ("));
  assert.ok(submit.indexOf("passwordBlockMessage") < submit.indexOf("apiFetch"));
  assert.match(reset, /PasswordHints/);
  assert.match(reset, /id="new-password-rules"/);
  assert.equal(reset.includes('hint="At least'), false);
});
