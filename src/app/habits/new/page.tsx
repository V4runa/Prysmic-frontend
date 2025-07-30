"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import { apiFetch } from "../../hooks/useApi";
import { HabitFrequency } from "../../enums/habit-frequency.enum";
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
      <div className="min-h-screen w-full flex flex-col items-center justify-start py-12 px-6">
        <GlassPanel className="w-full max-w-3xl flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-slate-100">Forge a New Contract</h2>
          <p className="text-slate-400">Define your intent. This is a sacred act.</p>

          <input
            type="text"
            placeholder="Habit Name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/10 text-slate-200 rounded-md"
          />

          <textarea
            rows={2}
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/10 text-slate-300 rounded-md"
          />

          <textarea
            rows={3}
            placeholder="Intent — Why does this matter to you?"
            value={form.intent}
            onChange={(e) => handleChange("intent", e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/10 text-indigo-200 rounded-md"
          />

          <textarea
            rows={3}
            placeholder="Affirmation — What truth shall you repeat?"
            value={form.affirmation}
            onChange={(e) => handleChange("affirmation", e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/10 text-emerald-200 rounded-md"
          />

          <div className="flex flex-col gap-2">
            <label className="text-slate-300 text-sm">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => handleChange("frequency", e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/10 text-slate-200 rounded-md"
            >
              {(Object.values(HabitFrequency) as string[]).map((freq) => (
                <option key={freq} value={freq}>
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-slate-300 text-sm">Color</label>
            <div className="flex gap-3 flex-wrap">
              {colorChoices.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChange("color", c)}
                  className={clsx(
                    "w-8 h-8 rounded-full",
                    form.color === c
                      ? `ring-2 ${colorClassMap[c]}`
                      : "border border-white/10 bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-slate-300 text-sm">Icon</label>
            <div className="flex flex-wrap gap-3">
              {iconChoices.map((icon) => {
                const IconComponent = iconMap[icon];
                if (!IconComponent) return null;
                return (
                  <button
                    key={icon}
                    onClick={() => handleChange("icon", icon)}
                    className={`p-2 rounded-md border ${
                      form.icon === icon
                        ? "bg-white/10 border-cyan-400"
                        : "border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <IconComponent className="h-5 w-5 text-slate-100" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => router.push("/habits")}
              className="px-5 py-3 border border-white/10 text-slate-300 rounded-md hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-3 bg-cyan-400/10 border border-cyan-300 text-cyan-300 rounded-md hover:bg-cyan-400/20 transition"
            >
              <Check className="inline mr-2 w-4 h-4" />
              Forge Contract
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
