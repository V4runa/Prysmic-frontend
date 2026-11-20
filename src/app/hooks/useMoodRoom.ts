"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./useApi";
import { useSessionIdentity } from "./useAuth";
import { usePreferences } from "./usePreferences";
import { logicalToday } from "../lib/date";
import {
  moodShellAccent,
  msUntilNextLogicalDay,
  todaysMoodColor,
  type MoodDayEntry,
  type MoodShellAccent,
} from "../lib/moodRoom";

const PREVIEW_EVENT = "prysmic-mood-preview";
let previewToken: string | null = null;

function emitPreview(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PREVIEW_EVENT));
}

/** Paint the room with a mood the moment it is chosen, before the save returns. */
export function setMoodRoomPreview(token: string | null): void {
  const next = token?.trim() ? token.trim() : null;
  if (next === previewToken) return;
  previewToken = next;
  emitPreview();
}

function subscribePreview(listener: () => void): () => void {
  window.addEventListener(PREVIEW_EVENT, listener);
  return () => window.removeEventListener(PREVIEW_EVENT, listener);
}

function readPreview(): string | null {
  return previewToken;
}

export type MoodRoom = {
  /** Set while today's logical day has a known mood color. */
  accent: MoodShellAccent | null;
  /** Last accent, kept so clearing today's mood fades the light out. */
  paint: MoodShellAccent | null;
  token: string | null;
};

/**
 * The signed-in shell's room light. Shares the moods query with the Moods
 * page, and follows the same logical day as habit and mood logging.
 */
export function useMoodRoom(): MoodRoom {
  const { userId } = useSessionIdentity();
  const { dayResetHour } = usePreferences();
  const [now, setNow] = useState(() => Date.now());
  const [paint, setPaint] = useState<MoodShellAccent | null>(null);

  useEffect(() => {
    let timer = 0;
    const arm = (from: number) => {
      const wait = msUntilNextLogicalDay(new Date(from), dayResetHour);
      timer = window.setTimeout(() => {
        const current = Date.now();
        setNow(current);
        arm(current);
      }, wait <= 0 ? 1000 : wait + 250);
    };
    arm(Date.now());
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      arm(current);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dayResetHour]);

  const day = logicalToday(new Date(now), dayResetHour);
  const { data } = useQuery({
    queryKey: ["moods"],
    queryFn: () => apiFetch<MoodDayEntry[]>("/moods"),
    enabled: userId != null,
  });

  const preview = useSyncExternalStore(subscribePreview, readPreview, () => null);
  const saved = todaysMoodColor(Array.isArray(data) ? data : [], day);
  const token = preview ?? saved;
  const accent = moodShellAccent(token);

  useEffect(() => {
    if (!preview || !saved) return;
    if (saved.toLowerCase() === preview.toLowerCase()) {
      setMoodRoomPreview(null);
      return;
    }
    const previewAccent = moodShellAccent(preview);
    const savedAccent = moodShellAccent(saved);
    if (previewAccent && savedAccent && previewAccent === savedAccent) setMoodRoomPreview(null);
  }, [preview, saved]);
  // Remember the last color during render so clearing today fades out
  // instead of waiting on an effect. Same token keeps the same object.
  if (accent && accent !== paint) setPaint(accent);

  return {
    accent,
    paint: accent ?? paint,
    token: accent ? token : null,
  };
}
