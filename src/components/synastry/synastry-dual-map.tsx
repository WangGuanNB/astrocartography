"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import {
  getEmergencyBasemapConfig,
  getPrimaryBasemapConfig,
  hasCartoBasemapKey,
} from "@/lib/basemap";

type PlanetLine = {
  planet: string;
  type: "AS" | "DS" | "MC" | "IC";
  coordinates: [number, number][];
  color: string;
};

type BirthPayload = {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  labelA: string;
  labelB: string;
  /** i18n fragment, e.g. "solid · original colors" */
  legendSolid: string;
  /** i18n fragment, e.g. "dashed cyan" */
  legendDashed: string;
  /** i18n note below the map */
  footnote: string;
  personA: BirthPayload;
  personB: BirthPayload;
};

/** Merge two people's lines on one map: solid = A, dashed lighter = B */
export default function SynastryDualMap({ labelA, labelB, legendSolid, legendDashed, footnote, personA, personB }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [linesData, setLinesData] = useState<{
    linesA: PlanetLine[];
    linesB: PlanetLine[];
    birthA: { latitude: number; longitude: number; location: string };
    birthB: { latitude: number; longitude: number; location: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basemapWarning, setBasemapWarning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setLinesData(null);
      try {
        const [resA, resB] = await Promise.all([
          fetch("/api/calculate-astrocartography", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(personA),
          }),
          fetch("/api/calculate-astrocartography", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(personB),
          }),
        ]);
        const jsonA = await resA.json();
        const jsonB = await resB.json();
        if (cancelled) return;
        if (!jsonA.success || !jsonA.data?.planetLines) {
          throw new Error(jsonA.error || "Failed to load map for person A");
        }
        if (!jsonB.success || !jsonB.data?.planetLines) {
          throw new Error(jsonB.error || "Failed to load map for person B");
        }
        setLinesData({
          linesA: jsonA.data.planetLines as PlanetLine[],
          linesB: jsonB.data.planetLines as PlanetLine[],
          birthA: jsonA.data.birthData,
          birthB: jsonB.data.birthData,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Map failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [personA, personB]);

  useEffect(() => {
    if (!linesData || !containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 10,
      worldCopyJump: true,
    });

    setBasemapWarning(false);
    const primaryBasemap = getPrimaryBasemapConfig();
    let activeTileLayer = L.tileLayer(primaryBasemap.url, primaryBasemap.options);
    let consecutiveTileErrors = 0;
    let usingEmergencyFallback = primaryBasemap.provider === "openstreetmap";

    const bindTileHealth = (layer: L.TileLayer) => {
      layer.on("tileload", () => {
        consecutiveTileErrors = 0;
        setBasemapWarning(false);
      });
      layer.on("tileerror", () => {
        consecutiveTileErrors += 1;
        if (consecutiveTileErrors < 2) return;

        if (!usingEmergencyFallback && hasCartoBasemapKey()) {
          usingEmergencyFallback = true;
          consecutiveTileErrors = 0;
          map.removeLayer(layer);
          const fallback = getEmergencyBasemapConfig();
          activeTileLayer = L.tileLayer(fallback.url, fallback.options);
          bindTileHealth(activeTileLayer);
          activeTileLayer.addTo(map);
          return;
        }

        setBasemapWarning(true);
      });
    };

    bindTileHealth(activeTileLayer);
    activeTileLayer.addTo(map);

    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addTo(map);

    const addLines = (lines: PlanetLine[], partner: "a" | "b") => {
      for (const line of lines) {
        const poly = L.polyline(line.coordinates as L.LatLngExpression[], {
          color: partner === "a" ? line.color : "#38bdf8",
          weight: partner === "a" ? 2.4 : 2,
          opacity: partner === "a" ? 0.88 : 0.62,
          dashArray: partner === "b" ? "7 5" : line.type === "DS" || line.type === "IC" ? "8 4" : undefined,
          smoothFactor: 1,
        });
        poly.addTo(map);
      }
    };

    addLines(linesData.linesA, "a");
    addLines(linesData.linesB, "b");

    const mk = (lat: number, lng: number, color: string, title: string) => {
      const c = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      });
      c.bindPopup(`<div style="color:#111;font-weight:600;padding:4px;">${title}</div>`);
      c.addTo(map);
    };

    mk(linesData.birthA.latitude, linesData.birthA.longitude, "#a855f7", `📍 ${labelA}: ${linesData.birthA.location}`);
    mk(linesData.birthB.latitude, linesData.birthB.longitude, "#22d3ee", `📍 ${labelB}: ${linesData.birthB.location}`);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [linesData, labelA, labelB]);

  if (loading) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-xl border border-white/10 bg-black/20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-6 text-center text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-6 rounded-full bg-purple-500" /> {labelA} ({legendSolid})
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-6 rounded border border-cyan-400 border-dashed bg-cyan-500/40" /> {labelB} (
          {legendDashed})
        </span>
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-[380px] w-full overflow-hidden rounded-xl border border-white/10" />
        {basemapWarning && (
          <div className="absolute left-1/2 top-4 z-[1000] w-[min(92%,420px)] -translate-x-1/2 rounded-lg border border-amber-400/30 bg-black/85 px-3 py-2 text-center text-xs text-amber-100">
            The background map could not load. Please refresh and try again.
          </div>
        )}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{footnote}</p>
    </div>
  );
}
