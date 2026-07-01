"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { fieldLabel, fieldHint, fieldError } from "./styles";

interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  /** Rendered to the right of the label (e.g. a counter). */
  labelAside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error wrapper for consistent field spacing. */
export default function Field({
  label,
  htmlFor,
  hint,
  error,
  labelAside,
  children,
  className,
}: FieldProps) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {(label || labelAside) && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <label htmlFor={htmlFor} className={fieldLabel}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {labelAside}
        </div>
      )}
      {children}
      {error ? (
        <span className={fieldError}>{error}</span>
      ) : hint ? (
        <span className={fieldHint}>{hint}</span>
      ) : null}
    </div>
  );
}
