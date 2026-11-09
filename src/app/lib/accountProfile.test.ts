import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProfileUpdate,
  interpretPasswordChange,
  interpretProfileWrite,
  newPasswordIssue,
  passwordPolicyView,
  readPublicUser,
  readSelf,
} from "./accountProfile";

const policy = { minLength: 8, maxBytes: 72 };

test("password policy falls back when the body is incomplete", () => {
  assert.deepEqual(passwordPolicyView(null, policy), policy);
  assert.deepEqual(passwordPolicyView({ minLength: 10 }, policy), { minLength: 10, maxBytes: 72 });
});

test("a public user is read from the response, including a one-item list", () => {
  const user = {
    id: 7,
    username: "Ada",
    email: "ada@prysmic.test",
    emailVerified: false,
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
  };
  assert.deepEqual(readPublicUser(user), {
    id: 7,
    username: "Ada",
    email: "ada@prysmic.test",
    emailVerified: false,
  });
  assert.equal(readSelf([user], 7)?.username, "Ada");
  assert.equal(readSelf([user], 8), null);
});

test("profile updates send a password only when the email changes", () => {
  const same = buildProfileUpdate({
    username: "Ada",
    email: "Ada@Prysmic.test",
    savedUsername: "Ada",
    savedEmail: "ada@prysmic.test",
    currentPassword: "",
  });
  assert.deepEqual(same, { ok: true, changed: false });

  const renamed = buildProfileUpdate({
    username: "AdaL",
    email: "ada@prysmic.test",
    savedUsername: "Ada",
    savedEmail: "ada@prysmic.test",
    currentPassword: "secret",
  });
  assert.deepEqual(renamed, { ok: true, changed: true, emailChanged: false, body: { username: "AdaL" } });

  const missing = buildProfileUpdate({
    username: "Ada",
    email: "new@prysmic.test",
    savedUsername: "Ada",
    savedEmail: "ada@prysmic.test",
    currentPassword: "",
  });
  assert.deepEqual(missing, {
    ok: false,
    field: "currentPassword",
    message: "Enter your current password to change your email.",
  });

  const moved = buildProfileUpdate({
    username: "Ada",
    email: "new@prysmic.test",
    savedUsername: "Ada",
    savedEmail: "ada@prysmic.test",
    currentPassword: "secret",
  });
  assert.deepEqual(moved, {
    ok: true,
    changed: true,
    emailChanged: true,
    body: { email: "new@prysmic.test", currentPassword: "secret" },
  });
});

test("profile errors land on the field the contract names", () => {
  const saved = interpretProfileWrite(200, {
    id: 7,
    username: "Ada",
    email: "ada@prysmic.test",
    emailVerified: true,
    createdAt: "2026-11-09",
    updatedAt: "2026-11-09",
  });
  assert.equal(saved.type, "saved");
  if (saved.type === "saved") assert.equal(saved.user?.emailVerified, true);
  assert.equal("token" in saved, false);

  assert.deepEqual(interpretProfileWrite(401, { statusCode: 401, message: "Invalid credentials", error: "Unauthorized" }), {
    type: "wrong-password",
    message: "Invalid credentials",
  });
  assert.deepEqual(
    interpretProfileWrite(401, { message: "Unauthorized: Invalid or missing token" }),
    { type: "expired" }
  );
  assert.deepEqual(
    interpretProfileWrite(400, { message: "Enter your current password to change your email." }),
    { type: "rejected", field: "currentPassword", message: "Enter your current password to change your email." }
  );
  assert.deepEqual(interpretProfileWrite(409, { message: "Email already in use!" }), {
    type: "conflict",
    field: "email",
    message: "Email already in use!",
  });
  assert.deepEqual(interpretProfileWrite(409, { message: "Username already taken!" }), {
    type: "conflict",
    field: "username",
    message: "Username already taken!",
  });
  assert.deepEqual(interpretProfileWrite(400, { message: ["email must be an email"] }), {
    type: "rejected",
    field: "email",
    message: "email must be an email",
  });
  assert.deepEqual(interpretProfileWrite(404, { message: "User not found" }), {
    type: "rejected",
    field: "form",
    message: "User not found",
  });
  const wait = interpretProfileWrite(429, { message: "Too many requests. Wait a little, then try again." }, "30");
  assert.equal(wait.type, "wait");
  if (wait.type === "wait") {
    assert.match(wait.message, /Too many requests/);
    assert.match(wait.message, /30 seconds/);
  }
});

test("password change stores the login token and shows policy failures on the new password", () => {
  const updated = interpretPasswordChange(200, { access_token: "fresh", emailVerified: true });
  assert.deepEqual(updated, { type: "updated", token: "fresh", emailVerified: true });

  assert.deepEqual(interpretPasswordChange(401, { message: "Invalid credentials" }), {
    type: "wrong-password",
    message: "Invalid credentials",
  });
  assert.equal(interpretPasswordChange(401, { message: "Unauthorized: Invalid or missing token" }).type, "expired");

  for (const message of [
    "New password must be different from the current password.",
    "Password must be at least 8 characters.",
    "Password must be at most 72 bytes.",
    "Password cannot be your email address.",
    "Password cannot be the part of your email before @.",
    "Password cannot be your username.",
    "That password is too common. Choose a different one.",
  ]) {
    assert.deepEqual(interpretPasswordChange(400, { statusCode: 400, message, error: "Bad Request" }), {
      type: "rejected",
      message,
    });
  }

  const wait = interpretPasswordChange(
    429,
    { message: ["Too many requests. Wait a little, then try again."] },
    "120"
  );
  assert.equal(wait.type, "wait");
  if (wait.type === "wait") assert.match(wait.message, /2 minutes/);
  assert.equal(interpretPasswordChange(200, { emailVerified: true }).type, "missing-token");
});

test("local password checks use the same sentences as the API", () => {
  const base = {
    currentPassword: "current-secret",
    confirm: "current-secret",
    email: "Ada@Prysmic.test",
    username: "Ada",
    policy,
  };
  assert.equal(
    newPasswordIssue({ ...base, password: "current-secret", confirm: "current-secret" })?.message,
    "New password must be different from the current password."
  );
  assert.equal(newPasswordIssue({ ...base, password: "short", confirm: "short" })?.message, "Password must be at least 8 characters.");
  assert.equal(
    newPasswordIssue({ ...base, password: "ada@prysmic.test", confirm: "ada@prysmic.test" })?.message,
    "Password cannot be your email address."
  );
  assert.equal(
    newPasswordIssue({ ...base, username: "AdaWander", password: "adawander", confirm: "adawander" })?.message,
    "Password cannot be your username."
  );
  assert.equal(
    newPasswordIssue({
      ...base,
      email: "prysmic.test@example.com",
      password: "prysmic.test",
      confirm: "prysmic.test",
    })?.message,
    "Password cannot be the part of your email before @."
  );
  assert.equal(newPasswordIssue({ ...base, password: "long-enough", confirm: "other-value" })?.message, "Those passwords don't match yet.");
  assert.equal(newPasswordIssue({ ...base, password: "long-enough", confirm: "long-enough" }), null);
});
