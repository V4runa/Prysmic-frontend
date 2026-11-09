export function DraftBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-amber-300/30 bg-amber-400/10">
      <p className="mx-auto max-w-3xl px-5 py-3 text-sm leading-relaxed text-amber-100">
        <span className="mr-2 text-[0.65rem] uppercase tracking-[0.18em] text-amber-200">
          Draft — needs review
        </span>
        {children}
      </p>
    </div>
  );
}
