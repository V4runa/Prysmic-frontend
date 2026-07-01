"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";
import { BUTTON_VARIANT, type ButtonVariant } from "./styles";
import { tactile } from "../../lib/motion";

interface FormButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
}

/** Primary/secondary/danger action button with the shared tactile press feel. */
const FormButton = forwardRef<HTMLButtonElement, FormButtonProps>(function FormButton(
  { variant = "primary", className, type = "button", ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      {...tactile}
      className={clsx(BUTTON_VARIANT[variant], className)}
      {...rest}
    />
  );
});

export default FormButton;
