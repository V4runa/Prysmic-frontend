import * as Sentry from "@sentry/nextjs";
import { initSentry } from "./sentry/init";

initSentry();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
