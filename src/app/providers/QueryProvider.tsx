"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cached data stays fresh for 5 minutes so revisiting a page (or
            // bouncing between notes/tasks/calendar) serves instantly from
            // cache instead of refetching on every mount. Personal data rarely
            // changes from another device, and mutations invalidate explicitly.
            staleTime: 5 * 60_000,
            // Keep unused data around for 30 minutes before garbage collection
            // so returning to a page later still hydrates from cache.
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            // Don't auto-retry: a failed/slow request would otherwise fire a
            // second time, doubling the wait on an already-slow response.
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
