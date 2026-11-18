import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Calm stand-in for a note, task, or contract that is not here.
 * Same glass page as the rest of the app, with a way back.
 */
export default function MissingRecord({
  title = "Not found",
  message,
  backHref,
  backLabel,
}: {
  title?: string;
  message: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <section
      aria-labelledby="missing-record-title"
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center"
    >
      <h2
        id="missing-record-title"
        className="text-xl font-medium tracking-wide text-slate-100"
      >
        {title}
      </h2>
      <p className="max-w-sm text-sm leading-relaxed text-slate-400">{message}</p>
      <Link
        href={backHref}
        className="tap-target mt-2 inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>
    </section>
  );
}
