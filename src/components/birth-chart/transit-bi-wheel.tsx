"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type PlanetPoint = {
  name: string;
  glyph: string;
  longitude: number; // 0..360
};

export function TransitBiWheel({
  natalPlanets,
  transitPlanets,
  className,
}: {
  natalPlanets: PlanetPoint[];
  transitPlanets: PlanetPoint[];
  className?: string;
}) {
  // Bi-wheel: inner ring = natal, outer ring = transit. 0° Aries at 9 o'clock.
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = 75;
  const midR = 120;
  const outerR = 165;
  const natalR = 97;
  const transitR = 143;

  const rotateDeg = 270; // 0° Aries at 9 o'clock (left)
  const polar = (deg: number, r: number) => {
    const rad = ((deg + rotateDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const zodiacLines = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div className={cn("w-full flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Transit bi-wheel: natal and transit positions"
        className="max-w-full"
      >
        <defs>
          <radialGradient id="biWheelGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.12)" />
            <stop offset="70%" stopColor="rgba(59, 130, 246, 0.06)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <circle cx={cx} cy={cy} r={outerR + 18} fill="url(#biWheelGlow)" />

        {/* Outer ring (transit) */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.22)"
        />
        {/* Middle ring (divider) */}
        <circle
          cx={cx}
          cy={cy}
          r={midR}
          fill="transparent"
          stroke="rgba(255,255,255,0.12)"
        />
        {/* Inner ring (natal) */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.18)"
        />

        {/* Zodiac / house lines */}
        {zodiacLines.map((deg) => {
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

        {/* Natal planet glyphs (inner ring) */}
        {natalPlanets.map((p) => {
          const pt = polar(p.longitude, natalR);
          return (
            <g key={`natal-${p.name}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={10}
                fill="rgba(0,0,0,0.4)"
                stroke="rgba(255,255,255,0.2)"
              />
              <text
                x={pt.x}
                y={pt.y + 4}
                textAnchor="middle"
                fontSize={14}
                fill="rgba(255,255,255,0.95)"
                fontFamily="ui-sans-serif, system-ui"
              >
                {p.glyph}
              </text>
              <title>Natal {p.name}</title>
            </g>
          );
        })}

        {/* Transit planet glyphs (outer ring) */}
        {transitPlanets.map((p) => {
          const pt = polar(p.longitude, transitR);
          return (
            <g key={`transit-${p.name}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={10}
                fill="rgba(0,0,0,0.35)"
                stroke="rgba(168,85,247,0.35)"
              />
              <text
                x={pt.x}
                y={pt.y + 4}
                textAnchor="middle"
                fontSize={14}
                fill="rgba(255,255,255,0.95)"
                fontFamily="ui-sans-serif, system-ui"
              >
                {p.glyph}
              </text>
              <title>Transit {p.name}</title>
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.5)" />
      </svg>
    </div>
  );
}
