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
      className={`glass-card rounded-xl p-4 sm:p-6 md:p-8 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
