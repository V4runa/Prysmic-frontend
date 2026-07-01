"use client";

import { forwardRef } from "react";
import clsx from "clsx";
import { fieldInput } from "./styles";

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Styled single-line input. Date/time get a dark color-scheme automatically. */
const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { className, type = "text", ...rest },
  ref
) {
  const needsDarkScheme = type === "date" || type === "time" || type === "datetime-local";
  return (
    <input
      ref={ref}
      type={type}
      className={clsx(fieldInput, needsDarkScheme && "[color-scheme:dark]", className)}
      {...rest}
    />
  );
});

export default TextField;
