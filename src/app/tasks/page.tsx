"use client";

import { useState } from "react";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import TaskCard from "../components/TaskCard";
import QuickTaskInput from "../components/QuickTaskInput";
import Spinner from "../components/Spinner";
import { useTasks, useInvalidateTasks } from "../hooks/useTasks";
import { motion, AnimatePresence } from "framer-motion";

export default function TasksPage() {
  const {
    active: tasks,
    completed: completedTasks,
    archived: archivedTasks,
    isLoading: loading,
  } = useTasks();
  const invalidateTasks = useInvalidateTasks();
  const fetchTasks = () => {
    invalidateTasks();
  };
  const [activeTab, setActiveTab] = useState<
    "active" | "completed" | "archived"
  >("active");

  const visibleTasks =
    activeTab === "active"
      ? tasks // Only incomplete, non-archived tasks
      : activeTab === "completed"
      ? completedTasks // Only completed, non-archived tasks
      : archivedTasks; // Only archived tasks


  return (
    <PageTransition>
      <div className="w-full h-[calc(100vh-3rem)] flex flex-col items-center px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-4 pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide">
                Your Tasks
              </h1>
              {activeTab === "active" && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span>{tasks.length} active</span>
                  {completedTasks.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-green-400">
                        {completedTasks.length} completed
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
                className={`px-3 sm:px-4 py-2 -mb-px font-medium whitespace-nowrap text-sm relative transition-colors ${
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

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner label="Gathering your tasks..." />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-y-auto p-1"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleTasks.map((task, i) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.22 }}
                        className="h-full"
                      >
                        <TaskCard task={task} onUpdate={fetchTasks} />
                      </motion.div>
                    ))}
                    {visibleTasks.length === 0 && (
                      <div className="col-span-full flex items-center justify-center py-8">
                        <p className="text-white/40 text-sm">
                          {activeTab === "active" &&
                            "No active tasks. Create one above!"}
                          {activeTab === "completed" && "No completed tasks yet."}
                          {activeTab === "archived" && "No archived tasks."}
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
