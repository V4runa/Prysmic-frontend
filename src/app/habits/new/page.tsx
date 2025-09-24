"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import { apiFetch } from "../../hooks/useApi";
import { HabitFrequency } from "../../enums/habit-frequency.enum";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  Check,
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

const iconChoices = [
  "flame", "moon", "book", "star", "wand2", "palette", "feather",
  "bolt", "treepine", "circle", "bell", "cloud", "compass", "droplet",
  "eye", "heart", "key", "leaf", "lightbulb", "mountain", "sun", "target",
  "thermometer", "umbrella", "braincircuit", "shield", "anchor", "infinity",
];

const colorChoices = ["cyan", "violet", "rose", "amber", "emerald", "blue"];

const iconMap: Record<string, React.ElementType> = {
  flame: Flame, moon: Moon, book: Book, star: Star, wand2: Wand2,
  palette: Palette, feather: Feather, bolt: Bolt, treepine: TreePine,
  circle: Circle, bell: Bell, cloud: Cloud, compass: Compass, droplet: Droplet,
  eye: Eye, heart: Heart, key: Key, leaf: Leaf, lightbulb: Lightbulb,
  mountain: Mountain, sun: Sun, target: Target, thermometer: Thermometer,
  umbrella: Umbrella, braincircuit: BrainCircuit, shield: Shield,
  anchor: Anchor, infinity: Infinity,
};

const colorClassMap: Record<string, string> = {
  cyan: "bg-cyan-400/50 border-cyan-300 ring-cyan-500",
  violet: "bg-violet-400/50 border-violet-300 ring-violet-500",
  rose: "bg-rose-400/50 border-rose-300 ring-rose-500",
  amber: "bg-amber-400/50 border-amber-300 ring-amber-500",
  emerald: "bg-emerald-400/50 border-emerald-300 ring-emerald-500",
  blue: "bg-blue-400/50 border-blue-300 ring-blue-500",
};

export default function NewHabitPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    intent: "",
    affirmation: "",
    color: "cyan",
    icon: "flame",
    frequency: HabitFrequency.DAILY,
  });

  const [error, setError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Name is required");
    try {
      await apiFetch("/habits", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/habits");
    } catch {
      setError("Something went wrong while forging your contract.");
    }
  };

  return (
    <PageTransition>
      <div className="w-full h-[calc(100vh-3rem)] flex flex-col items-center px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-4 pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
          <div className="flex justify-between items-center">
            <h2 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide">Forge a New Contract</h2>
            <p className="text-slate-400 text-sm sm:text-base">Define your intent. This is a sacred act.</p>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            {/* Color and Icon selectors */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-4 sm:gap-6 lg:w-1/3"
            >
              <div className="flex flex-col gap-2">
                <label className="text-slate-300 text-sm">Color</label>
                <div className="flex gap-3 flex-wrap">
                  {colorChoices.map((c, i) => (
                    <motion.button
                      key={c}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleChange("color", c)}
                      className={clsx(
                        "w-8 h-8 rounded-full transition",
                        form.color === c
                          ? `ring-2 ${colorClassMap[c]}`
                          : "border border-white/10 bg-white/10 hover:bg-white/20"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-slate-300 text-sm">Icon</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {iconChoices.map((icon, i) => {
                    const IconComponent = iconMap[icon];
                    return (
                      <motion.button
                        key={icon}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => handleChange("icon", icon)}
                        className={`p-2 rounded-md border transition ${
                          form.icon === icon
                            ? "bg-white/10 border-cyan-400"
                            : "border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-slate-100" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Form fields */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-4 sm:gap-6 lg:w-2/3"
            >
              <input
                type="text"
                placeholder="Habit Name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 text-slate-200 rounded-md text-lg sm:text-xl"
              />

              <textarea
                rows={2}
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 text-slate-300 rounded-md text-sm sm:text-base"
              />

              <textarea
                rows={3}
                placeholder="Intent — Why does this matter to you?"
                value={form.intent}
                onChange={(e) => handleChange("intent", e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 text-indigo-200 rounded-md text-sm sm:text-base"
              />

              <textarea
                rows={3}
                placeholder="Affirmation — What truth shall you repeat?"
                value={form.affirmation}
                onChange={(e) => handleChange("affirmation", e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 text-emerald-200 rounded-md text-sm sm:text-base"
              />

              <div className="flex flex-col gap-2">
                <label className="text-slate-300 text-sm">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => handleChange("frequency", e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 text-slate-200 rounded-md text-sm sm:text-base"
                >
                  {(Object.values(HabitFrequency) as string[]).map((freq) => (
                    <option key={freq} value={freq}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => router.push("/habits")}
                  className="px-4 sm:px-5 py-2 sm:py-3 border border-white/10 text-slate-300 rounded-md hover:bg-white/10 transition text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 sm:px-5 py-2 sm:py-3 bg-cyan-400/10 border border-cyan-300 text-cyan-300 rounded-md hover:bg-cyan-400/20 transition text-sm sm:text-base"
                >
                  <Check className="inline mr-2 w-4 h-4" />
                  Forge Contract
                </button>
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
