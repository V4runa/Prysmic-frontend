import {
  Cloud,
  Compass,
  Feather,
  Gem,
  Hexagon,
  Leaf,
  Moon,
  Mountain,
  Sparkles,
  Star,
  Sun,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { avatarColor, monogramInitial, type AvatarGlyphId, type AvatarPreference } from "../lib/preferences";

const GLYPHS: Record<AvatarGlyphId, LucideIcon> = {
  spark: Sparkles,
  moon: Moon,
  sun: Sun,
  feather: Feather,
  leaf: Leaf,
  peak: Mountain,
  compass: Compass,
  tide: Waves,
  gem: Gem,
  star: Star,
  cloud: Cloud,
  hex: Hexagon,
};

export function AvatarGlyph({ id, className }: { id: AvatarGlyphId; className?: string }) {
  const Glyph = GLYPHS[id];
  return <Glyph className={className} aria-hidden strokeWidth={1.75} />;
}

/** Decorative mark. The control that contains it carries the accessible name. */
export default function UserAvatar({
  username,
  avatar,
  size = "sm",
}: {
  username?: string | null;
  avatar: AvatarPreference;
  size?: "sm" | "md";
}) {
  const color = avatarColor(avatar.color);
  const box = size === "md" ? "h-12 w-12 text-lg" : "h-6 w-6 text-[11px]";
  const iconClass = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  const Glyph = avatar.style === "glyph" ? GLYPHS[avatar.glyph] : null;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-medium leading-none ${box} ${color.face}`}
    >
      {Glyph ? <Glyph className={iconClass} strokeWidth={1.75} /> : monogramInitial(username)}
    </span>
  );
}
