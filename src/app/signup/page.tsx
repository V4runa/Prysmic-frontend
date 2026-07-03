"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";
import { apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import { markOnboardingPending } from "../components/OnboardingModal";
import { TextField, FormButton } from "../components/forms";

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
    setError("");
    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), 3500);

    try {
      const res = await apiFetch<{ access_token: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });

      localStorage.setItem("token", res.access_token);
      markOnboardingPending();
      clearTimeout(slowTimer);
      router.push("/notes");
    } catch (err: Error | unknown) {
      console.error("Signup failed", err);
      clearTimeout(slowTimer);
      setError("Signup failed. Please try again.");
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {error && (
            <p className="text-rose-400 text-sm mt-3 text-center">{error}</p>
          )}

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
