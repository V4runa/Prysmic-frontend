/**
 * Shared prism atmosphere for the public (pre-auth) routes: landing, login,
 * signup. Renders the prism art as a fixed full-bleed layer with a dark
 * radial scrim so the glass cards on top stay legible. Sits behind page
 * content via a negative z-index.
 */
export default function PrismBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0b0c0f]"
    >
      {/* Prism art */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: "url('/prism-hero.png')" }}
      />
      {/* Dark scrim + vignette for card legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(11,12,15,0.25) 0%, rgba(11,12,15,0.7) 62%, rgba(11,12,15,0.95) 100%)",
        }}
      />
    </div>
  );
}
