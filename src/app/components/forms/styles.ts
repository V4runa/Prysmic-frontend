// Single source of truth for the app's form visual language.
//
// Every control shares one surface (bg-white/10 + border-white/10), one focus
// treatment (.focus-band, defined in globals.css), and one text scale (text-sm;
// globals.css floors inputs to 16px on phones to stop iOS zoom). Classes are
// spelled out in full so Tailwind v4 can statically emit them.

export const fieldInput =
  "w-full rounded-md px-3.5 py-2.5 bg-gradient-to-b from-white/[0.12] to-white/[0.05] backdrop-blur-sm text-slate-100 placeholder-white/40 border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] focus-band transition text-sm disabled:opacity-50";

export const fieldLabel = "block text-sm font-medium text-slate-300";
export const fieldHint = "text-xs text-slate-500";
export const fieldError = "text-xs text-rose-400";

// Buttons — one geometry, three intents. `tap-target` guarantees a 44px hit
// area on touch devices (globals.css).
const btnBase =
  "tap-target inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition backdrop-blur-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] disabled:opacity-40 disabled:pointer-events-none";

export const btnPrimary = `${btnBase} bg-gradient-to-b from-cyan-300/25 to-cyan-400/10 hover:from-cyan-300/35 hover:to-cyan-400/20 border border-cyan-300/30 text-cyan-100`;
export const btnSecondary = `${btnBase} bg-gradient-to-b from-white/[0.1] to-white/[0.03] border border-white/10 text-slate-200 hover:from-white/15 hover:to-white/[0.06]`;
export const btnDanger = `${btnBase} bg-gradient-to-b from-red-400/15 to-red-500/5 border border-red-300/20 text-red-200 hover:from-red-400/25 hover:to-red-500/10`;

export const BUTTON_VARIANT = {
  primary: btnPrimary,
  secondary: btnSecondary,
  danger: btnDanger,
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT;
