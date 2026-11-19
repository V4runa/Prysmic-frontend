"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { clampRect, type Rect } from "./tourLayout";
import { TOUR_MOTE } from "./tourStops";

type Tint = { r: number; g: number; b: number } | null;

const FEATHER = 24;

function mixScrim(tint: Tint): string {
  if (!tint) return TOUR_MOTE.scrim;
  const mix = (base: number, channel: number) => Math.round(base * 0.94 + channel * 0.06);
  return `rgb(${mix(6, tint.r)} ${mix(7, tint.g)} ${mix(10, tint.b)})`;
}

function shields(hole: Rect | null, width: number, height: number): Rect[] {
  if (!hole) return [{ x: 0, y: 0, width, height }];
  const right = hole.x + hole.width;
  const bottom = hole.y + hole.height;
  return [
    { x: 0, y: 0, width, height: Math.max(0, hole.y) },
    { x: 0, y: hole.y, width: Math.max(0, hole.x), height: hole.height },
    { x: right, y: hole.y, width: Math.max(0, width - right), height: hole.height },
    { x: 0, y: bottom, width, height: Math.max(0, height - bottom) },
  ];
}

/**
 * A flat abyss veil with a feathered opening. The feather is a gradient mask,
 * not a blur filter — the same rule as the mood light, after Android flicker.
 * Clicks land on the lit control. The rest of the veil catches them.
 */
export default function LightPool({
  strength,
  hole,
  tint,
  showRing,
}: {
  strength: number;
  hole: Rect | null;
  tint: Tint;
  showRing: boolean;
}) {
  const reduced = useReducedMotion();
  const rawId = useId().replace(/:/g, "");
  const maskId = `tour-pool-${rawId}`;
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const read = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const { width, height } = viewport;
  if (width < 1 || height < 1) return null;

  const opening = hole ? clampRect(hole, viewport, 8) : null;
  const radius = opening ? Math.min(18, opening.width / 2, opening.height / 2) : 0;
  const feather = FEATHER;
  const color = mixScrim(tint);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{ opacity: strength }}
        transition={{ duration: reduced ? 0.15 : strength > 0.75 ? 0.6 : 0.9, ease: "easeOut" }}
      >
        <svg className="absolute inset-0 h-full w-full" width={width} height={height}>
          <defs>
            {opening ? (
              <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
                <rect width={width} height={height} fill="white" />
                <FeatherBands hole={opening} radius={radius} feather={feather} />
                <rect
                  x={opening.x}
                  y={opening.y}
                  width={opening.width}
                  height={opening.height}
                  rx={radius}
                  fill="black"
                />
              </mask>
            ) : null}
          </defs>
          <rect
            width={width}
            height={height}
            fill={color}
            mask={opening ? `url(#${maskId})` : undefined}
          />
        </svg>
        {opening && showRing ? (
          <div
            className="absolute"
            style={{
              left: opening.x,
              top: opening.y,
              width: opening.width,
              height: opening.height,
              borderRadius: radius,
              boxShadow: "0 0 0 1px rgba(103,232,249,0.55), 0 0 0 6px rgba(103,232,249,0.08)",
            }}
          />
        ) : null}
      </motion.div>
      {shields(opening, width, height).map((shield, index) =>
        shield.width < 1 || shield.height < 1 ? null : (
          <div
            key={index}
            className="pointer-events-auto absolute"
            style={{ left: shield.x, top: shield.y, width: shield.width, height: shield.height }}
          />
        )
      )}
    </div>
  );
}

function FeatherBands({
  hole,
  radius,
  feather,
}: {
  hole: Rect;
  radius: number;
  feather: number;
}) {
  const { x, y, width, height } = hole;
  const span = Math.max(0, width - radius * 2);
  const rise = Math.max(0, height - radius * 2);
  const reach = radius + feather;
  return (
    <g>
      <linearGradient id="tour-fade-n" gradientUnits="userSpaceOnUse" x1="0" y1={y} x2="0" y2={y - feather}>
        <stop offset="0" stopColor="black" />
        <stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id="tour-fade-s" gradientUnits="userSpaceOnUse" x1="0" y1={y + height} x2="0" y2={y + height + feather}>
        <stop offset="0" stopColor="black" />
        <stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id="tour-fade-w" gradientUnits="userSpaceOnUse" x1={x} y1="0" x2={x - feather} y2="0">
        <stop offset="0" stopColor="black" />
        <stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id="tour-fade-e" gradientUnits="userSpaceOnUse" x1={x + width} y1="0" x2={x + width + feather} y2="0">
        <stop offset="0" stopColor="black" />
        <stop offset="1" stopColor="white" />
      </linearGradient>
      <CornerFade id="tour-fade-nw" cx={x + radius} cy={y + radius} reach={reach} inner={radius} />
      <CornerFade id="tour-fade-ne" cx={x + width - radius} cy={y + radius} reach={reach} inner={radius} />
      <CornerFade id="tour-fade-sw" cx={x + radius} cy={y + height - radius} reach={reach} inner={radius} />
      <CornerFade id="tour-fade-se" cx={x + width - radius} cy={y + height - radius} reach={reach} inner={radius} />
      <rect x={x + radius} y={y - feather} width={span} height={feather} fill="url(#tour-fade-n)" />
      <rect x={x + radius} y={y + height} width={span} height={feather} fill="url(#tour-fade-s)" />
      <rect x={x - feather} y={y + radius} width={feather} height={rise} fill="url(#tour-fade-w)" />
      <rect x={x + width} y={y + radius} width={feather} height={rise} fill="url(#tour-fade-e)" />
      <rect x={x - feather} y={y - feather} width={reach} height={reach} fill="url(#tour-fade-nw)" />
      <rect x={x + width - radius} y={y - feather} width={reach} height={reach} fill="url(#tour-fade-ne)" />
      <rect x={x - feather} y={y + height - radius} width={reach} height={reach} fill="url(#tour-fade-sw)" />
      <rect x={x + width - radius} y={y + height - radius} width={reach} height={reach} fill="url(#tour-fade-se)" />
    </g>
  );
}

function CornerFade({
  id,
  cx,
  cy,
  reach,
  inner,
}: {
  id: string;
  cx: number;
  cy: number;
  reach: number;
  inner: number;
}) {
  const edge = reach <= 0 ? 1 : inner / reach;
  return (
    <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={Math.max(reach, 1)}>
      <stop offset={edge} stopColor="black" />
      <stop offset="1" stopColor="white" />
    </radialGradient>
  );
}
