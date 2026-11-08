"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetchDownload } from "../hooks/useApi";
import { getUserFromToken } from "../hooks/useAuth";
import {
  deliverExportFile,
  EXPORT_ABOUT,
  EXPORT_DOWNLOAD_MESSAGE,
  exportErrorMessage,
  runAccountExport,
  type ExportFailureKind,
} from "../lib/dataExport";
import { currentSessionEpoch } from "../lib/sessionBoundary";
import { noteOwnerId } from "../notes/noteDraft";

function currentExportSession() {
  return {
    epoch: currentSessionEpoch(),
    owner: noteOwnerId(getUserFromToken()?.userId),
  };
}

/**
 * Quiet account action. The file is the JSON snapshot from GET /export.
 * Attachment bytes are not in that file, and the app does not import it.
 */
export default function ExportDataButton() {
  const lock = useRef(false);
  const mounted = useRef(true);
  const [preparing, setPreparing] = useState(false);
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "started" }
    | { kind: "error"; failure: ExportFailureKind }
  >({ kind: "idle" });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onExport = async () => {
    if (lock.current) return;
    setPreparing(true);
    setResult({ kind: "idle" });
    const outcome = await runAccountExport({
      lock,
      started: currentExportSession(),
      readSession: currentExportSession,
      now: new Date(),
      fetchExport: () => apiFetchDownload("/export"),
      deliver: (file) => deliverExportFile(file.filename, file.blob),
    });
    if (!mounted.current) return;
    setPreparing(false);
    if (outcome.status === "downloaded") {
      setResult({ kind: "started" });
      return;
    }
    if (outcome.status === "error") {
      setResult({ kind: "error", failure: outcome.kind });
    }
  };

  const message =
    result.kind === "started"
      ? EXPORT_DOWNLOAD_MESSAGE
      : result.kind === "error"
        ? exportErrorMessage(result.failure)
        : "";
  const canRetry = result.kind === "error" && result.failure !== "unauthorized";

  return (
    <>
      <button
        type="button"
        onClick={onExport}
        disabled={preparing}
        aria-busy={preparing}
        aria-label="Export your data"
        title={EXPORT_ABOUT}
        aria-describedby={message ? "export-data-about export-data-status" : "export-data-about"}
        className="tap-target whitespace-nowrap px-1 text-xs text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-400 sm:text-sm"
      >
        {preparing ? "Preparing export…" : "Export your data"}
      </button>
      <span id="export-data-about" className="sr-only">
        {EXPORT_ABOUT}
      </span>
      {message && (
        <div
          id="export-data-status"
          role={result.kind === "error" ? "alert" : "status"}
          aria-live={result.kind === "error" ? "assertive" : "polite"}
          className="fixed inset-x-0 z-40 border-b border-white/10 bg-[#0b0c0f]/90 px-4 py-1.5 text-xs text-slate-400"
          style={{ top: "var(--header-h)" }}
        >
          <span>{message}</span>
          {canRetry && (
            <button
              type="button"
              onClick={onExport}
              className="tap-target ml-2 text-cyan-300 underline hover:text-cyan-200"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </>
  );
}
