"use client";

import { useSyncExternalStore } from "react";
import FormButton from "./forms/FormButton";
import { useTour } from "../tour/TourProvider";
import {
  INSTALL_PROMPT_EVENT,
  currentInstallHintMode,
  dismissInstallHint,
  runInstallPrompt,
  subscribeInstallHint,
  type InstallHintMode,
} from "../lib/installPrompt";

const SERVER_MODE: InstallHintMode = "hidden";

function subscribe(listener: () => void): () => void {
  const remove = subscribeInstallHint(listener);
  window.addEventListener(INSTALL_PROMPT_EVENT, listener);
  const media = window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)");
  media.addEventListener("change", listener);
  return () => {
    remove();
    window.removeEventListener(INSTALL_PROMPT_EVENT, listener);
    media.removeEventListener("change", listener);
  };
}

/**
 * Quiet note on Settings. Android and desktop get an Install button when
 * the browser offers one. iPhone Safari gets the Share sheet line.
 * Already-installed windows and a dismissed note stay quiet.
 */
export default function InstallHint() {
  const mode = useSyncExternalStore(subscribe, currentInstallHintMode, () => SERVER_MODE);
  const tour = useTour();
  if (mode === "hidden" || tour.overlay) return null;

  const message =
    mode === "ios"
      ? "Tap Share, then Add to Home Screen."
      : "It opens full screen, like an app.";

  return (
    <section aria-labelledby="add-to-home-screen-title" className="glass-card rounded-xl p-4 sm:p-5">
      <h2 id="add-to-home-screen-title" className="text-base font-medium tracking-wide text-slate-100">
        Add Prysmic to your Home Screen
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {mode === "install" ? (
          <FormButton type="button" variant="primary" onClick={() => void runInstallPrompt()}>
            Install
          </FormButton>
        ) : null}
        <button
          type="button"
          onClick={dismissInstallHint}
          className="tap-target text-sm text-slate-400 hover:text-slate-200"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
