"use client";

import { useEffect, useState, useCallback } from "react";
import { Task } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import TaskCard from "../components/TaskCard";
import QuickTaskInput from "../components/QuickTaskInput";
import { motion, AnimatePresence } from "framer-motion";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<
    "active" | "completed" | "archived"
  >("active");
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [active, completed, archived] = await Promise.all([
        apiFetch<Task[]>("/tasks?complete=false&archived=false"),
        apiFetch<Task[]>("/tasks?complete=true&archived=false"),
        apiFetch<Task[]>("/tasks?archived=true"),
      ]);
      setTasks(active.sort((a, b) => a.priority - b.priority));
      setCompletedTasks(completed);
      setArchivedTasks(archived);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const visibleTasks =
    activeTab === "active"
      ? tasks // Only incomplete, non-archived tasks
      : activeTab === "completed"
      ? completedTasks // Only completed, non-archived tasks
      : archivedTasks; // Only archived tasks

  const cardVariants = {
    hidden: { opacity: 0, y: 5, scale: 0.99 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.01,
        duration: 0.6,
        ease: "easeOut",
        type: "spring",
        stiffness: 100,
        damping: 20,
      },
    }),
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: 0.5,
        ease: "easeIn",
        type: "spring",
        stiffness: 120,
        damping: 25,
      },
    },
  };

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
                className={`px-3 sm:px-4 py-2 -mb-px font-medium whitespace-nowrap text-sm relative ${
                  activeTab === tab
                    ? "text-cyan-300"
                    : "text-white/40 hover:text-white"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
              <p className="text-white/60 text-sm">Loading tasks...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                  }}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  <AnimatePresence mode="popLayout">
                    {visibleTasks.map((task, i) => (
                      <motion.div
                        key={task.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        transition={{
                          layout: {
                            duration: 1.0,
                            ease: "easeInOut",
                            type: "spring",
                            stiffness: 60,
                            damping: 30,
                          },
                          ...cardVariants.visible(i).transition,
                        }}
                      >
                        <TaskCard task={task} onUpdate={fetchTasks} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {visibleTasks.length === 0 && (
                    <motion.div
                      className="col-span-full flex items-center justify-center py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-white/40 text-sm">
                        {activeTab === "active" &&
                          "No active tasks. Create one above!"}
                        {activeTab === "completed" && "No completed tasks yet."}
                        {activeTab === "archived" && "No archived tasks."}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
