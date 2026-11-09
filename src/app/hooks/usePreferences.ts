"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_PREFERENCES,
  readPreferences,
  subscribePreferences,
  type Preferences,
} from "../lib/preferences";
import { logicalToday } from "../lib/date";

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribePreferences, readPreferences, () => DEFAULT_PREFERENCES);
}

/** Logical habit/mood day. Subscribes so a saved rollover hour updates open screens. */
export function useLogicalToday(): string {
  const { dayResetHour } = usePreferences();
  return logicalToday(new Date(), dayResetHour);
}
