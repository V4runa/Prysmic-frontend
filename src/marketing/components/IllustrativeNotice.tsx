export function IllustrativeNotice({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-slate-300">
      <span className="mr-2 text-[0.65rem] uppercase tracking-[0.2em] text-cyan-200/90">
        Illustrative
      </span>
      {compact
        ? "Fictional examples, written to show the rooms. Not customers, quotes, or case studies."
        : "The weeks on this site, and the workspace in the pictures, are invented. They are not customers, testimonials, or case studies. Any streak or count you see is sample data."}
    </p>
  );
}
