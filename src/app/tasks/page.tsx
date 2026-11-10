"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import TaskCard from "../components/TaskCard";
import QuickTaskInput from "../components/QuickTaskInput";
import Spinner from "../components/Spinner";
import TaskFilters, {
  DEFAULT_TASK_FILTERS,
  hasActiveFilters,
  type TaskFilterState,
} from "../components/TaskFilters";
import { useTasks, useInvalidateTasks } from "../hooks/useTasks";
import { useTags } from "../hooks/useTags";
import { parseTagIds, tagFilterHref, taskMatchesTag } from "../lib/tagQuery";
import { motion, AnimatePresence } from "framer-motion";

export default function TasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const tagId = parseTagIds(search)[0] ?? null;
  const allTasks = useTasks();
  const taggedTasks = useTasks(tagId);
  const taskSource = tagId == null ? allTasks : taggedTasks;
  const {
    active: tasks,
    completed: completedTasks,
    archived: archivedTasks,
    isLoading: loading,
  } = taskSource;
  const invalidateTasks = useInvalidateTasks();
  const fetchTasks = () => {
    invalidateTasks();
  };
  const [activeTab, setActiveTab] = useState<
    "active" | "completed" | "archived"
  >("active");
  const [draft, setDraft] = useState({
    search: DEFAULT_TASK_FILTERS.search,
    priority: DEFAULT_TASK_FILTERS.priority,
  });
  const filters = useMemo<TaskFilterState>(
    () => ({ ...draft, tagId }),
    [draft, tagId]
  );
  const { data: tags = [] } = useTags();

  const setFilters = (next: TaskFilterState) => {
    setDraft({ search: next.search, priority: next.priority });
    if (next.tagId !== tagId) {
      router.replace(
        tagFilterHref(pathname, search, next.tagId == null ? [] : [next.tagId]),
        { scroll: false }
      );
    }
  };

  const tabTasks =
    activeTab === "active"
      ? tasks // Only incomplete, non-archived tasks
      : activeTab === "completed"
      ? completedTasks // Only completed, non-archived tasks
      : archivedTasks; // Only archived tasks

  // Search (title + description) and priority narrow the current tab's list.
  const visibleTasks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tabTasks.filter((t) => {
      const matchesPriority =
        filters.priority === "all" || t.priority === filters.priority;
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false);
      return matchesPriority && matchesSearch && taskMatchesTag(t, filters.tagId);
    });
  }, [tabTasks, filters]);

  const filtering = hasActiveFilters(filters);


  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0 max-sm:overflow-y-auto max-sm:app-scroll">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide">
                Your Tasks
              </h1>
              {activeTab === "active" && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span>{allTasks.active.length} active</span>
                  {allTasks.completed.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-green-400">
                        {allTasks.completed.length} completed
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Traditional tab-style nav */}
          <div className="flex border-b border-white/10 text-white overflow-x-auto">
            {["active", "completed", "archived"].map((tab) => (
              <motion.button
                key={tab}
                onClick={() =>
                  setActiveTab(tab as "active" | "completed" | "archived")
                }
                className={`select-none px-3 sm:px-4 py-2 -mb-px font-medium whitespace-nowrap text-sm relative transition-colors ${
                  activeTab === tab
                    ? "text-cyan-300"
                    : "text-white/40 hover:text-white"
                }`}
                whileHover={{ scale: 1.08, y: -1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(103,232,249,0.7)]"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {activeTab === "active" && (
            <QuickTaskInput onTaskCreated={fetchTasks} />
          )}

          <TaskFilters filters={filters} tags={tags} onChange={setFilters} />
          {filtering && (
            <p className="-mt-2 text-xs text-white/40">
              {visibleTasks.length}{" "}
              {visibleTasks.length === 1 ? "match" : "matches"} in {activeTab}
            </p>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner label="Gathering your tasks..." />
            </div>
          ) : (
            <div className="flex flex-1 flex-col min-h-0 max-sm:flex-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-y-auto app-scroll p-1 max-sm:flex-none max-sm:overflow-visible"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleTasks.map((task, i) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.22 }}
                        className="h-full min-w-0"
                      >
                        <TaskCard task={task} onUpdate={fetchTasks} />
                      </motion.div>
                    ))}
                    {visibleTasks.length === 0 && (
                      <div className="col-span-full flex items-center justify-center py-8">
                        <p className="text-white/40 text-sm">
                          {filtering
                            ? "No tasks match your filters."
                            : activeTab === "active"
                            ? "No active tasks. Create one above!"
                            : activeTab === "completed"
                            ? "No completed tasks yet."
                            : "No archived tasks."}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
