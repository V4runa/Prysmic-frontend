"use client";

import GlassPanel from "./GlassPanel";
import PageTransition from "./PageTransition";

export default function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-y-auto app-scroll bg-transparent">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <PageTransition>
          <GlassPanel className="w-full max-w-sm">{children}</GlassPanel>
        </PageTransition>
      </div>
    </div>
  );
}
