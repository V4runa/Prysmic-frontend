"use client";

import Link from "next/link";
import AuthFrame from "../components/AuthFrame";
import EmailRequestForm from "../components/EmailRequestForm";

export default function ForgotPasswordPage() {
  return (
    <AuthFrame>
      <h1 className="text-slate-100 text-2xl font-medium mb-3 text-center tracking-wide">
        Forgot your password?
      </h1>
      <p className="text-slate-300 text-sm text-center leading-relaxed mb-6">
        Leave the email on your account. If it&apos;s here, a link will find you.
      </p>
      <EmailRequestForm
        endpoint="/auth/password/forgot"
        submitLabel="Send a link"
        pendingLabel="Sending…"
        idPrefix="forgot"
      />
      <p className="text-slate-400 text-sm mt-4 text-center">
        <Link href="/login" className="text-cyan-300 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
