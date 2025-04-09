"use client";

import { motion } from "framer-motion";

export default function MotionDiv({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof motion.div>) {
  return <motion.div {...props}>{children}</motion.div>;
}
