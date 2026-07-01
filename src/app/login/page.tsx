"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";
import { apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import { TextField, FormButton } from "../components/forms";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      localStorage.setItem("token", res.access_token);
      router.push("/notes");
    } catch (err: Error | unknown) {
      console.error("Login failed", err);
      setError("Invalid login credentials.");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 bg-transparent">
      <PageTransition>
        {" "}
        {/* ✅ */}
        <GlassPanel className="w-full max-w-sm">
          <h2 className="text-slate-100 text-2xl font-medium mb-6 text-center tracking-wide">
            Enter the Flow
          </h2>

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
            <FormButton type="submit" variant="primary" className="w-full mt-2">
              Log In
            </FormButton>
          </form>

          {error && (
            <p className="text-rose-400 text-sm mt-3 text-center">{error}</p>
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
  );
}
