"use client";

import { forwardRef } from "react";
import clsx from "clsx";
import { fieldInput } from "./styles";

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Styled native select (dark option list via color-scheme). */
const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { className, children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={clsx(fieldInput, "[color-scheme:dark]", className)} {...rest}>
      {children}
    </select>
  );
});

export default SelectField;
