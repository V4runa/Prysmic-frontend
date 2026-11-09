import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";
export const ogAlt = "Prysmic — between the mind and the world";

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
          <div style={{ fontSize: 22, letterSpacing: 8, textTransform: "uppercase" }}>
            Prysmic
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 0.95 }}>
          <div>Between the mind</div>
          <div style={{ color: "#a5f3fc" }}>and the world.</div>
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8" }}>
          An interface for your cognition
        </div>
      </div>
    ),
    ogSize
  );
}
