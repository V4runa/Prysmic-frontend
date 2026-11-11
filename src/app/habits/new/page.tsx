"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import { apiFetch } from "../../hooks/useApi";
import { contractDescriptionFromNote } from "../../lib/noteMarkdown";
import {
  apiErrorMentionsField,
  isNoteNotFound,
  parseOriginNoteId,
} from "../../notes/noteMenu";
import { HabitFrequency } from "../../enums/habit-frequency.enum";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Field, TextField, TextArea, SelectField, FormButton } from "../../components/forms";
import HabitColorPicker from "../../components/HabitColorPicker";
import HabitIconPicker from "../../components/HabitIconPicker";

export default function NewHabitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [originNoteId, setOriginNoteId] = useState<number | null>(() =>
    parseOriginNoteId(searchParams.get("originNoteId"))
  );
  const [originTitle, setOriginTitle] = useState("");
  const appliedOrigin = useRef(false);

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

  useEffect(() => {
    if (originNoteId == null || appliedOrigin.current) return;
    let cancelled = false;
    apiFetch<{ title?: string; content?: string | null }>(`/notes/${originNoteId}`)
      .then((note) => {
        if (cancelled) return;
        appliedOrigin.current = true;
        const title = (note.title ?? "").trim();
        setOriginTitle(title);
        setForm((prev) => ({
          ...prev,
          name: prev.name.trim() ? prev.name : title,
          description: prev.description.trim()
            ? prev.description
            : contractDescriptionFromNote(note.content),
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        appliedOrigin.current = true;
        if (isNoteNotFound(err)) setOriginNoteId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [originNoteId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const finishCreate = async (payload: Record<string, unknown>) => {
    await apiFetch("/habits", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    if (originNoteId != null) {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", String(originNoteId)] });
    }
    router.push("/habits");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Name is required");
    const payload: Record<string, unknown> = { ...form };
    if (originNoteId != null) payload.originNoteId = originNoteId;
    try {
      await finishCreate(payload);
    } catch (err) {
      if (originNoteId != null && apiErrorMentionsField(err, "originNoteId")) {
        try {
          await finishCreate({ ...form });
          return;
        } catch {
          setError("Something went wrong while forging your contract.");
          return;
        }
      }
      if (isNoteNotFound(err)) {
        setOriginNoteId(null);
        setError("Note not found.");
        return;
      }
      setError("Something went wrong while forging your contract.");
    }
  };

  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide">Forge a New Contract</h2>
            <p className="text-slate-400 text-sm sm:text-base">Name the habit and why you want to keep it.</p>
          </div>
          {originTitle && originNoteId != null && (
            <p className="text-sm text-slate-400">
              From note:{" "}
              <Link href={`/notes/${originNoteId}`} className="text-cyan-300 hover:underline">
                {originTitle}
              </Link>
            </p>
          )}

          <div className="flex-1 overflow-y-auto app-scroll min-h-0 -mr-1 pr-1">
            <div className="flex flex-col lg:flex-row gap-6 pb-2">
            {/* Color and Icon selectors */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="order-2 lg:order-1 flex flex-col gap-4 sm:gap-6 lg:w-1/3"
            >
              <Field label="Colour">
                <HabitColorPicker
                  value={form.color}
                  onChange={(color) => handleChange("color", color)}
                />
              </Field>

              <Field label="Icon">
                <HabitIconPicker
                  value={form.icon}
                  onChange={(icon) => handleChange("icon", icon)}
                />
              </Field>
            </motion.div>

            {/* Form fields */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="order-1 lg:order-2 flex flex-col gap-4 sm:gap-5 lg:w-2/3"
            >
              <Field label="Name" htmlFor="new-habit-name">
                <TextField
                  id="new-habit-name"
                  placeholder="Name your contract"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </Field>

              <Field label="Description" htmlFor="new-habit-description">
                <TextArea
                  id="new-habit-description"
                  rows={2}
                  placeholder="What does this habit involve? (optional)"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </Field>

              <Field label="Intent" htmlFor="new-habit-intent">
                <TextArea
                  id="new-habit-intent"
                  rows={3}
                  placeholder="Why does this matter to you?"
                  value={form.intent}
                  onChange={(e) => handleChange("intent", e.target.value)}
                />
              </Field>

              <Field label="Affirmation" htmlFor="new-habit-affirmation">
                <TextArea
                  id="new-habit-affirmation"
                  rows={3}
                  placeholder="A short line you want to remember"
                  value={form.affirmation}
                  onChange={(e) => handleChange("affirmation", e.target.value)}
                />
              </Field>

              <Field label="Frequency" htmlFor="new-habit-frequency">
                <SelectField
                  id="new-habit-frequency"
                  value={form.frequency}
                  onChange={(e) => handleChange("frequency", e.target.value)}
                >
                  {(Object.values(HabitFrequency) as string[]).map((freq) => (
                    <option key={freq} value={freq}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </option>
                  ))}
                </SelectField>
              </Field>

            </motion.div>
            </div>
          </div>

          {/* Action footer — pinned below the scroll area so it's always reachable */}
          <div className="flex flex-col gap-3 pt-1">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm"
              >
                {error}
              </motion.p>
            )}
            <div className="flex gap-3">
              <FormButton
                variant="secondary"
                onClick={() => router.push("/habits")}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </FormButton>
              <FormButton
                variant="primary"
                onClick={handleSubmit}
                className="flex-1 sm:flex-none"
              >
                <Check className="w-4 h-4" />
                Forge Contract
              </FormButton>
            </div>
          </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
