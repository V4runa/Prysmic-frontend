import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";
export const ogAlt = "Prysmic. A calm place to keep your ideas and come back to them.";

/** Absolute path of the generated /opengraph-image route. */
export const ogImage = {
  url: "/opengraph-image",
  width: ogSize.width,
  height: ogSize.height,
  alt: ogAlt,
  type: ogContentType,
};

export function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#07080c",
          color: "#e7eef4",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
            <path d="M32 4 L56 18 V46 L32 60 L8 46 V18 Z" stroke="#a5f3fc" strokeWidth="2" />
            <path d="M8 18 L32 32 L56 18" stroke="#a5f3fc" strokeWidth="1.5" />
          </svg>
          <div style={{ fontSize: 28, letterSpacing: 1 }}>Prysmic</div>
        </div>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.15, maxWidth: 900 }}>
          A calm place to keep your ideas and come back to them.
        </div>
      </div>
    ),
    ogSize
  );
}
