"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchBlob, apiUpload } from "./useApi";
import { compressImage } from "../lib/compressImage";

export interface NoteAttachment {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export const isImageMime = (mime: string) => mime.startsWith("image/");

// Mirrors the server guardrails (see note-attachments.constants.ts).
export const CLIENT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const CLIENT_MAX_ATTACHMENTS_PER_NOTE = 20;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
]);
const ALLOWED_EXT = /\.(png|jpe?g|webp|gif|pdf|txt|md|markdown)$/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

const isImageFile = (f: File) =>
  f.type.startsWith("image/") || IMAGE_EXT.test(f.name);

/**
 * Filter a dropped/picked batch to what we'll actually upload, with a friendly
 * reason when something is skipped. Images skip the size gate because they're
 * compressed client-side before upload; other files must be within the cap.
 */
export function acceptFiles(
  files: File[],
  currentCount: number
): { accepted: File[]; error: string | null } {
  const accepted: File[] = [];
  let error: string | null = null;

  for (const f of files) {
    const allowed = ALLOWED_MIME.has(f.type) || ALLOWED_EXT.test(f.name);
    if (!allowed) {
      error = "Some files were skipped — unsupported type.";
      continue;
    }
    if (!isImageFile(f) && f.size > CLIENT_MAX_ATTACHMENT_BYTES) {
      error = "Some files were skipped — over the 10 MB limit.";
      continue;
    }
    accepted.push(f);
  }

  const room = CLIENT_MAX_ATTACHMENTS_PER_NOTE - currentCount;
  if (accepted.length > room) {
    accepted.length = Math.max(0, room);
    error = `Only ${Math.max(0, room)} more attachment(s) allowed per note.`;
  }

  return { accepted, error };
}

export const attachmentsKey = (noteId: number | string) => [
  "note-attachments",
  String(noteId),
];

const rawPath = (noteId: number, id: number) =>
  `/notes/${noteId}/attachments/${id}/raw`;

export async function uploadAttachment(
  noteId: number,
  file: File
): Promise<NoteAttachment> {
  const prepared = await compressImage(file);
  const form = new FormData();
  form.append("file", prepared, prepared.name);
  return apiUpload<NoteAttachment>(`/notes/${noteId}/attachments`, form);
}

/** List + upload + delete for a saved note's attachments. */
export function useNoteAttachments(noteId?: number | null) {
  const queryClient = useQueryClient();
  const enabled = !!noteId;

  const query = useQuery({
    queryKey: attachmentsKey(noteId ?? "none"),
    queryFn: () => apiFetch<NoteAttachment[]>(`/notes/${noteId}/attachments`),
    enabled,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: attachmentsKey(noteId ?? "none") });

  const upload = useMutation({
    mutationFn: (file: File) => uploadAttachment(noteId as number, file),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/notes/${noteId}/attachments/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return {
    attachments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    upload,
    remove,
  };
}

// Object-URL cache so re-rendering (and the lightbox) doesn't refetch bytes.
// URLs live for the session; acceptable for the current low volume.
const blobUrlCache = new Map<string, string>();

/** Loads an attachment's bytes as an object URL for <img>/<a> use. */
export function useAttachmentUrl(
  noteId: number,
  id: number,
  enabled = true
): string | null {
  const key = `${noteId}/${id}`;
  const [url, setUrl] = useState<string | null>(() => blobUrlCache.get(key) ?? null);

  useEffect(() => {
    if (!enabled || blobUrlCache.has(key)) {
      if (blobUrlCache.has(key)) setUrl(blobUrlCache.get(key)!);
      return;
    }
    let active = true;
    apiFetchBlob(rawPath(noteId, id))
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        blobUrlCache.set(key, objectUrl);
        if (active) setUrl(objectUrl);
      })
      .catch(() => {
        /* leave url null; the UI shows a fallback */
      });
    return () => {
      active = false;
    };
  }, [key, noteId, id, enabled]);

  return url;
}

/** Trigger a browser download of an attachment (auth-safe via blob fetch). */
export async function downloadAttachment(
  noteId: number,
  id: number,
  filename: string
): Promise<void> {
  const blob = await apiFetchBlob(rawPath(noteId, id));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
