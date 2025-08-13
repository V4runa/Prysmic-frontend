"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { apiFetch } from "../hooks/useApi";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Flame,
  Moon,
  Book,
  Star,
  Wand2,
  Palette,
  Feather,
  Bolt,
  TreePine,
  Circle,
  Bell,
  Cloud,
  Compass,
  Droplet,
  Eye,
  Heart,
  Key,
  Leaf,
  Lightbulb,
  Mountain,
  Sun,
  Target,
  Thermometer,
  Umbrella,
  BrainCircuit,
  Shield,
  Anchor,
  Infinity,
} from "lucide-react";

const iconMap = {
  flame: Flame,
  moon: Moon,
  book: Book,
  star: Star,
  wand2: Wand2,
  palette: Palette,
  feather: Feather,
  bolt: Bolt,
  treepine: TreePine,
  circle: Circle,
  bell: Bell,
  cloud: Cloud,
  compass: Compass,
  droplet: Droplet,
  eye: Eye,
  heart: Heart,
  key: Key,
  leaf: Leaf,
  lightbulb: Lightbulb,
  mountain: Mountain,
  sun: Sun,
  target: Target,
  thermometer: Thermometer,
  umbrella: Umbrella,
  braincircuit: BrainCircuit,
  shield: Shield,
  anchor: Anchor,
  infinity: Infinity,
} as const;

type IconKey = keyof typeof iconMap;

interface Habit {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: IconKey;
  checks?: { date: string }[];
  createdAt: string;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    apiFetch<Habit[]>("/habits")
      .then(setHabits)
      .catch(() => setError("Failed to load habits"));
  }, []);

  const isCheckedToday = (habit: Habit) => {
    const today = new Date().toISOString().split("T")[0];
    return habit.checks?.some((c) => c.date === today);
  };

  return (
    <PageTransition>
      <div className="w-full min-h-[calc(100vh-64px)] pt-[80px] px-[clamp(1rem,4vw,2rem)] pb-16 flex justify-center items-start">
        <GlassPanel className="w-full max-w-5xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl text-slate-100 font-bold tracking-wide">Your Contracts</h2>
              <p className="text-slate-400">Sacred commitments to self-discipline and growth.</p>
            </div>
            <button
              onClick={() => router.push("/habits/new")}
              className="px-4 py-2 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/10 rounded-md"
            >
              + New Contract
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {habits.map((habit) => {
              const iconKey: IconKey = habit.icon && iconMap[habit.icon] ? habit.icon : "star";
              const IconComponent = iconMap[iconKey];
              const isTodayChecked = isCheckedToday(habit);
              const color = habit.color || "cyan";
              return (
                <motion.div
                  key={habit.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => router.push(`/habits/${habit.id}`)}
                  className={`cursor-pointer relative flex flex-col gap-3 rounded-2xl p-5 border border-${color}-500/20 bg-${color}-400/5 backdrop-blur-md shadow-md transition ${
                    isTodayChecked ? `ring-2 ring-${color}-400/40` : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {IconComponent && <IconComponent className={`h-5 w-5 text-${color}-300`} />}
                    <h3 className="text-lg font-semibold text-slate-100 truncate">
                      {habit.name}
                    </h3>
                  </div>

                  {habit.description && (
                    <p className="text-slate-400 text-sm line-clamp-3">
                      {habit.description}
                    </p>
                  )}

                  <div className="absolute top-2 right-2">
                    {isTodayChecked && (
                      <CheckCircle2 className={`h-5 w-5 text-${color}-300`} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
