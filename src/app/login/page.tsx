"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";
import { apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import { TextField, FormButton } from "../components/forms";
import { applyAuthSession, readLoginNotice } from "../lib/storedSession";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // The backend can be cold on the first hit after idle; surface that so a
  // multi-second wait never reads as a frozen/unresponsive button.
  const [slow, setSlow] = useState(false);
  const notice = useSyncExternalStore(
    () => () => {},
    readLoginNotice,
    () => null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), 3500);

    try {
      const res = await apiFetch<{ access_token: string; emailVerified?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      applyAuthSession({ token: res.access_token, emailVerified: res.emailVerified });
      clearTimeout(slowTimer);
      router.push("/notes");
    } catch (err: Error | unknown) {
      console.error("Login failed", err);
      clearTimeout(slowTimer);
      setError("Invalid login credentials.");
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
            Enter the Flow
          </h2>

          {notice && (
            <p role="status" aria-live="polite" className="text-cyan-100 text-sm mb-4 text-center leading-relaxed">
              {notice}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              type="text"
              placeholder="Username or Email"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <TextField
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end -mt-2">
              <Link href="/forgot-password" className="tap-target inline-flex items-center text-sm text-cyan-300 hover:underline">
                Forgot password?
              </Link>
            </div>
            <FormButton
              type="submit"
              variant="primary"
              className="w-full mt-2 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Log In"}
            </FormButton>
          </form>

          {error && (
            <p role="alert" className="text-rose-400 text-sm mt-3 text-center">{error}</p>
          )}

          {slow && !error && (
            <p className="text-slate-400 text-xs mt-3 text-center">
              Waking the server — the first attempt can take a few seconds.
            </p>
          )}

          <p className="text-slate-400 text-sm mt-4 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-cyan-300 hover:underline">
              Sign up
            </Link>
          </p>
        </GlassPanel>
      </PageTransition>
      </div>
    </div>
  );
}
