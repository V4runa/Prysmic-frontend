"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function SessionExpiredToast() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => (prev > 1 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{
        scale: [1, 1.02, 1], // Smooth pulse
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                 z-50 px-8 py-6 rounded-2xl shadow-2xl border
                 backdrop-blur-2xl bg-black/60 border-red-400/30
                 ring-2 ring-red-400/40 animate-pulse-soft
                 max-w-md w-full text-center"
    >
      <AlertTriangle className="mx-auto mb-3 text-red-300 h-6 w-6 drop-shadow" />

      <p className="text-lg font-semibold leading-snug tracking-wide text-red-200 drop-shadow-md">
        Your session has expired.
        <br />
        Redirecting to login...
      </p>

      <p className="mt-2 text-sm text-red-300 font-mono drop-shadow-sm">
        Redirecting in {count}...
      </p>
    </motion.div>
  );
}
