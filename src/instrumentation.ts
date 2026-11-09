import * as Sentry from "@sentry/nextjs";
import { readSentryDsn } from "./app/lib/sentryScrub";

export async function register() {
  if (!readSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (error, request, context) => {
  if (!readSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)) return;
  Sentry.captureRequestError(error, request, context);
};
