interface GlassPanelProps {
  className?: string;
  children: React.ReactNode;
}

export default function GlassPanel({
  className = "",
  children,
}: GlassPanelProps) {
  return (
    <div
      className={`rounded-xl backdrop-blur-md bg-white/5 border border-white/5 p-8 shadow-2xl shadow-black/30 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
