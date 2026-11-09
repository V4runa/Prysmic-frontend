import Image from "next/image";

export function Shot({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
  fill = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Cover a positioned parent instead of sizing from an aspect ratio. */
  fill?: boolean;
}) {
  return (
    <div
      className={`${fill ? "absolute inset-0" : "relative"} overflow-hidden bg-[#0c0e12] ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover object-top"
      />
    </div>
  );
}
