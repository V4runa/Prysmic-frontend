import type { MetadataRoute } from "next";

/**
 * Installed-app manifest. Signed-in people already leave `/` for their
 * saved home page, so that is the start URL. Colors match the dark chrome
 * already declared as the viewport theme color.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Prysmic",
    short_name: "Prysmic",
    description: "A private notebook for notes, habits, and moods.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0c0f",
    theme_color: "#0b0c0f",
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
