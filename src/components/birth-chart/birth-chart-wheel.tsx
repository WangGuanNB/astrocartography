"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type PlanetPoint = {
  name: string;
  glyph: string;
  longitude: number; // 0..360
};

export function BirthChartWheel({
  planets,
  ascendantLongitude,
  className,
}: {
  planets: PlanetPoint[];
  ascendantLongitude: number;
  className?: string;
}) {
  // Simple SVG wheel for lead-gen UX (not an astrologer-grade ephemeris wheel).
  // We rotate so that ASC is at the left (9 o'clock), which is a common visual convention.
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 160;
  const innerR = 110;
  const planetR = 135;

  const rotateDeg = 180 - ascendantLongitude; // place ASC near left

  const polar = (deg: number, r: number) => {
    const rad = ((deg + rotateDeg - 90) * Math.PI) / 180; // -90 => 12 o'clock reference
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const houseLines = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div className={cn("w-full flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Birth chart wheel"
        className="max-w-full"
      >
        <defs>
          <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.18)" />
            <stop offset="65%" stopColor="rgba(59, 130, 246, 0.08)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <circle cx={cx} cy={cy} r={outerR + 18} fill="url(#wheelGlow)" />

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.20)" />
        {/* Inner ring */}
        <circle cx={cx} cy={cy} r={innerR} fill="transparent" stroke="rgba(255,255,255,0.16)" />

        {/* House lines */}
        {houseLines.map((deg) => {
          const a = polar(deg, innerR);
          const b = polar(deg, outerR);
          return (
            <line
              key={deg}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={1}
            />
          );
        })}

        {/* ASC marker */}
        {(() => {
          const p = polar(ascendantLongitude, outerR + 8);
          return (
            <g>
              <circle cx={p.x} cy={p.y} r={5} fill="rgba(168,85,247,0.9)" />
              <text
                x={p.x + 10}
                y={p.y + 4}
                fontSize={12}
                fill="rgba(255,255,255,0.9)"
                fontFamily="ui-sans-serif, system-ui"
              >
                ASC
              </text>
            </g>
          );
        })()}

        {/* Planet glyphs */}
        {planets.map((p) => {
          const pt = polar(p.longitude, planetR);
          return (
            <g key={p.name}>
              <circle cx={pt.x} cy={pt.y} r={12} fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.18)" />
              <text
                x={pt.x}
                y={pt.y + 5}
                textAnchor="middle"
                fontSize={16}
                fill="rgba(255,255,255,0.95)"
                fontFamily="ui-sans-serif, system-ui"
              >
                {p.glyph}
              </text>
              <title>{p.name}</title>
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.65)" />
      </svg>
    </div>
  );
}

