"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  Paperclip,
  X,
  Download,
  FileText,
  File as FileIcon,
  Loader2,
  ImageOff,
} from "lucide-react";
import {
  useAttachmentUrl,
  isImageMime,
  downloadAttachment,
} from "../hooks/useNoteAttachments";
import { tactile, tactileSubtle } from "../lib/motion";

export interface AttachmentItemView {
  key: string;
  name: string;
  size: number;
  mimeType: string;
  /** Local object URL for a staged (not-yet-uploaded) file. */
  localUrl?: string;
  /** Reference to a persisted attachment, fetched as an authed blob. */
  remote?: { noteId: number; id: number };
  uploading?: boolean;
}

interface AttachmentZoneProps {
  items: AttachmentItemView[];
  editable?: boolean;
  onAddFiles?: (files: File[]) => void;
  onRemove?: (item: AttachmentItemView) => void;
  busy?: boolean;
  error?: string | null;
  max?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileGlyph({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) {
    return <FileText className="h-5 w-5 text-violet-300 shrink-0" />;
  }
  return <FileIcon className="h-5 w-5 text-slate-300 shrink-0" />;
}

// Resolves a persisted image to an object URL via the authed blob loader.
function RemoteImage({
  noteId,
  id,
  alt,
  className,
}: {
  noteId: number;
  id: number;
  alt: string;
  className?: string;
}) {
  const url = useAttachmentUrl(noteId, id);
  if (!url) {
    return (
      <div className={clsx("flex items-center justify-center bg-white/5", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}

function ThumbImage({ item, className }: { item: AttachmentItemView; className?: string }) {
  if (item.localUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.localUrl} alt={item.name} className={className} />;
  }
  if (item.remote) {
    return (
      <RemoteImage
        noteId={item.remote.noteId}
        id={item.remote.id}
        alt={item.name}
        className={className}
      />
    );
  }
  return (
    <div className={clsx("flex items-center justify-center bg-white/5", className)}>
      <ImageOff className="h-5 w-5 text-slate-500" />
    </div>
  );
}

export default function AttachmentZone({
  items,
  editable = false,
  onAddFiles,
  onRemove,
  busy = false,
  error = null,
  max,
}: AttachmentZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<AttachmentItemView | null>(null);

  const images = items.filter((i) => isImageMime(i.mimeType));
  const files = items.filter((i) => !isImageMime(i.mimeType));

  const emit = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || !onAddFiles) return;
      const arr = Array.from(list);
      if (arr.length) onAddFiles(arr);
    },
    [onAddFiles]
  );

  // Paste-to-attach (screenshots, copied images) while editing.
  useEffect(() => {
    if (!editable || !onAddFiles) return;
    const onPaste = (e: ClipboardEvent) => {
      const dtItems = e.clipboardData?.items;
      if (!dtItems) return;
      const files: File[] = [];
      for (const it of dtItems) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) emit(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [editable, onAddFiles, emit]);

  const hasItems = items.length > 0;
  if (!hasItems && !editable) return null;

  const atMax = max !== undefined && items.length >= max;

  return (
    <section
      onDragOver={(e) => {
        if (!editable) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!editable) return;
        e.preventDefault();
        setDragOver(false);
        emit(e.dataTransfer.files);
      }}
      className={clsx(
        "rounded-xl border transition-colors",
        dragOver
          ? "border-cyan-300/50 bg-cyan-400/5"
          : "border-white/10 bg-white/[0.02]",
        hasItems || editable ? "p-3" : "p-0"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments
          {hasItems && <span className="text-slate-600">· {items.length}</span>}
        </span>
        <div className="flex items-center gap-2">
          {busy && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </span>
          )}
          {editable && (
            <motion.button
              {...tactileSubtle}
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={atMax}
              className="tap-target flex items-center gap-1.5 rounded-md border border-cyan-300/20 px-2.5 py-1 text-xs text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-40"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Add
            </motion.button>
          )}
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
          {images.map((item) => (
            <div
              key={item.key}
              className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5"
            >
              <button
                type="button"
                onClick={() => setLightbox(item)}
                className="block h-full w-full"
                title={item.name}
              >
                <ThumbImage
                  item={item}
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
              </button>
              {item.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white/80" />
                </div>
              )}
              {editable && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${item.name}`}
                  className="absolute top-1 right-1 flex items-center justify-center h-6 w-6 rounded-full bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/80 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {files.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <FileGlyph mimeType={item.mimeType} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-200 truncate">{item.name}</span>
                <span className="block text-xs text-slate-500 tabular-nums">
                  {formatSize(item.size)}
                </span>
              </span>
              {item.uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : item.localUrl ? (
                <a
                  href={item.localUrl}
                  download={item.name}
                  className="tap-target flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/10"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              ) : item.remote ? (
                <button
                  type="button"
                  onClick={() =>
                    downloadAttachment(
                      item.remote!.noteId,
                      item.remote!.id,
                      item.name
                    )
                  }
                  className="tap-target flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/10"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              ) : null}
              {editable && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${item.name}`}
                  className="tap-target flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-rose-300 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={atMax}
          className={clsx(
            "w-full rounded-lg border border-dashed px-3 py-3 text-center text-xs transition-colors disabled:opacity-40",
            dragOver
              ? "border-cyan-300/50 text-cyan-200"
              : "border-white/15 text-slate-500 hover:border-white/25 hover:text-slate-300"
          )}
        >
          {atMax
            ? `Attachment limit reached${max ? ` (${max})` : ""}`
            : "Drop files or images here · paste · or click to browse"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,.md,.markdown,.txt"
        className="hidden"
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Lightbox */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {lightbox && (
              <motion.div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightbox(null)}
              >
                <div
                  className="absolute top-4 right-4 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lightbox.localUrl ? (
                    <motion.a
                      {...tactile}
                      href={lightbox.localUrl}
                      download={lightbox.name}
                      aria-label="Download"
                      className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                    >
                      <Download className="h-5 w-5" />
                    </motion.a>
                  ) : lightbox.remote ? (
                    <motion.button
                      {...tactile}
                      onClick={() =>
                        downloadAttachment(
                          lightbox.remote!.noteId,
                          lightbox.remote!.id,
                          lightbox.name
                        )
                      }
                      aria-label="Download"
                      className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                    >
                      <Download className="h-5 w-5" />
                    </motion.button>
                  ) : null}
                  <motion.button
                    {...tactile}
                    onClick={() => setLightbox(null)}
                    aria-label="Close"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
                <div
                  className="max-h-[85dvh] max-w-[92vw] flex flex-col items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isImageMime(lightbox.mimeType) ? (
                    <ThumbImage
                      item={lightbox}
                      className="max-h-[80dvh] max-w-full rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <FileGlyph mimeType={lightbox.mimeType} />
                      <span className="text-sm">{lightbox.name}</span>
                    </div>
                  )}
                  <span className="text-xs text-slate-400">{lightbox.name}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}
