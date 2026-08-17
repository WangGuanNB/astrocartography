import { NextRequest, NextResponse } from "next/server";
import { computePlanetaryPositionsAt } from "@/lib/natal-chart-core";
import { computeCurrentSkyAspects } from "@/lib/synastry-aspects";

export const maxDuration = 30;

interface PlanetaryPositionsRequest {
  iso?: string;
}

function parseInstant(iso?: string): Date | null {
  if (!iso || typeof iso !== "string") return new Date();
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PlanetaryPositionsRequest;
    const utcDate = parseInstant(body.iso);
    if (!utcDate) {
      return NextResponse.json(
        { success: false, error: "Invalid date. Send an ISO timestamp or omit iso to use now." },
        { status: 400 }
      );
    }

    const planets = computePlanetaryPositionsAt(utcDate);
    const aspects = computeCurrentSkyAspects(
      planets.map((p) => ({ name: p.name, glyph: p.glyph, longitude: p.longitude }))
    );

    return NextResponse.json({
      success: true,
      data: {
        utc: utcDate.toISOString(),
        system: "tropical-geocentric",
        planets,
        aspects,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to calculate planetary positions.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
