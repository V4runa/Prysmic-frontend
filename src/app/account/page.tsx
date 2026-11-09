"use client";

import { useCallback, useState } from "react";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import ExportDataButton from "../components/ExportDataButton";
import DeleteAccountDialog from "../components/DeleteAccountDialog";
import { FormButton } from "../components/forms";
import { useSessionIdentity } from "../hooks/useAuth";

export default function AccountPage() {
  const [open, setOpen] = useState(false);
  const { username, email } = useSessionIdentity();
  const close = useCallback(() => setOpen(false), []);

  return (
    <PageTransition>
      <div className="w-full app-page-h overflow-y-auto app-scroll px-4 py-6 sm:px-6">
        <GlassPanel className="mx-auto w-full max-w-lg">
          <h1 className="text-2xl font-medium tracking-wide text-slate-100">Account</h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            {username ? (
              <>
                Wandering as <span className="italic text-slate-300">{username}</span>
              </>
            ) : (
              "The quiet corners of this account."
            )}
            {email ? <span className="mt-1 block text-slate-500">{email}</span> : null}
          </p>

          <section className="mt-8 rounded-lg border border-rose-300/25 bg-rose-400/[0.04] p-4 sm:p-5">
            <h2 className="text-base font-medium tracking-wide text-rose-100">Delete account</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              This permanently deletes all of your notes, tags, habits, tasks, and moods.
              It can&apos;t be undone. Export your data first if you want a copy.
            </p>
            <div className="mt-3">
              <ExportDataButton />
            </div>
            <FormButton
              type="button"
              variant="danger"
              className="mt-4"
              onClick={() => setOpen(true)}
            >
              Delete account
            </FormButton>
          </section>
        </GlassPanel>
      </div>
      {open ? <DeleteAccountDialog onClose={close} /> : null}
    </PageTransition>
  );
}
