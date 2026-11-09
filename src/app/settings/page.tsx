"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import DeleteAccountDialog from "../components/DeleteAccountDialog";
import ExportDataButton from "../components/ExportDataButton";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import PasswordHints from "../components/PasswordHints";
import UserAvatar, { AvatarGlyph } from "../components/UserAvatar";
import { syncVerificationProfile } from "../components/EmailVerificationPrompt";
import { Field, FormButton, SelectField, TextField } from "../components/forms";
import { ApiError, apiFetch } from "../hooks/useApi";
import { useSessionIdentity } from "../hooks/useAuth";
import { usePreferences } from "../hooks/usePreferences";
import {
  buildProfileUpdate,
  interpretPasswordChange,
  interpretProfileWrite,
  newPasswordIssue,
  passwordPolicySentence,
  passwordPolicyView,
  readSelf,
  type PasswordPolicyView,
  type ProfileField,
  type PublicProfile,
} from "../lib/accountProfile";
import { signalSessionExpired } from "../lib/accountDeletion";
import { interpretEmailRequest, PASSWORD_UPDATED_NOTICE, validateEmail } from "../lib/authMessages";
import { requestLogout } from "../lib/logout";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "../lib/passwordPolicy";
import {
  AVATAR_COLORS,
  AVATAR_GLYPHS,
  DAY_RESET_HOURS,
  LANDING_PAGES,
  dayResetLabel,
  readPreferences,
  writePreferences,
  type AvatarPreference,
  type AvatarStyle,
  type ClockFormat,
  type DayResetHour,
  type LandingPageId,
} from "../lib/preferences";
import {
  applyAuthSession,
  clearStoredSession,
  readStoredToken,
  rememberEmailNeedsConfirmation,
  setLoginNotice,
} from "../lib/storedSession";
import { clearSessionProfile, publishSessionProfile } from "../lib/sessionIdentity";

const FALLBACK_POLICY: PasswordPolicyView = {
  minLength: PASSWORD_MIN_LENGTH,
  maxBytes: PASSWORD_MAX_BYTES,
};

type SectionStatus =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved" }
  | { state: "error"; message: string };

function subscribeToken() {
  return () => {};
}

function SectionNotice({ status }: { status: SectionStatus }) {
  if (status.state === "saving") {
    return (
      <p role="status" className="text-xs text-slate-400">
        Saving…
      </p>
    );
  }
  if (status.state === "saved") {
    return (
      <p role="status" className="text-xs text-cyan-200">
        Saved.
      </p>
    );
  }
  if (status.state === "error" && status.message) {
    return (
      <p role="alert" className="text-xs text-rose-300">
        {status.message}
      </p>
    );
  }
  return null;
}

function Choice({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`tap-target inline-flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-cyan-200/70 ${
        checked
          ? "border-cyan-300/40 bg-white/15 text-cyan-50"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

async function loadSelf(userId: number): Promise<PublicProfile | null> {
  const body = await apiFetch<unknown>("/users");
  return readSelf(body, userId);
}

function ProfileSection({ userId }: { userId: number }) {
  const identity = useSessionIdentity();
  const prefs = usePreferences();
  const [username, setUsername] = useState(identity.username ?? "");
  const [email, setEmail] = useState(identity.email ?? "");
  const [baseline, setBaseline] = useState({
    username: identity.username ?? "",
    email: identity.email ?? "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [avatarDraft, setAvatarDraft] = useState<AvatarPreference | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [status, setStatus] = useState<SectionStatus>({ state: "idle" });
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const dirty = useRef(false);
  const lock = useRef(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const avatar = avatarDraft ?? prefs.avatar;
  const emailChanged = email.trim().toLowerCase() !== baseline.email.trim().toLowerCase();

  const applyProfile = useCallback((user: PublicProfile, emailJustChanged: boolean) => {
    const verified =
      typeof user.emailVerified === "boolean" ? user.emailVerified : emailJustChanged ? false : null;
    publishSessionProfile({
      userId: user.id,
      username: user.username,
      email: user.email,
      emailVerified: verified,
    });
    if (emailJustChanged && verified === false) rememberEmailNeedsConfirmation();
    syncVerificationProfile({ email: user.email, emailVerified: verified });
    dirty.current = false;
    setUsername(user.username);
    setEmail(user.email);
    setBaseline({ username: user.username, email: user.email });
    setCurrentPassword("");
  }, []);

  useEffect(() => {
    if (dirty.current) return;
    setUsername(identity.username ?? "");
    setEmail(identity.email ?? "");
    setBaseline({
      username: identity.username ?? "",
      email: identity.email ?? "",
    });
  }, [identity.username, identity.email]);

  useEffect(() => {
    let cancelled = false;
    loadSelf(userId)
      .then((user) => {
        if (!cancelled && user && !dirty.current) applyProfile(user, false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId, applyProfile]);

  const focusField = (field: ProfileField) => {
    if (field === "username") usernameRef.current?.focus();
    else if (field === "email") emailRef.current?.focus();
    else if (field === "currentPassword") passwordRef.current?.focus();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    const plan = buildProfileUpdate({
      username,
      email,
      savedUsername: baseline.username,
      savedEmail: baseline.email,
      currentPassword,
    });
    if (!plan.ok) {
      setErrors({ [plan.field]: plan.message });
      setStatus({ state: "idle" });
      focusField(plan.field);
      return;
    }
    lock.current = true;
    setErrors({});
    setStatus({ state: "saving" });
    try {
      if (plan.changed) {
        const body = await apiFetch<unknown>(`/users/${userId}`, {
          method: "PUT",
          keepSessionOn401: true,
          body: JSON.stringify(plan.body),
        });
        const outcome = interpretProfileWrite(200, body);
        if (outcome.type !== "saved") {
          setStatus({ state: "error", message: "The profile was not saved." });
          return;
        }
        // The session token is not reissued. The response (or GET /users) is the name and email to show.
        const user = outcome.user ?? (await loadSelf(userId).catch(() => null));
        if (user) applyProfile(user, plan.emailChanged);
        else {
          const nextUsername = plan.body.username ?? username.trim();
          const nextEmail = plan.body.email ?? email.trim().toLowerCase();
          const verified = plan.emailChanged ? false : identity.emailVerified;
          publishSessionProfile({ userId, username: nextUsername, email: nextEmail, emailVerified: verified });
          if (plan.emailChanged) rememberEmailNeedsConfirmation();
          syncVerificationProfile({ email: nextEmail, emailVerified: verified });
          dirty.current = false;
          setBaseline({ username: nextUsername, email: nextEmail });
          setCurrentPassword("");
        }
      }
      writePreferences({ ...readPreferences(), avatar });
      setAvatarDraft(null);
      setStatus({ state: "saved" });
    } catch (err) {
      if (err instanceof ApiError) {
        const outcome = interpretProfileWrite(err.status, err.body, err.retryAfter);
        if (outcome.type === "expired") {
          signalSessionExpired();
          return;
        }
        if (outcome.type === "wait") {
          setStatus({ state: "error", message: outcome.message });
          return;
        }
        if (outcome.type === "wrong-password") {
          setErrors({ currentPassword: outcome.message });
          setStatus({ state: "idle" });
          passwordRef.current?.focus();
          return;
        }
        if (outcome.type === "conflict" || outcome.type === "rejected") {
          if (outcome.field === "form") setStatus({ state: "error", message: outcome.message });
          else {
            setErrors({ [outcome.field]: outcome.message });
            setStatus({ state: "idle" });
            focusField(outcome.field);
          }
          return;
        }
        setStatus({ state: "error", message: outcome.type === "failed" ? outcome.message : "The profile was not saved." });
        return;
      }
      setStatus({
        state: "error",
        message: err instanceof TypeError ? "Could not reach the server. Try again in a moment." : "The profile was not saved.",
      });
    } finally {
      lock.current = false;
    }
  };

  const resend = async () => {
    if (resending || emailChanged) return;
    const address = baseline.email.trim().toLowerCase();
    const local = validateEmail(address);
    if (local) {
      setResendNotice(local);
      return;
    }
    setResending(true);
    setResendNotice(null);
    try {
      await apiFetch("/auth/email/resend", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email: address }),
      });
      setResendNotice(interpretEmailRequest({ status: 200, body: null, retryAfter: null }).message);
    } catch (err) {
      if (err instanceof ApiError) {
        setResendNotice(
          interpretEmailRequest({ status: err.status, body: err.body, retryAfter: err.retryAfter }).message
        );
      } else {
        setResendNotice("Something got in the way. Try again in a moment.");
      }
    } finally {
      setResending(false);
    }
  };

  const setStyle = (style: AvatarStyle) => {
    setAvatarDraft({ ...avatar, style });
    setStatus({ state: "idle" });
  };

  const verified = identity.emailVerified;
  const usernameError = errors.username;
  const emailError = errors.email;
  const passwordError = errors.currentPassword;

  return (
    <>
      <header className="flex items-center gap-4 px-1">
        <UserAvatar username={username || identity.username} avatar={avatar} size="md" />
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-wide text-slate-100">Settings</h1>
          <p className="mt-1 text-sm text-slate-400 leading-relaxed">
            Your profile, sign-in, and a few choices this browser keeps for you.
          </p>
        </div>
      </header>

      <GlassPanel>
        <h2 className="text-base font-medium tracking-wide text-slate-100">Profile</h2>
        <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-slate-300">Avatar</legend>
            <p className="text-sm text-slate-400 leading-relaxed">
              A monogram or a simple mark. It stays on this browser.
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar style">
              <Choice name="avatar-style" value="monogram" checked={avatar.style === "monogram"} onChange={() => setStyle("monogram")}>
                Monogram
              </Choice>
              <Choice name="avatar-style" value="glyph" checked={avatar.style === "glyph"} onChange={() => setStyle("glyph")}>
                Icon
              </Choice>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar color">
              {AVATAR_COLORS.map((color) => {
                const selected = avatar.color === color.id;
                return (
                  <label
                    key={color.id}
                    className={`inline-flex rounded-full focus-within:ring-2 focus-within:ring-cyan-200/80 ${
                      selected ? "ring-2 ring-white/80" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="avatar-color"
                      className="sr-only"
                      value={color.id}
                      checked={selected}
                      onChange={() => {
                        setAvatarDraft({ ...avatar, color: color.id });
                        setStatus({ state: "idle" });
                      }}
                    />
                    <span className={`h-7 w-7 rounded-full border border-white/20 ${color.swatch}`} />
                    <span className="sr-only">{color.label}</span>
                  </label>
                );
              })}
            </div>
            {avatar.style === "glyph" ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Avatar icon">
                {AVATAR_GLYPHS.map((glyph) => {
                  const selected = avatar.glyph === glyph.id;
                  return (
                    <label
                      key={glyph.id}
                      className={`inline-flex h-10 items-center justify-center rounded-md border focus-within:ring-2 focus-within:ring-cyan-200/70 ${
                        selected
                          ? "border-cyan-300/40 bg-white/15 text-cyan-50"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="avatar-glyph"
                        className="sr-only"
                        value={glyph.id}
                        checked={selected}
                        onChange={() => {
                          setAvatarDraft({ ...avatar, style: "glyph", glyph: glyph.id });
                          setStatus({ state: "idle" });
                        }}
                      />
                      <AvatarGlyph id={glyph.id} className="h-4 w-4" />
                      <span className="sr-only">{glyph.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </fieldset>

          <Field label="Username" htmlFor="settings-username" error={usernameError}>
            <TextField
              ref={usernameRef}
              id="settings-username"
              autoComplete="username"
              value={username}
              aria-invalid={usernameError ? true : undefined}
              aria-describedby={usernameError ? "settings-username-error" : undefined}
              onChange={(event) => {
                dirty.current = true;
                setUsername(event.target.value);
                setStatus({ state: "idle" });
                if (usernameError) setErrors((prev) => ({ ...prev, username: undefined }));
              }}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <Field label="Email" htmlFor="settings-email" error={emailError}>
              <TextField
                ref={emailRef}
                id="settings-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "settings-email-error settings-email-note" : "settings-email-note"}
                onChange={(event) => {
                  dirty.current = true;
                  setEmail(event.target.value);
                  setStatus({ state: "idle" });
                  if (emailError) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
              />
            </Field>
            <p id="settings-email-note" className="text-sm text-slate-400 leading-relaxed">
              Changing your email requires confirming the new address.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {verified === true ? (
                <span className="inline-flex items-center rounded-full border border-cyan-300/30 px-2 py-0.5 text-xs text-cyan-100">
                  Confirmed
                </span>
              ) : verified === false ? (
                <span className="inline-flex items-center rounded-full border border-amber-200/30 px-2 py-0.5 text-xs text-amber-100">
                  Not confirmed
                </span>
              ) : null}
              {baseline.email && verified !== true ? (
                <FormButton type="button" variant="secondary" disabled={resending || emailChanged} onClick={resend}>
                  {resending ? "Sending…" : "Resend confirmation"}
                </FormButton>
              ) : null}
            </div>
            {emailChanged ? (
              <p className="text-xs text-slate-500">Save the new email before sending confirmation.</p>
            ) : null}
            {resendNotice ? (
              <p role="status" aria-live="polite" className="text-sm text-slate-300 leading-relaxed">
                {resendNotice}
              </p>
            ) : null}
          </div>

          {emailChanged ? (
            <Field label="Current password" htmlFor="settings-email-password" error={passwordError}>
              <TextField
                ref={passwordRef}
                id="settings-email-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={passwordError ? "settings-email-password-error" : undefined}
                onChange={(event) => {
                  dirty.current = true;
                  setCurrentPassword(event.target.value);
                  setStatus({ state: "idle" });
                  if (passwordError) setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }}
              />
            </Field>
          ) : null}

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <FormButton type="submit" variant="primary" className="w-full sm:w-auto" disabled={status.state === "saving"} aria-busy={status.state === "saving"}>
              {status.state === "saving" ? "Saving…" : "Save profile"}
            </FormButton>
            <SectionNotice status={status} />
          </div>
        </form>
      </GlassPanel>
    </>
  );
}

function SecuritySection({ userId }: { userId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const identity = useSessionIdentity();
  const [policy, setPolicy] = useState<PasswordPolicyView>(FALLBACK_POLICY);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [status, setStatus] = useState<SectionStatus>({ state: "idle" });
  const lock = useRef(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<unknown>("/auth/password-policy", { auth: false })
      .then((body) => {
        if (!cancelled) setPolicy(passwordPolicyView(body, FALLBACK_POLICY));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = () => {
    requestLogout({ queryClient, navigate: (href) => router.push(href) });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    if (!currentPassword) {
      setCurrentError("Enter your current password.");
      setStatus({ state: "idle" });
      currentRef.current?.focus();
      return;
    }
    const issue = newPasswordIssue({
      currentPassword,
      password,
      confirm,
      email: identity.email,
      username: identity.username,
      policy,
    });
    if (issue) {
      setCurrentError(null);
      setNewError(issue.field === "new" ? issue.message : null);
      setConfirmError(issue.field === "confirm" ? issue.message : null);
      setStatus({ state: "idle" });
      (issue.field === "confirm" ? confirmRef : newRef).current?.focus();
      return;
    }
    lock.current = true;
    setCurrentError(null);
    setNewError(null);
    setConfirmError(null);
    setStatus({ state: "saving" });
    try {
      const body = await apiFetch<unknown>("/auth/password/change", {
        method: "POST",
        keepSessionOn401: true,
        body: JSON.stringify({ currentPassword, newPassword: password }),
      });
      const outcome = interpretPasswordChange(200, body);
      if (outcome.type === "missing-token") {
        clearSessionProfile();
        clearStoredSession(queryClient);
        setLoginNotice(PASSWORD_UPDATED_NOTICE);
        router.push("/login");
        return;
      }
      if (outcome.type !== "updated") {
        setStatus({ state: "error", message: "The password was not changed." });
        return;
      }
      clearSessionProfile();
      applyAuthSession({
        token: outcome.token,
        emailVerified: outcome.emailVerified === null ? undefined : outcome.emailVerified,
      });
      const self = await loadSelf(userId).catch(() => null);
      if (self) {
        publishSessionProfile({
          userId: self.id,
          username: self.username,
          email: self.email,
          emailVerified: self.emailVerified,
        });
        syncVerificationProfile({ email: self.email, emailVerified: self.emailVerified });
      }
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setStatus({ state: "saved" });
    } catch (err) {
      if (err instanceof ApiError) {
        const outcome = interpretPasswordChange(err.status, err.body, err.retryAfter);
        if (outcome.type === "expired") {
          signalSessionExpired();
          return;
        }
        if (outcome.type === "wait") {
          setStatus({ state: "error", message: outcome.message });
          return;
        }
        if (outcome.type === "wrong-password") {
          setCurrentError(outcome.message);
          setStatus({ state: "idle" });
          currentRef.current?.focus();
          return;
        }
        if (outcome.type === "rejected") {
          setNewError(outcome.message);
          setStatus({ state: "idle" });
          newRef.current?.focus();
          return;
        }
        setStatus({ state: "error", message: outcome.type === "failed" ? outcome.message : "The password was not changed." });
        return;
      }
      setStatus({
        state: "error",
        message: err instanceof TypeError ? "Could not reach the server. Try again in a moment." : "The password was not changed.",
      });
    } finally {
      lock.current = false;
    }
  };

  const rulesId = "settings-password-rules";
  const policyId = "settings-password-policy";

  return (
    <GlassPanel>
      <h2 className="text-base font-medium tracking-wide text-slate-100">Account & security</h2>
      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={identity.username ?? ""}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        <p id={policyId} className="text-sm text-slate-400 leading-relaxed">
          {passwordPolicySentence(policy)}
        </p>
        <Field label="Current password" htmlFor="settings-current-password" error={currentError ?? undefined}>
          <TextField
            ref={currentRef}
            id="settings-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            aria-invalid={currentError ? true : undefined}
            aria-describedby={currentError ? "settings-current-password-error" : undefined}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setStatus({ state: "idle" });
              if (currentError) setCurrentError(null);
            }}
          />
        </Field>
        <Field label="New password" htmlFor="settings-new-password" error={newError ?? undefined}>
          <TextField
            ref={newRef}
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={newError ? true : undefined}
            aria-describedby={[policyId, rulesId, newError ? "settings-new-password-error" : ""].filter(Boolean).join(" ")}
            onChange={(event) => {
              setPassword(event.target.value);
              setStatus({ state: "idle" });
              if (newError) setNewError(null);
            }}
          />
        </Field>
        <PasswordHints id={rulesId} password={password} email={identity.email} username={identity.username} />
        <Field label="Confirm new password" htmlFor="settings-confirm-password" error={confirmError ?? undefined}>
          <TextField
            ref={confirmRef}
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={confirmError ? "settings-confirm-password-error" : undefined}
            onChange={(event) => {
              setConfirm(event.target.value);
              setStatus({ state: "idle" });
              if (confirmError) setConfirmError(null);
            }}
          />
        </Field>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <FormButton type="submit" variant="primary" className="w-full sm:w-auto" disabled={status.state === "saving"} aria-busy={status.state === "saving"}>
            {status.state === "saving" ? "Saving…" : "Change password"}
          </FormButton>
          <SectionNotice status={status} />
        </div>
      </form>
      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/forgot-password" className="text-sm text-cyan-300 hover:underline">
          Forgot password?
        </Link>
        <FormButton type="button" variant="secondary" onClick={signOut}>
          Sign out
        </FormButton>
      </div>
    </GlassPanel>
  );
}

function PreferencesSection() {
  const prefs = usePreferences();
  const [landingPage, setLandingPage] = useState<LandingPageId | null>(null);
  const [clockFormat, setClockFormat] = useState<ClockFormat | null>(null);
  const [dayResetHour, setDayResetHour] = useState<DayResetHour | null>(null);
  const [status, setStatus] = useState<SectionStatus>({ state: "idle" });
  const landing = landingPage ?? prefs.landingPage;
  const clock = clockFormat ?? prefs.clockFormat;
  const hour = dayResetHour ?? prefs.dayResetHour;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setStatus({ state: "saving" });
    writePreferences({
      ...readPreferences(),
      landingPage: landing,
      clockFormat: clock,
      dayResetHour: hour,
    });
    setLandingPage(null);
    setClockFormat(null);
    setDayResetHour(null);
    setStatus({ state: "saved" });
  };

  return (
    <GlassPanel>
      <h2 className="text-base font-medium tracking-wide text-slate-100">Preferences</h2>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">
        These stay on this browser. They are not part of your account.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
        <Field label="Default page after login" htmlFor="settings-landing">
          <SelectField
            id="settings-landing"
            value={landing}
            onChange={(event) => {
              setLandingPage(event.target.value as LandingPageId);
              setStatus({ state: "idle" });
            }}
          >
            {LANDING_PAGES.map((page) => (
              <option key={page.id} value={page.id}>
                {page.label}
              </option>
            ))}
          </SelectField>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-slate-300">Clock</legend>
          <div className="flex flex-wrap gap-2">
            <Choice
              name="clock-format"
              value="12h"
              checked={clock === "12h"}
              onChange={() => {
                setClockFormat("12h");
                setStatus({ state: "idle" });
              }}
            >
              12-hour
            </Choice>
            <Choice
              name="clock-format"
              value="24h"
              checked={clock === "24h"}
              onChange={() => {
                setClockFormat("24h");
                setStatus({ state: "idle" });
              }}
            >
              24-hour
            </Choice>
          </div>
        </fieldset>

        <Field
          label="Habit and mood day rollover"
          htmlFor="settings-rollover"
          hint="Habits and moods logged before this hour still count toward the previous day."
        >
          <SelectField
            id="settings-rollover"
            value={String(hour)}
            aria-describedby="settings-rollover-hint"
            onChange={(event) => {
              setDayResetHour(Number(event.target.value) as DayResetHour);
              setStatus({ state: "idle" });
            }}
          >
            {DAY_RESET_HOURS.map((value) => (
              <option key={value} value={value}>
                {dayResetLabel(value)}
              </option>
            ))}
          </SelectField>
        </Field>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <FormButton type="submit" variant="primary" className="w-full sm:w-auto" disabled={status.state === "saving"}>
            {status.state === "saving" ? "Saving…" : "Save preferences"}
          </FormButton>
          <SectionNotice status={status} />
        </div>
      </form>
    </GlassPanel>
  );
}

function DataSection() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <GlassPanel>
      <h2 className="text-base font-medium tracking-wide text-slate-100">Data & privacy</h2>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">
        Download a JSON copy of your notes, tags, habits, tasks, and moods. Attachment files are not included.
      </p>
      <div className="mt-3">
        <ExportDataButton />
      </div>

      <section className="mt-8 rounded-lg border border-rose-300/25 bg-rose-400/[0.04] p-4 sm:p-5">
        <h3 className="text-base font-medium tracking-wide text-rose-100">Delete account</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          This permanently deletes all of your notes, tags, habits, tasks, and moods. It can&apos;t be undone.
          Export your data first if you want a copy.
        </p>
        <FormButton type="button" variant="danger" className="mt-4" onClick={() => setOpen(true)}>
          Delete account
        </FormButton>
      </section>

      <p className="mt-6 text-sm text-slate-400">
        <Link href="/privacy" className="text-cyan-300 hover:underline">
          Privacy
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/terms" className="text-cyan-300 hover:underline">
          Terms
        </Link>
      </p>
      {open ? <DeleteAccountDialog onClose={close} /> : null}
    </GlassPanel>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const identity = useSessionIdentity();
  const token = useSyncExternalStore(subscribeToken, readStoredToken, () => undefined);

  useEffect(() => {
    if (token === null) router.replace("/login");
  }, [token, router]);

  if (!token || !identity.userId) return null;

  return (
    <PageTransition>
      <div className="w-full app-page-h overflow-y-auto app-scroll px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-8">
          <ProfileSection userId={identity.userId} />
          <SecuritySection userId={identity.userId} />
          <PreferencesSection />
          <DataSection />
        </div>
      </div>
    </PageTransition>
  );
}
