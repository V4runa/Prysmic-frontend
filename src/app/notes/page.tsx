"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import Spinner from "../components/Spinner";
import { apiFetch } from "../hooks/useApi";
import { getUserFromToken } from "../hooks/useAuth";
import {
  clearDraftIfOtherUser,
  draftVisibleToUser,
  noteDraftStorage,
  noteOwnerId,
  readDraft,
  recoveryHref,
} from "./noteDraft";
import { useTags } from "../hooks/useTags";
import { tactile } from "../lib/motion";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, Tag, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { noteHtmlToText } from "../lib/noteContent";
import { tagActiveClasses, tagColorClasses, tagColorKey } from "../lib/tagColors";
import { parseTagIds, tagFilterHref } from "../lib/tagQuery";
import TagChip from "../components/TagChip";
import NoteActionsMenu from "../components/NoteActionsMenu";
import { notesForList } from "./noteMenu";

interface Note {
  id: number;
  title: string;
  content: string;
  tags?: { id: number; name: string; color?: string }[];
  createdAt: string;
  attachmentCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
}

interface TagData {
  id: number;
  name: string;
  color?: string;
  count?: number;
}

export default function NotesOverviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const activeTagIds = useMemo(() => parseTagIds(search), [search]);
  const [unsavedHref, setUnsavedHref] = useState<string | null>(null);
  const [cardNotice, setCardNotice] = useState("");
  const routeNotice = searchParams.get("notice") === "archived" ? "Archived." : "";
  const notice = cardNotice || routeNotice;
  const [listMode, setListMode] = useState<"notes" | "archived">("notes");
  const archived = listMode === "archived";
  const activeTagKey = activeTagIds.join(",");
  const listKey = `${activeTagKey}:${listMode}`;
  const [pageState, setPageState] = useState({ key: listKey, page: 1 });
  if (pageState.key !== listKey) {
    setPageState({ key: listKey, page: 1 });
  }
  const currentPage = pageState.key === listKey ? pageState.page : 1;
  const setCurrentPage = (update: number | ((page: number) => number)) => {
    setPageState((prev) => {
      const page = prev.key === listKey ? prev.page : 1;
      const next = typeof update === "function" ? update(page) : update;
      return { key: listKey, page: next };
    });
  };
  const [notesPerPage] = useState(8);

  const user = typeof window !== "undefined" ? getUserFromToken() : null;
  const userId = user?.userId;

  const {
    data: notes = [],
    isLoading: notesLoading,
    isError: notesError,
  } = useQuery({
    queryKey: ["notes", userId, archived ? "archived" : "active"],
    queryFn: () =>
      apiFetch<Note[]>(
        `/notes/user/${userId}${archived ? "?archived=true" : ""}`
      ),
    enabled: !!userId,
  });

  const { data: tagList = [], isError: tagsError } = useTags(!!userId);

  const loading = !!userId && notesLoading;
  const error = !userId
    ? "Not authenticated"
    : notesError || tagsError
    ? "Could not load notes or tags."
    : "";

  const scopedNotes = useMemo(
    () => notesForList(notes, archived),
    [notes, archived]
  );

  const allTags = useMemo<TagData[]>(() => {
    const tagCountMap: Record<string, number> = {};
    scopedNotes.forEach((note) => {
      note.tags?.forEach((tag) => {
        tagCountMap[tag.name] = (tagCountMap[tag.name] || 0) + 1;
      });
    });
    return (tagList as TagData[])
      .map((tag) => ({ ...tag, count: tagCountMap[tag.name] || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedNotes, tagList]);

  useEffect(() => {
    const storage = noteDraftStorage();
    const owner = noteOwnerId(getUserFromToken()?.userId);
    if (storage && owner) clearDraftIfOtherUser(storage, owner);
    const draft = draftVisibleToUser(storage ? readDraft(storage) : null, owner);
    setUnsavedHref(draft ? recoveryHref(draft) : null);
  }, []);

  useEffect(() => {
    if (!cardNotice) return;
    const timeout = window.setTimeout(() => setCardNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [cardNotice]);

  useEffect(() => {
    if (searchParams.get("notice") !== "archived") return;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("notice");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [searchParams, pathname, router]);

  const setActiveTagIds = (ids: number[]) => {
    router.replace(tagFilterHref(pathname, search, ids), { scroll: false });
  };

  const toggleTag = (id: number) => {
    setActiveTagIds(
      activeTagIds.includes(id)
        ? activeTagIds.filter((tagId) => tagId !== id)
        : [...activeTagIds, id]
    );
  };

  const filteredNotes = useMemo(
    () =>
      activeTagIds.length
        ? scopedNotes.filter((note) =>
            note.tags?.some((tag) => activeTagIds.includes(tag.id))
          )
        : scopedNotes,
    [scopedNotes, activeTagIds]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotes.length / notesPerPage)
  );
  const indexOfLastNote = currentPage * notesPerPage;
  const indexOfFirstNote = indexOfLastNote - notesPerPage;
  const currentNotes = filteredNotes.slice(indexOfFirstNote, indexOfLastNote);

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04 },
    }),
  };

  return (
    <PageTransition>
    <div className="w-full app-page-h flex flex-col xl:flex-row px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
      {/* Sidebar (desktop only) */}
      {allTags.length > 0 && (
        <aside className="hidden xl:block w-[260px] shrink-0">
          <GlassPanel className="flex flex-col max-h-[calc(100vh-8rem)] overflow-y-auto p-4 gap-4 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-200 uppercase text-xs font-semibold tracking-widest">
              <Tag size={20} /> Tags
            </div>
            <div className="flex flex-col gap-3 mt-1">
              {allTags.map((tag, i) => {
                const isActive = activeTagIds.includes(tag.id);
                const color = tagColorKey(tag.color);
                const baseClasses = tagColorClasses[color];
                const activeClasses = tagActiveClasses[color];
                
                return (
                  <motion.div
                    key={tag.id}
                    role="button"
                    tabIndex={0}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 180, damping: 18 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleTag(tag.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleTag(tag.id);
                      }
                    }}
                    className={`interactive-chip card-lift px-4 py-2 flex items-center justify-between rounded-xl border backdrop-blur-lg relative ${
                      baseClasses
                    } ${
                      isActive
                        ? activeClasses
                        : "hover:bg-white/20"
                    }`}
                    style={{
                      background: isActive
                        ? `rgba(255, 255, 255, 0.10)`
                        : "rgba(255,255,255,0.025)",
                    }}
                  >
                    <span className={`text-sm font-medium truncate w-40 ${baseClasses.split(' ')[0]}`}>
                      {tag.name}
                    </span>
                    <div className={`text-xs font-semibold rounded bg-white/10 ${baseClasses.split(' ')[0]} border ${baseClasses.split(' ')[1]} px-2 py-1 min-w-[32px] text-center`}>
                      {tag.count}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {activeTagIds.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setActiveTagIds([])}
                  className="tap-target inline-flex items-center justify-center px-3 text-xs text-cyan-300 underline hover:text-cyan-200 transition"
                >
                  Clear all tags
                </button>
              </div>
            )}
            
            {/* Notes Counter */}
            <div className="flex justify-center pt-3 border-t border-white/10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 shadow-inner min-w-[60px]"
              >
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-200 leading-none">
                    {filteredNotes.length.toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">
                    {filteredNotes.length === 1 ? 'Note' : 'Notes'}
                  </div>
                </div>
              </motion.div>
            </div>
          </GlassPanel>
        </aside>
      )}

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center gap-4 sm:gap-6 min-h-0">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide">
              Your Notes
            </h2>
            <div className="flex items-center gap-2">
              <motion.div {...tactile} className="inline-flex">
                <Link
                  href="/tags"
                  className="tap-target flex items-center gap-1.5 px-3 py-2 text-slate-300 rounded-md border border-white/10 hover:bg-white/10 transition-colors text-sm"
                >
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage tags</span>
                </Link>
              </motion.div>
              <motion.div {...tactile} className="inline-flex">
                <Link
                  href="/notes/new"
                  className="tap-target inline-flex items-center justify-center px-5 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-300/20 hover:shadow-[0_0_18px_rgba(103,232,249,0.2)] transition-shadow text-sm"
                >
                  + New Note
                </Link>
              </motion.div>
            </div>
          </div>

          <div className="flex border-b border-white/10 text-sm" role="tablist" aria-label="Notes">
            {(["notes", "archived"] as const).map((mode) => {
              const selected = listMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setListMode(mode)}
                  className={`relative px-3 py-2 -mb-px font-medium ${
                    selected ? "text-cyan-300" : "text-white/40 hover:text-white"
                  }`}
                >
                  {mode === "notes" ? "Notes" : "Archived"}
                  {selected && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                      layoutId="notesListTab"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {notice && (
            <p role="status" className="text-sm text-slate-400">
              {notice}
            </p>
          )}

          {unsavedHref && (
            <p className="text-sm text-slate-400">
              Unsaved writing is still in this tab.{" "}
              <Link href={unsavedHref} className="text-cyan-300 hover:underline">
                Continue
              </Link>
            </p>
          )}

          {/* Mobile tag filter bar */}
          {allTags.length > 0 && (
            <div className="xl:hidden overflow-x-auto overscroll-x-contain scrollbar-hidden flex gap-2 py-3 px-1 -mx-1">
              {allTags.map((tag, i) => {
                const isActive = activeTagIds.includes(tag.id);
                const color = tagColorKey(tag.color);
                const baseClasses = tagColorClasses[color];
                
                return (
                  <motion.button
                    key={tag.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleTag(tag.id)}
                    className={`interactive-chip text-xs px-3 py-1 rounded-full border whitespace-nowrap transition-colors duration-200 ${
                      baseClasses
                    } ${isActive ? tagActiveClasses[color] : "hover:bg-white/10"}`}
                  >
                    {tag.name}
                  </motion.button>
                );
              })}
              {activeTagIds.length > 0 && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: allTags.length * 0.05 }}
                  onClick={() => setActiveTagIds([])}
                  className="interactive-chip text-xs text-cyan-300 underline ml-auto hover:text-cyan-200 transition-colors"
                >
                  Clear
                </motion.button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner label="Gathering your thoughts..." />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-red-400 text-center text-lg">{error}</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-400 text-center text-lg">
                {archived && activeTagIds.length === 0
                  ? "No archived notes."
                  : "No notes match your filter."}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto app-scroll p-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentPage}-${listKey}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 w-full"
                  >
                    {currentNotes.map((note, i) => (
                      <motion.div
                        key={note.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="glass-card card-lift relative rounded-2xl hover:bg-white/[0.06] p-4 sm:p-6 overflow-hidden flex flex-col justify-between h-full"
                      >
                        <div>
                          <h3 className="text-slate-100 text-lg sm:text-xl font-semibold mb-2 sm:mb-3 flex items-center gap-1.5 pr-8 min-w-0">
                            {note.isPinned && (
                              <span className="inline-flex shrink-0 text-slate-500" title="Pinned">
                                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">Pinned</span>
                              </span>
                            )}
                            <span className="truncate">{note.title}</span>
                          </h3>
                          <p className="text-slate-400 text-sm leading-relaxed mb-3 sm:mb-5 overflow-hidden line-clamp-4 sm:line-clamp-5">
                            {noteHtmlToText(note.content).slice(0, 200)}
                          </p>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {note.tags.map((tag) => (
                              <TagChip key={tag.id} tag={tag} />
                            ))}
                          </div>
                        )}
                        <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
                          <span
                            className="text-xs text-slate-400"
                            title={new Date(note.createdAt).toLocaleString()}
                          >
                            {formatDistanceToNow(new Date(note.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          {!!note.attachmentCount && note.attachmentCount > 0 && (
                            <span
                              className="flex items-center gap-1 text-xs text-slate-400 tabular-nums"
                              title={`${note.attachmentCount} attachment${
                                note.attachmentCount === 1 ? "" : "s"
                              }`}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {note.attachmentCount}
                            </span>
                          )}
                        </div>
                        <NoteActionsMenu
                          note={note}
                          variant="card"
                          onNotice={setCardNotice}
                        />
                        <Link
                          href={`/notes/${note.id}`}
                          className="absolute inset-0 z-10"
                          aria-label={note.title ? `Open ${note.title}` : "Open note"}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pagination - Always visible at bottom */}
              <div className="flex-shrink-0 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="tap-target inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-md border bg-white/10 text-white border-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      disabled={currentPage === i + 1}
                      className={`tap-target inline-flex items-center justify-center min-w-[2.25rem] px-3 py-1.5 text-xs rounded-md backdrop-blur-md border transition ${
                        currentPage === i + 1
                          ? "bg-white/20 text-cyan-300 border-cyan-300/30"
                          : "bg-white/10 text-white border-white/10 hover:bg-white/15"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="tap-target inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-md border bg-white/10 text-white border-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </GlassPanel>
      </main>
    </div>
    </PageTransition>
  );
}
