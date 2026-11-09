import type { Breadcrumb, ErrorEvent, TransactionEvent } from "@sentry/core";
import * as Sentry from "@sentry/nextjs";
import {
  readSentryDsn,
  readSentryEnvironment,
  scrubBreadcrumb,
  scrubSentryEvent,
  scrubSpan,
  SENTRY_TRACES_SAMPLE_RATE,
} from "../app/lib/sentryScrub";

/**
 * Starts Sentry only when NEXT_PUBLIC_SENTRY_DSN is set.
 * An empty or missing DSN leaves the SDK uninitialized, so nothing is sent.
 */
export function initSentry(): void {
  const dsn = readSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (!dsn) return;

  const options = {
    dsn,
    enabled: true,
    environment: readSentryEnvironment(process.env.VERCEL_ENV, process.env.NODE_ENV),
    // v11 collects data through dataCollection. The flag stays set so a build
    // that still reads it does not turn personal data back on.
    sendDefaultPii: false,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    profileSessionSampleRate: 0,
    traceLifecycle: "static" as const,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
    },
    beforeSend(event: ErrorEvent) {
      return scrubSentryEvent(event);
    },
    beforeSendTransaction(event: TransactionEvent) {
      return scrubSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb: Breadcrumb) {
      return scrubBreadcrumb(breadcrumb);
    },
    beforeSendSpan: Sentry.withStaticSpan((span) => {
      scrubSpan(span);
      return span;
    }),
    beforeSendLog() {
      return null;
    },
  };

  Sentry.init(options);
}
