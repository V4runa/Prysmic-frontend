"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Newspaper, X } from "lucide-react";
import {
  UPDATE_KIND_LABELS,
  comingSoon,
  formatUpdateDate,
  publishedUpdates,
  type ProductUpdate,
  type UpdateKind,
} from "../../content/updates";
import { dismissProductHighlight } from "../hooks/useUpdatesSeen";
import { springSoft } from "../lib/motion";

function subscribeNoop(): () => void {
  return () => {};
}

function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

const KIND_CHIP: Record<UpdateKind, string> = {
  new: "border-cyan-300/30 text-cyan-100",
  improved: "border-violet-300/30 text-violet-100",
  fixed: "border-emerald-300/30 text-emerald-100",
};

function KindChip({ kind }: { kind: UpdateKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${KIND_CHIP[kind]}`}
    >
      {UPDATE_KIND_LABELS[kind]}
    </span>
  );
}

function focusUpdatesControl(preferred: HTMLElement | null) {
  if (preferred?.isConnected && preferred.getClientRects().length > 0) {
    preferred.focus();
    return;
  }
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-updates-nav]");
  for (const button of buttons) {
    if (button.getClientRects().length > 0) {
      button.focus();
      return;
    }
  }
}

export function UpdatesNavButton({
  variant,
  open,
  unread,
  onOpen,
}: {
  variant: "desktop" | "mobile";
  open: boolean;
  unread: boolean;
  onOpen: (from: HTMLButtonElement) => void;
}) {
  const label = unread ? "Updates, unread" : "Updates";

  if (variant === "desktop") {
    return (
      <button
        type="button"
        data-updates-nav=""
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => onOpen(event.currentTarget)}
        className={`inline-flex items-center gap-1.5 bg-transparent p-0 text-xs hover:text-cyan-300 transition whitespace-nowrap sm:text-sm ${
          open ? "text-cyan-300" : "text-slate-300"
        }`}
      >
        <span>Updates</span>
        {unread ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/90" aria-hidden="true" />
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-updates-nav=""
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event) => onOpen(event.currentTarget)}
      className="relative flex min-w-[3.25rem] flex-1 basis-0 flex-col items-center justify-center gap-0.5 bg-transparent p-0 pt-1.5"
    >
      {open ? (
        <motion.span
          layoutId="bottomNavActive"
          className="absolute top-0 h-0.5 w-8 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.7)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      ) : null}
      <motion.div whileTap={{ scale: 0.85 }} className="flex flex-col items-center justify-center gap-0.5">
        <span className="relative">
          <Newspaper
            className={`h-5 w-5 transition-colors ${open ? "text-cyan-300" : "text-slate-400"}`}
            aria-hidden="true"
          />
          {unread ? (
            <span
              className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-cyan-300/90"
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span
          className={`text-[10px] font-medium tracking-wide transition-colors ${
            open ? "text-cyan-300" : "text-slate-400"
          }`}
        >
          Updates
        </span>
      </motion.div>
    </button>
  );
}

function UpdateEntry({ entry }: { entry: ProductUpdate }) {
  return (
    <article className="border-b border-white/10 pb-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <time dateTime={entry.date} className="text-xs text-slate-400">
          {formatUpdateDate(entry.date)}
        </time>
        <KindChip kind={entry.kind} />
      </div>
      <h3 className="selectable-text mt-1.5 text-sm font-medium text-slate-100">{entry.title}</h3>
      <p className="selectable-text mt-1 text-sm leading-relaxed text-slate-300">{entry.summary}</p>
    </article>
  );
}

function UpdatesDialog({
  onClose,
  returnFocusRef,
}: {
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const updates = publishedUpdates();

  useEffect(() => {
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const returnFocus = returnFocusRef.current;
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      focusUpdatesControl(returnFocus);
    };
  }, [onClose, returnFocusRef]);

  return (
    <motion.div
      className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="updates-title"
        aria-describedby="updates-intro"
        className="flex max-h-[min(40rem,calc(100dvh-var(--safe-top)-0.75rem))] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-900/95 p-5 pb-[calc(1.25rem+var(--safe-bottom))] shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-h-[min(40rem,80dvh)] sm:max-w-lg sm:rounded-2xl sm:p-6 sm:pb-6"
        initial={{ y: 24, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0.6 }}
        transition={springSoft}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="updates-title" className="text-lg font-medium tracking-wide text-slate-100">
              Updates
            </h2>
            <p id="updates-intro" className="mt-1 text-sm leading-relaxed text-slate-400">
              What changed, and what is still on the way.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close updates"
            className="tap-target -mr-1 -mt-1 flex shrink-0 items-center justify-center rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="app-scroll mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <section aria-labelledby="updates-whats-new">
            <h3
              id="updates-whats-new"
              className="text-base font-medium tracking-wide text-slate-100"
            >
              What&apos;s new
            </h3>
            <div className="mt-3 flex flex-col gap-4">
              {updates.length === 0 ? (
                <p className="text-sm text-slate-400">No updates yet.</p>
              ) : (
                updates.map((entry) => <UpdateEntry key={entry.id} entry={entry} />)
              )}
            </div>
          </section>

          <section className="mt-6" aria-labelledby="updates-coming-soon">
            <h3
              id="updates-coming-soon"
              className="text-base font-medium tracking-wide text-slate-100"
            >
              Coming soon
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">Prysmic is still growing.</p>
            <div className="mt-3 flex flex-col gap-4">
              {comingSoon.map((item) => (
                <article key={item.id} className="border-b border-white/10 pb-4 last:border-b-0">
                  <span className="inline-flex items-center rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">
                    Planned
                  </span>
                  <h4 className="selectable-text mt-1.5 text-sm font-medium text-slate-100">
                    {item.title}
                  </h4>
                  <p className="selectable-text mt-1 text-sm leading-relaxed text-slate-300">
                    {item.summary}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UpdatesSheet({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const isClient = useIsClient();
  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <UpdatesDialog key="updates" onClose={onClose} returnFocusRef={returnFocusRef} />
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export function UpdateHighlightCard({
  entry,
  onOpen,
  onDismiss,
}: {
  entry: ProductUpdate;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const isClient = useIsClient();

  // One showing per entry. Remember it when this page is left, so the next
  // visit stays quiet unless they have not left yet.
  useEffect(() => {
    const persist = () => dismissProductHighlight(entry.id);
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, [entry.id]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      <motion.aside
        key={entry.id}
        role="region"
        aria-label="What's new"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={springSoft}
        className="no-print glass-card fixed z-40 left-3 right-3 bottom-[calc(var(--bottomnav-h)+0.75rem)] rounded-xl p-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <KindChip kind={entry.kind} />
          <time dateTime={entry.date} className="text-xs text-slate-400">
            {formatUpdateDate(entry.date)}
          </time>
        </div>
        <h2 className="selectable-text mt-2 text-sm font-medium text-slate-100">{entry.title}</h2>
        <p className="selectable-text mt-1 text-sm leading-relaxed text-slate-300">{entry.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="tap-target rounded-md border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-400/20"
          >
            See updates
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="tap-target px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
          >
            Dismiss
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>,
    document.body
  );
}
