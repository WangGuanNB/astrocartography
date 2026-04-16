"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/app";
import { Calendar, Clock, Globe, Heart, MapPin, Sparkles, Users, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";

const TIMEZONE_OPTIONS = [
  "UTC (London, Dublin)",
  "EST (New York)",
  "PST (Los Angeles)",
  "CST (Chicago)",
  "MST (Denver)",
  "CET (Paris, Berlin)",
  "CST (Mexico City)",
  "COT (Bogotá)",
  "PET (Lima)",
  "CLT (Santiago)",
  "ART (Buenos Aires)",
  "BRT (São Paulo)",
  "JST (Tokyo)",
  "AEST (Sydney)",
  "IST (Mumbai)",
  "CST (Beijing)",
];

type ToolLabels = {
  form: {
    personA: string;
    personB: string;
    wheelAxisInner: string;
    wheelAxisOuter: string;
    biwheelFootnote: string;
    birthDate: string;
    birthTime: string;
    birthLocation: string;
    timezone: string;
    submit: string;
  };
  tabs: { composite: string };
  result: Record<string, string>;
  errors: { required: string; generic: string };
};

type CompositeChartData = {
  personA: {
    birthData: {
      date: string;
      time: string;
      location: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
  personB: {
    birthData: {
      date: string;
      time: string;
      location: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
  compositeChart?: {
    planets: Array<{
      name: string;
      glyph: string;
      longitude: number;
      sign: string;
      degree: number;
      house: number;
    }>;
    aspects: Array<{
      planet1: string;
      planet2: string;
      aspect: string;
      orb: number;
    }>;
  };
};

export default function CompositeChartCalculatorClient({ tool }: { tool: ToolLabels }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const { user, setShowSignModal } = useAppContext();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [aDate, setADate] = useState("");
  const [aTime, setATime] = useState("");
  const [aLoc, setALoc] = useState("");
  const [aTz, setATz] = useState(TIMEZONE_OPTIONS[0]);
  const [aCoords, setACoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [bDate, setBDate] = useState("");
  const [bTime, setBTime] = useState("");
  const [bLoc, setBLoc] = useState("");
  const [bTz, setBTz] = useState(TIMEZONE_OPTIONS[0]);
  const [bCoords, setBCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompositeChartData | null>(null);

  const handleCalculate = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setData(null);

    if (!aDate || !aLoc?.trim() || !bDate || !bLoc?.trim()) {
      setError(tool.errors.required);
      return;
    }

    setLoading(true);
    try {
      const formattedATime = aTime || "12:00";
      const formattedBTime = bTime || "12:00";

      const response = await fetch("/api/calculate-composite-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personA: {
            birthDate: aDate,
            birthTime: formattedATime,
            birthLocation: aLoc.trim(),
            ...(aCoords ? { latitude: aCoords.latitude, longitude: aCoords.longitude } : {}),
            timezone: aTz,
          },
          personB: {
            birthDate: bDate,
            birthTime: formattedBTime,
            birthLocation: bLoc.trim(),
            ...(bCoords ? { latitude: bCoords.latitude, longitude: bCoords.longitude } : {}),
            timezone: bTz,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(tool.errors.generic);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || tool.errors.generic);
      }
      setData(result);

      if (resultsRef.current) {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tool.errors.generic);
      console.error("Composite chart calculation error:", err);
    } finally {
      setLoading(false);
    }
  }, [aDate, aTime, aLoc, aTz, aCoords, bDate, bTime, bLoc, bTz, bCoords, tool.errors]);

  return (
    <div className="space-y-8">
      {/* Input Form */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Person A */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-white">{tool.form.personA}</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Calendar className="inline h-4 w-4 mr-2" />
                    {tool.form.birthDate}
                  </label>
                  <DatePicker value={aDate} onChange={setADate} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Clock className="inline h-4 w-4 mr-2" />
                    {tool.form.birthTime}
                  </label>
                  <Input type="time" value={aTime} onChange={(e) => setATime(e.target.value)} placeholder="12:00" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <MapPin className="inline h-4 w-4 mr-2" />
                    {tool.form.birthLocation}
                  </label>
                  <LocationAutocomplete
                    value={aLoc}
                    onChange={(v) => { setALoc(v); if (!v) setACoords(null); }}
                    onSelect={(r) => setACoords(r.coordinates)}
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Globe className="inline h-4 w-4 mr-2" />
                    {tool.form.timezone}
                  </label>
                  <select
                    value={aTz}
                    onChange={(e) => setATz(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-white text-sm"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Person B */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-white">{tool.form.personB}</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Calendar className="inline h-4 w-4 mr-2" />
                    {tool.form.birthDate}
                  </label>
                  <DatePicker value={bDate} onChange={setBDate} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Clock className="inline h-4 w-4 mr-2" />
                    {tool.form.birthTime}
                  </label>
                  <Input type="time" value={bTime} onChange={(e) => setBTime(e.target.value)} placeholder="12:00" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <MapPin className="inline h-4 w-4 mr-2" />
                    {tool.form.birthLocation}
                  </label>
                  <LocationAutocomplete
                    value={bLoc}
                    onChange={(v) => { setBLoc(v); if (!v) setBCoords(null); }}
                    onSelect={(r) => setBCoords(r.coordinates)}
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Globe className="inline h-4 w-4 mr-2" />
                    {tool.form.timezone}
                  </label>
                  <select
                    value={bTz}
                    onChange={(e) => setBTz(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-white text-sm"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && <div className="rounded bg-destructive/10 border border-destructive px-4 py-3 text-sm text-destructive">{error}</div>}

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Calculating..." : tool.form.submit}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <div ref={resultsRef} className="space-y-6">
          <Tabs defaultValue="composite" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="composite">{tool.tabs.composite}</TabsTrigger>
            </TabsList>

            <TabsContent value="composite" className="space-y-6">
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">{tool.result.title}</h3>

                  {data.compositeChart?.planets && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        {tool.result.planet || "Composite planets"}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-muted-foreground">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">{tool.result.planet || "Planet"}</th>
                              <th className="text-left py-2">{tool.result.sign || "Sign"}</th>
                              <th className="text-left py-2">{tool.result.degree || "Degree"}</th>
                              <th className="text-left py-2">{tool.result.house || "House"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.compositeChart.planets.map((planet, i) => (
                              <tr key={i} className="border-b hover:bg-muted/50">
                                <td className="py-3">{planet.name}</td>
                                <td className="py-3">{planet.sign}</td>
                                <td className="py-3">{planet.degree.toFixed(1)}°</td>
                                <td className="py-3">{planet.house}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4 italic">{tool.result.footnote || "Whole-sign houses."}</p>
                    </div>
                  )}

                  {data.compositeChart?.aspects && data.compositeChart.aspects.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-4">{tool.result.aspectsTitle || "Composite aspects"}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-muted-foreground">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Planet 1</th>
                              <th className="text-left py-2">Planet 2</th>
                              <th className="text-left py-2">{tool.result.aspect || "Aspect"}</th>
                              <th className="text-left py-2">{tool.result.orb || "Orb"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.compositeChart.aspects.map((aspect, i) => (
                              <tr key={i} className="border-b hover:bg-muted/50">
                                <td className="py-3">{aspect.planet1}</td>
                                <td className="py-3">{aspect.planet2}</td>
                                <td className="py-3 font-semibold">{aspect.aspect}</td>
                                <td className="py-3">{aspect.orb.toFixed(2)}°</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your composite chart shows the soul of your relationship as its own entity. See where this relationship energy is strongest on Earth with Astrocartography, or explore Synastry to understand each person's individual experience.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/astrocartography-calculator" className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm">
                      <MapPin className="h-4 w-4" />
                      Astrocartography Map
                    </Link>
                    <Link href="/synastry-chart-calculator" className="inline-flex items-center gap-2 px-4 py-2 rounded border border-border text-foreground hover:bg-muted transition-colors text-sm">
                      <Heart className="h-4 w-4" />
                      Synastry Chart
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
