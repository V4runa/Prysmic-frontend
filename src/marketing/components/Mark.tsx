export function Mark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M32 4 L56 18 V46 L32 60 L8 46 V18 Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 18 L32 32 L56 18"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.7"
      />
      <path
        d="M32 32 V60"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.45"
      />
    </svg>
  );
}
