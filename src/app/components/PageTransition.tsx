"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useTour } from "../tour/TourProvider";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tour = useTour();
  const steady = tour.overlay;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={steady ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={steady ? { opacity: 1, transition: { duration: 0 } } : { opacity: 0 }}
        transition={steady ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
