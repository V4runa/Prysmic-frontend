"use client";

import { useSyncExternalStore } from "react";
import { captureLinkToken, readAuthToken, takeBootstrappedToken, type AuthLinkPurpose } from "./authLink";

export type AuthLinkSnapshot = {
  purpose: AuthLinkPurpose;
  token: string | null;
  nextHref: string;
};

const SERVER_SNAPSHOT: AuthLinkSnapshot = {
  purpose: "verify",
  token: null,
  nextHref: "",
};

let snapshot: AuthLinkSnapshot | null = null;

/**
 * Read the one-time token on the client and drop it from the address bar.
 * The snapshot is cached so repeated reads (including Strict Mode) return the
 * same object and do not touch the URL again.
 */
export function captureLinkSnapshot(purpose: AuthLinkPurpose): AuthLinkSnapshot {
  if (typeof window === "undefined") return { ...SERVER_SNAPSHOT, purpose };
  const fromQuery = readAuthToken(window.location.href);
  if (
    snapshot?.purpose === purpose &&
    (fromQuery == null || fromQuery === snapshot.token)
  ) {
    return snapshot;
  }
  const preset = takeBootstrappedToken();
  const captured = captureLinkToken(purpose, window.location.href, preset);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== captured.nextHref) {
    window.history.replaceState(window.history.state, "", captured.nextHref);
  }
  const next: AuthLinkSnapshot = {
    purpose,
    token: captured.token,
    nextHref: captured.nextHref,
  };
  if (
    snapshot &&
    snapshot.purpose === next.purpose &&
    snapshot.token === next.token &&
    snapshot.nextHref === next.nextHref
  ) {
    return snapshot;
  }
  snapshot = next;
  return snapshot;
}

export function resetAuthLinkSnapshotForTests(): void {
  snapshot = null;
}

function subscribe(): () => void {
  return () => {};
}

export function useAuthLink(purpose: AuthLinkPurpose): AuthLinkSnapshot | null {
  return useSyncExternalStore(
    subscribe,
    () => captureLinkSnapshot(purpose),
    () => null
  );
}
