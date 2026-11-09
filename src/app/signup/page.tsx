"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@vercel/analytics";
import GlassPanel from "../components/GlassPanel";
import { ApiError, apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import { markOnboardingPending } from "../components/OnboardingModal";
import { TextField, FormButton } from "../components/forms";
import PasswordHints from "../components/PasswordHints";
import { interpretSignupError } from "../lib/authMessages";
import { passwordBlockMessage } from "../lib/passwordPolicy";
import { landingHref } from "../lib/preferences";
import { applyAuthSession } from "../lib/storedSession";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const block = passwordBlockMessage(password, { email, username });
    if (block) {
      setError(block);
      return;
    }
    setError("");
    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), 3500);

    try {
      const res = await apiFetch<{ access_token: string; emailVerified?: boolean }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });

      applyAuthSession({
        token: res.access_token,
        emailVerified: res.emailVerified,
        signedUp: res.emailVerified !== true,
      });
      markOnboardingPending();
      track("signup");
      clearTimeout(slowTimer);
      router.push(landingHref());
    } catch (err: Error | unknown) {
      console.error("Signup failed", err);
      clearTimeout(slowTimer);
      setError(
        err instanceof ApiError
          ? interpretSignupError(err.status, err.body)
          : "Signup couldn't finish. Please try again."
      );
      setLoading(false);
      setSlow(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto app-scroll bg-transparent">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
      <PageTransition>
        {" "}
        {/* ✅ */}
        <GlassPanel className="w-full max-w-sm">
          <h2 className="text-slate-100 text-2xl font-medium mb-6 text-center tracking-wide">
            Create an Account
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              type="text"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              aria-describedby={error ? "signup-password-rules signup-error" : "signup-password-rules"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
            />
            <PasswordHints
              id="signup-password-rules"
              password={password}
              email={email}
              username={username}
            />
            <FormButton
              type="submit"
              variant="primary"
              className="w-full mt-2 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Sign Up"}
            </FormButton>
          </form>

          {error ? (
            <p id="signup-error" role="alert" className="text-rose-400 text-sm mt-3 text-center">{error}</p>
          ) : null}

          {slow && !error && (
            <p className="text-slate-400 text-xs mt-3 text-center">
              Waking the server — the first attempt can take a few seconds.
            </p>
          )}

          <p className="text-slate-400 text-sm mt-4 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-300 hover:underline">
              Log in
            </Link>
          </p>
        </GlassPanel>
      </PageTransition>
      </div>
    </div>
  );
}
