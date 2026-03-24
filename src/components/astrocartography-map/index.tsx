"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Eye, EyeOff, ChevronLeft, MessageCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MAJOR_CITIES } from '@/lib/cities';
import { useTranslations } from 'next-intl';

interface PlanetLine {
  planet: string;
  type: 'AS' | 'DS' | 'MC' | 'IC';
  coordinates: [number, number][];
  color: string;
}

interface AstrocartographyMapProps {
  birthData: {
    date: string;
    time: string;
    location: string;
    latitude: number;
    longitude: number;
  };
  planetLines?: PlanetLine[];
  // 城市快捷提问：由父组件接管“打开 Ask AI 并自动发送”的行为
  onCityQuickAsk?: (question: string) => void;
  // Ask Other：仅预填输入框，不自动发送
  onAskOther?: (prefillText: string) => void;
}

// Planet symbol mapping
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};


type LineCategoryKey = 'ASC_DS' | 'MC_IC';

const PLANET_PRIORITY: Record<string, number> = {
  Venus: 1,
  Jupiter: 2,
  Sun: 3,
  Moon: 4,
};

type CityPopupThemeKey =
  | 'relationships_love'
  | 'creativity_art'
  | 'opportunities_career'
  | 'success_wealth'
  | 'happiness_confidence'
  | 'emotional_security_home'
  | 'stability_long_term'
  | 'career_breakthrough'
  | 'drive_competition'
  | 'communication_writing_learning'
  | 'spirituality_counselling'
  | 'change_innovation'
  | 'deep_transformation';

type LinePopupState = {
  planet: string;
  type: PlanetLine['type'];
  // 仅用于定位（来自点击时的 latlng）
  position: { left: number; top: number };
} | null;

function getLineCategoryKey(type: PlanetLine['type']): LineCategoryKey {
  return type === 'AS' || type === 'DS' ? 'ASC_DS' : 'MC_IC';
}

function getCityPopupThemeKey(planet: string, categoryKey: LineCategoryKey): CityPopupThemeKey {
  switch (planet) {
    case 'Venus':
      return categoryKey === 'ASC_DS' ? 'relationships_love' : 'creativity_art';
    case 'Jupiter':
      return categoryKey === 'ASC_DS' ? 'opportunities_career' : 'success_wealth';
    case 'Sun':
      return 'happiness_confidence';
    case 'Moon':
      return 'emotional_security_home';
    case 'Saturn':
      return categoryKey === 'ASC_DS' ? 'stability_long_term' : 'career_breakthrough';
    case 'Mars':
      return 'drive_competition';
    case 'Mercury':
      return 'communication_writing_learning';
    case 'Neptune':
      return 'spirituality_counselling';
    case 'Uranus':
      return 'change_innovation';
    case 'Pluto':
    default:
      return 'deep_transformation';
  }
}

function getLineTypeLabel(type: PlanetLine['type']): string {
  if (type === 'AS') return 'ASC';
  if (type === 'DS') return 'DSC';
  if (type === 'MC') return 'MC';
  return 'IC';
}

function getPlanetPriority(planet: string): number {
  return PLANET_PRIORITY[planet] ?? 5;
}

function calculateDistanceDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function getMinDistanceToLine(
  city: { lat: number; lng: number },
  line: { coordinates: [number, number][] }
): number {
  const coordinates = line.coordinates;
  if (!coordinates || coordinates.length === 0) return Infinity;

  // 采样减少开销：坐标密集时取间隔点
  const samplePoints = coordinates.filter((_, index) => index % 10 === 0);
  const points = samplePoints.length > 0 ? samplePoints : [coordinates[0]];

  let minDistance = Infinity;
  for (const [lat, lng] of points) {
    const distance = calculateDistanceDeg(city.lat, city.lng, lat, lng);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
}

// Reusable card content for the line guidance popup
function LinePopupCard({
  selectedLinePopup,
  t,
  closeLinePopup,
  selectedLineQuestions,
  onAskOther,
}: {
  selectedLinePopup: NonNullable<LinePopupState>;
  t: ReturnType<typeof useTranslations>;
  closeLinePopup: () => void;
  selectedLineQuestions: string[];
  onAskOther?: (text: string) => void;
}) {
  return (
    <div className="w-[300px] max-w-[85vw] rounded-xl overflow-hidden border border-white/15 bg-black/85 shadow-2xl backdrop-blur-sm">
      {/* Header: line identity + short desc */}
      <div className="px-4 py-3 flex items-start justify-between bg-black/60">
        <div className="min-w-0 pr-2">
          <div className="text-white font-bold text-sm">
            {PLANET_SYMBOLS[selectedLinePopup.planet] || '•'} {selectedLinePopup.planet}{' '}
            {getLineTypeLabel(selectedLinePopup.type)}
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5 leading-snug">
            {t(`themes.${getCityPopupThemeKey(selectedLinePopup.planet, getLineCategoryKey(selectedLinePopup.type))}.shortDesc`)}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={closeLinePopup}
          className="text-white/50 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 flex-shrink-0"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Quick questions — prefill AI input, user decides to send */}
      <div className="px-3 py-3 space-y-2">
        <div className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1">
          {t('linePopup.quickAskTitle')}
        </div>
        {selectedLineQuestions.map((q, idx) => (
          <button
            key={`${idx}-${q}`}
            type="button"
            onClick={() => {
              closeLinePopup();
              setTimeout(() => onAskOther?.(q), 0);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 hover:border-purple-400/60 text-white text-xs leading-snug transition-all"
          >
            {q}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            closeLinePopup();
            setTimeout(() => onAskOther?.(''), 0);
          }}
          className="w-full mt-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-lg transition-all"
        >
          {t('askOther.buttonLabel')}
        </button>
      </div>
    </div>
  );
}

// MAJOR_CITIES is now imported from @/lib/cities

export default function AstrocartographyMap({ birthData, planetLines = [], onAskOther }: AstrocartographyMapProps) {
  const isMobile = useIsMobile();
  const t = useTranslations('astrocartographyMap');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showAngleTypes, setShowAngleTypes] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [visiblePlanets, setVisiblePlanets] = useState<Set<string>>(new Set());
  const [planetVisibility, setPlanetVisibility] = useState<Record<string, boolean>>({});
  const [lineTypeVisibility, setLineTypeVisibility] = useState<Record<PlanetLine["type"], boolean>>({
    AS: true,
    DS: true,
    MC: true,
    IC: true,
  });
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<{
    name: string;
    country: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ left: number; top: number } | null>(null);

  const [selectedLinePopup, setSelectedLinePopup] = useState<LinePopupState>(null);

  const birthSignature = useMemo(() => {
    // Use key derived from the current chart input so we can show the guide
    // once per new map generation (birthData change), not once forever.
    const parts = [
      birthData.date,
      birthData.time,
      birthData.location,
      birthData.latitude,
      birthData.longitude,
    ];
    return parts.join('|');
  }, [birthData.date, birthData.time, birthData.location, birthData.latitude, birthData.longitude]);

  const guideDismissedKey = useMemo(() => {
    return `astrocartography-map-guide-dismissed-${birthSignature}`;
  }, [birthSignature]);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    try {
      localStorage.setItem(guideDismissedKey, 'true');
    } catch {
      // ignore localStorage failures (e.g. privacy mode)
    }
  }, [guideDismissedKey]);

  // Show guide only once (when map is ready) and dismiss when user clicks city dot or line.
  useEffect(() => {
    if (isLoading) return;
    if (!planetLines || planetLines.length === 0) return;

    try {
      const dismissed = localStorage.getItem(guideDismissedKey);
      if (dismissed === 'true') return;
    } catch {
      // If localStorage is not available, still show once per mount.
    }

    setShowGuide(true);
  }, [isLoading, planetLines, guideDismissedKey]);

  // Optimization: Use useMemo to cache planet groupings, reducing redundant calculations
  // Must be defined before useEffect to avoid TDZ (Temporal Dead Zone) errors
  const planetGroups = useMemo(() => {
    const groups: Record<string, PlanetLine[]> = {};
    planetLines.forEach((line) => {
      if (!groups[line.planet]) {
        groups[line.planet] = [];
      }
      groups[line.planet].push(line);
    });
    return groups;
  }, [planetLines]);

  // Optimization: Use useMemo to cache unique planet list
  const uniquePlanets = useMemo(() => {
    return Array.from(new Set(planetLines.map(line => line.planet)));
  }, [planetLines]);

  // Initialize visible planets (all visible by default)
  useEffect(() => {
    if (planetLines.length > 0) {
      const planets = new Set(planetLines.map(line => line.planet));
      setVisiblePlanets(planets);
      const visibility: Record<string, boolean> = {};
      planets.forEach(planet => {
        visibility[planet] = true;
      });
      setPlanetVisibility(visibility);
    }
  }, [planetLines]);

  // Default panel state based on device type
  useEffect(() => {
    // Desktop: open by default; Mobile: closed by default
    setIsPanelOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map - using colorful continent style (similar to competitors)
    // Ensure global view is displayed, support dragging, zooming, and panning
    const map = L.map(mapContainerRef.current, {
      center: [20, 0], // Global view center
      zoom: 2, // Initial zoom level (show global view)
      zoomControl: true, // Show zoom controls
      attributionControl: false,
      minZoom: 2, // Minimum zoom (maintain global view)
      maxZoom: 10, // Maximum zoom (allow detailed viewing)
      worldCopyJump: true, // Allow dragging across date line
      dragging: true, // Enable dragging
      touchZoom: true, // Enable touch zoom
      doubleClickZoom: true, // Enable double-click zoom
      scrollWheelZoom: true, // Enable scroll wheel zoom
      boxZoom: true, // Enable box zoom
      keyboard: true, // Enable keyboard controls
    });

    // Use colorful continent map style (similar to competitor websites)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Keep provider attribution visible for compliance, but move it away
    // from the bottom CTA area on mobile.
    L.control.attribution({ position: 'topright', prefix: false }).addTo(map);

    // Add birth location marker
    if (birthData.latitude && birthData.longitude) {
      const birthMarker = L.circleMarker([birthData.latitude, birthData.longitude], {
        radius: 10,
        fillColor: '#8b5cf6',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);

      birthMarker.bindPopup(`
        <div style="color: #1a1a2e; font-weight: 600; padding: 4px;">
          <div style="font-size: 14px; margin-bottom: 4px;">📍 ${birthData.location}</div>
          <div style="font-size: 12px; color: #666;">
            📅 ${birthData.date}<br/>
            🕐 ${birthData.time}
          </div>
        </div>
      `);

      // Avoid auto-opening birth marker popup to keep focus on city exploration.
      // birthMarker.openPopup();
    }

    // Add major city markers (similar to competitor websites)
    MAJOR_CITIES.forEach((city) => {
      // Skip birth location (already marked)
      if (
        Math.abs(city.lat - birthData.latitude) < 0.1 &&
        Math.abs(city.lng - birthData.longitude) < 0.1
      ) {
        return;
      }

      // Create city marker (red circle, similar to competitors)
      const cityMarker = L.circleMarker([city.lat, city.lng], {
        radius: 4,
        fillColor: '#ef4444', // Red
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(map);

      // 城市点击：展示 React 覆盖弹窗（不使用 Leaflet bindPopup）
      cityMarker.on('click', () => {
        dismissGuide();
        const point = map.latLngToContainerPoint([city.lat, city.lng]);
        const nextCity = {
          name: city.name,
          country: city.country,
          lat: city.lat,
          lng: city.lng,
        };

        setSelectedCity((prev) => {
          const isSame =
            prev?.name === nextCity.name &&
            prev?.country === nextCity.country &&
            prev?.lat === nextCity.lat &&
            prev?.lng === nextCity.lng;

          if (isSame) {
            setPopupPosition(null);
            return null;
          }

          setPopupPosition({ left: point.x, top: point.y });
          return nextCity;
        });
      });

      // Mouse hover effects
      cityMarker.on('mouseover', () => {
        cityMarker.setStyle({
          radius: 6,
          fillOpacity: 1,
        });
      });

      cityMarker.on('mouseout', () => {
        cityMarker.setStyle({
          radius: 4,
          fillOpacity: 0.8,
        });
      });
    });

    // Optimize cursor display during dragging
    map.on('mousedown', () => {
      map.getContainer().style.cursor = 'grabbing';
    });
    
    map.on('mouseup', () => {
      map.getContainer().style.cursor = 'grab';
    });

    mapRef.current = map;
    setIsLoading(false);

    // Force recalculation of map size
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [birthData]);

  // Draw planetary lines
  useEffect(() => {
    if (!mapRef.current || planetLines.length === 0) return;

    const map = mapRef.current;

    // Clear previous lines
    polylinesRef.current.forEach((polyline) => {
      map.removeLayer(polyline);
    });
    polylinesRef.current.clear();

    // Use cached planetGroups (already calculated in useMemo)
    // Draw lines for each planet
    Object.entries(planetGroups).forEach(([planet, lines]) => {
      // Check if this planet is visible
      if (!planetVisibility[planet]) return;

      const color = lines[0].color;
      
      lines.forEach((line) => {
        if (!lineTypeVisibility[line.type]) return;

        // Draw main line
        const polyline = L.polyline(line.coordinates, {
          color: color,
          weight: 2.5,
          opacity: 0.85,
          smoothFactor: 1,
          dashArray: line.type === 'DS' || line.type === 'IC' ? '8, 4' : undefined
        });

        // Store reference for later show/hide control
        const lineId = `${planet}-${line.type}`;
        polylinesRef.current.set(lineId, polyline);

        // Add to map based on visibility
        if (planetVisibility[planet]) {
          polyline.addTo(map);
        }

        // Add mouse hover effects
        polyline.on('mouseover', () => {
          polyline.setStyle({
            weight: 4,
            opacity: 1
          });
        });

        polyline.on('mouseout', () => {
          const isSelected = selectedLineId === lineId;
          polyline.setStyle(
            isSelected
              ? { weight: 5, opacity: 1 }
              : { weight: 2.5, opacity: 0.85 }
          );
        });

        polyline.on('click', (e) => {
          dismissGuide();
          setSelectedLineId((prev) => (prev === lineId ? null : lineId));

          // Line guidance popup: open a React overlay anchored at click position
          // Leaflet provides latlng via the click event.
          const latlng = (e as any)?.latlng;
          if (latlng && mapRef.current) {
            closeCityPopup();
            setSelectedLinePopup({
              planet,
              type: line.type,
              position: (() => {
                const point = mapRef.current!.latLngToContainerPoint([latlng.lat, latlng.lng]);
                return { left: point.x, top: point.y };
              })(),
            });
          }
        });
      });
    });
  }, [planetLines, planetVisibility, planetGroups, lineTypeVisibility, selectedLineId]);

  // Keep selected line highlighted (and others reset) when selection changes.
  useEffect(() => {
    polylinesRef.current.forEach((polyline, lineId) => {
      const isSelected = selectedLineId === lineId;
      polyline.setStyle(isSelected ? { weight: 5, opacity: 1 } : { weight: 2.5, opacity: 0.85 });
      if (isSelected) {
        polyline.bringToFront();
      }
    });
  }, [selectedLineId]);

  // Toggle planet visibility
  const togglePlanet = useCallback((planet: string) => {
    setPlanetVisibility(prev => {
      const newVisibility = { ...prev };
      newVisibility[planet] = !newVisibility[planet];
      
      // Update lines on map
      if (mapRef.current) {
        planetLines.forEach(line => {
          if (line.planet === planet) {
            const lineId = `${planet}-${line.type}`;
            const polyline = polylinesRef.current.get(lineId);
            if (polyline) {
              if (newVisibility[planet]) {
                if (lineTypeVisibility[line.type]) {
                  polyline.addTo(mapRef.current!);
                }
              } else {
                mapRef.current!.removeLayer(polyline);
              }
            }
          }
        });
      }
      
      return newVisibility;
    });
  }, [planetLines, lineTypeVisibility]);

  // Toggle all planets
  const toggleAllPlanets = useCallback((show: boolean) => {
    const newVisibility: Record<string, boolean> = {};
    visiblePlanets.forEach(planet => {
      newVisibility[planet] = show;
    });
    setPlanetVisibility(newVisibility);

    // Update all lines on map
    if (mapRef.current) {
      polylinesRef.current.forEach((polyline, lineId) => {
        const [planet, type] = lineId.split('-') as [string, PlanetLine["type"]];
        if (show) {
          if (newVisibility[planet] && lineTypeVisibility[type] && !mapRef.current!.hasLayer(polyline)) {
            polyline.addTo(mapRef.current!);
          }
        } else {
          mapRef.current!.removeLayer(polyline);
        }
      });
    }
  }, [visiblePlanets, lineTypeVisibility]);

  const toggleLineType = useCallback((type: PlanetLine["type"]) => {
    setLineTypeVisibility((prev) => {
      const next = { ...prev, [type]: !prev[type] };

      if (mapRef.current) {
        planetLines.forEach((line) => {
          if (line.type !== type) return;
          const lineId = `${line.planet}-${line.type}`;
          const polyline = polylinesRef.current.get(lineId);
          if (!polyline) return;

          const planetVisible = planetVisibility[line.planet] ?? true;
          const typeVisible = next[type];
          if (planetVisible && typeVisible) {
            if (!mapRef.current!.hasLayer(polyline)) polyline.addTo(mapRef.current!);
          } else {
            mapRef.current!.removeLayer(polyline);
          }
        });
      }

      // If we hid the currently selected type, clear selection.
      if (selectedLineId && selectedLineId.endsWith(`-${type}`) && !next[type]) {
        setSelectedLineId(null);
      }

      return next;
    });
  }, [planetLines, planetVisibility, selectedLineId]);

  // 计算城市附近命中的行星线（用于“静态展示”和快捷提问模板选择）
  const selectedCityLines = useMemo(() => {
    if (!selectedCity || planetLines.length === 0) return [];

    const MAX_LINES = 3;
    const MAX_DISTANCE_DEG = 5; // 约等于需求中的“附近阈值”

    const hits = planetLines
      .map((line) => {
        const minDistance = getMinDistanceToLine(
          { lat: selectedCity.lat, lng: selectedCity.lng },
          line
        );
        return { line, minDistance };
      })
      .filter(({ minDistance }) => minDistance <= MAX_DISTANCE_DEG);

    hits.sort((a, b) => {
      const prA = getPlanetPriority(a.line.planet);
      const prB = getPlanetPriority(b.line.planet);
      if (prA !== prB) return prA - prB;
      return a.minDistance - b.minDistance;
    });

    return hits.slice(0, MAX_LINES).map((h) => h.line);
  }, [selectedCity, planetLines]);

  const selectedLineQuestions = useMemo(() => {
    if (!selectedLinePopup) return [];

    const categoryKey = getLineCategoryKey(selectedLinePopup.type);
    const themeKey = getCityPopupThemeKey(selectedLinePopup.planet, categoryKey);
    const shortDesc = t(`themes.${themeKey}.shortDesc`);

    return [
      t('linePopup.question1Template', { shortDesc }),
      t('linePopup.question2Template', { shortDesc }),
      t('linePopup.question3Template', { shortDesc }),
    ];
  }, [selectedLinePopup, t]);

  const selectedCityQuestions = useMemo(() => {
    if (!selectedCity) return [];

    if (selectedCityLines.length === 0) {
      // 兜底：为了更好的转化体验，命中为 0 时也提供 3 个“常问主题”
      return [
        t('themes.happiness_confidence.questionTemplate', { city: selectedCity.name }),
        t('themes.emotional_security_home.questionTemplate', { city: selectedCity.name }),
        t('themes.opportunities_career.questionTemplate', { city: selectedCity.name }),
      ];
    }

    return selectedCityLines.map((line) => {
      const categoryKey = getLineCategoryKey(line.type);
      const themeKey = getCityPopupThemeKey(line.planet, categoryKey);
      return t(`themes.${themeKey}.questionTemplate`, { city: selectedCity.name });
    });
  }, [selectedCity, selectedCityLines, t]);


  const closeCityPopup = useCallback(() => {
    setSelectedCity(null);
    setPopupPosition(null);
  }, []);

  const closeLinePopup = useCallback(() => {
    setSelectedLinePopup(null);
  }, []);

  // Panel "Ask" entry: open the same line guidance popup flow as clicking the map polyline.
  // We only expose one Ask per planet, so we must pick a default line type based on current angle filters.
  const openLinePopupFromPanel = useCallback(
    (planet: string) => {
      const defaultType: PlanetLine['type'] | null =
        lineTypeVisibility.AS
          ? 'AS'
          : lineTypeVisibility.DS
            ? 'DS'
            : lineTypeVisibility.MC
              ? 'MC'
              : lineTypeVisibility.IC
                ? 'IC'
                : null;

      if (!defaultType) return;

      dismissGuide();

      // Highlight the corresponding line and open the React overlay.
      setSelectedLineId(`${planet}-${defaultType}`);
      closeCityPopup();
      setSelectedLinePopup({
        planet,
        type: defaultType,
        // Position isn't used by the overlay layout (it is centered fixed),
        // but the state type requires it.
        position: { left: 0, top: 0 },
      });
    },
    [closeCityPopup, dismissGuide, lineTypeVisibility]
  );

  // 在地图缩放/移动时，保持城市弹窗锚点跟随（类似 Leaflet popup 的定位体验）
  useEffect(() => {
    if (!selectedCity) return;
    if (!mapRef.current) return;

    const map = mapRef.current;

    const update = () => {
      const point = map.latLngToContainerPoint([selectedCity.lat, selectedCity.lng]);
      setPopupPosition({ left: point.x, top: point.y });
    };

    update();
    map.on('move', update);
    map.on('zoom', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
    };
  }, [selectedCity]);

  // 出生信息变化时：重置城市弹窗
  useEffect(() => {
    setSelectedCity(null);
    setPopupPosition(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthData.latitude, birthData.longitude]);


  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="size-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
        </div>
      )}
      
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full"
        style={{ 
          touchAction: 'pan-x pan-y pinch-zoom' // Optimize mobile touch interaction
        }}
      />
      
      {/* First-time guide — hide when any popup is open */}
      {showGuide && !selectedCity && !selectedLinePopup && (
        <div className="absolute left-1/2 top-4 z-[1150] -translate-x-1/2 w-[560px] max-w-[92vw] pointer-events-auto">
          <div className="rounded-lg border border-white/15 bg-black/70 backdrop-blur-md px-4 py-2.5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white/90 text-xs font-semibold whitespace-normal break-words">
                  {t('guide.title')}
                </div>
                <div className="text-gray-200 text-[11px] leading-snug whitespace-normal break-words">
                  {t('guide.text')}
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss guide"
                onClick={dismissGuide}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Planetary control panel */}
      {planetLines.length > 0 && (
        <div
          className={`absolute left-0 top-0 bottom-0 z-[1000] transition-transform duration-300 ${
          isPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        >
          <div className="h-full bg-black/90 backdrop-blur-md border-r border-white/20 shadow-2xl overflow-y-auto">
            <div className="p-4 space-y-4 min-w-[200px] md:min-w-[240px] w-[70vw] md:w-auto">
              {/* Panel title */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Planetary Lines</h3>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>

              {/* Toggle all buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleAllPlanets(true)}
                  className="w-full px-3 py-2 text-xs font-medium text-white bg-purple-600/80 hover:bg-purple-600 rounded-md transition-colors"
                >
                  Show All
                </button>
                <button
                  onClick={() => toggleAllPlanets(false)}
                  className="w-full px-3 py-2 text-xs font-medium text-white bg-gray-700/80 hover:bg-gray-700 rounded-md transition-colors"
                >
                  Hide All
                </button>
              </div>

              {/* Line type filters — collapsible */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAngleTypes((v) => !v)}
                  className="w-full flex items-center justify-between text-[11px] text-white/60 hover:text-white/90 transition-colors"
                >
                  <span>Angle types</span>
                  <span className="text-[10px]">{showAngleTypes ? '▲' : '▼'}</span>
                </button>
                {showAngleTypes && (
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { type: "AS" as const, label: "ASC (AS)" },
                        { type: "DS" as const, label: "DSC (DS)" },
                        { type: "MC" as const, label: "MC" },
                        { type: "IC" as const, label: "IC" },
                      ] satisfies Array<{ type: PlanetLine["type"]; label: string }>
                    ).map(({ type, label }) => {
                      const active = lineTypeVisibility[type];
                      return (
                        <button
                          key={type}
                          onClick={() => toggleLineType(type)}
                          className={`px-3 py-2 text-xs font-medium rounded-md transition-colors border ${
                            active
                              ? "bg-white/10 text-white border-white/20 hover:bg-white/15"
                              : "bg-transparent text-white/50 border-white/10 hover:text-white/70"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Planet list */}
              <div className="space-y-2">
                {uniquePlanets.map((planet) => {
                  const line = planetLines.find(l => l.planet === planet);
                  const isVisible = planetVisibility[planet] ?? true;
                  const hasEnabledAngleType =
                    lineTypeVisibility.AS || lineTypeVisibility.DS || lineTypeVisibility.MC || lineTypeVisibility.IC;
                  
                  return (
                    <button
                      key={planet}
                      onClick={() => togglePlanet(planet)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{PLANET_SYMBOLS[planet] || '•'}</span>
                        <span className="text-white text-sm font-medium">{planet}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-5 rounded border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: line?.color || '#fff',
                            backgroundColor: isVisible ? (line?.color || '#fff') : 'transparent',
                          }}
                        >
                          {isVisible ? (
                            <Eye className="size-3 text-white" />
                          ) : (
                            <EyeOff className="size-3 text-white/40" />
                          )}
                        </div>

                        {/* Panel Ask button (opens line guidance popup) */}
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={t('panelAsk.buttonLabel')}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!hasEnabledAngleType) return;
                            openLinePopupFromPanel(planet);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!hasEnabledAngleType) return;
                              openLinePopupFromPanel(planet);
                            }
                          }}
                          className={`size-5 rounded-md flex items-center justify-center transition-colors ${
                            hasEnabledAngleType
                              ? 'bg-purple-600/90 hover:bg-purple-600 text-white'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          <MessageCircle className="size-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-xs text-white/60 space-y-1">
                  <div><strong className="text-white/80">ASC (AS):</strong> Rising / Ascendant</div>
                  <div><strong className="text-white/80">DSC (DS):</strong> Setting / Descendant</div>
                  <div><strong className="text-white/80">MC:</strong> Midheaven (Career/Public)</div>
                  <div><strong className="text-white/80">IC:</strong> Nadir / Imum Coeli (Home/Roots)</div>
                  <div className="pt-2">
                    <strong className="text-white/80">Line style:</strong> DS &amp; IC are dashed; AS &amp; MC are solid.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* City quick-ask popup (React overlay) */}
      {selectedCity && popupPosition && (
        <div
          className={`absolute z-[1200] pointer-events-auto -translate-x-1/2 ${
            popupPosition.top < 220 ? 'translate-y-3' : '-translate-y-full -mt-2'
          }`}
          style={{ left: popupPosition.left, top: popupPosition.top }}
        >
          <div className="w-[300px] max-w-[85vw] rounded-xl overflow-hidden border border-white/15 bg-black/85 shadow-2xl backdrop-blur-sm">
            {/* Header: city name */}
            <div className="px-4 py-3 flex items-center justify-between bg-black/60">
              <div className="min-w-0">
                <div className="text-white font-bold text-sm truncate">📍 {selectedCity.name}</div>
                <div className="text-gray-400 text-[11px] mt-0.5 truncate">{selectedCity.country}</div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeCityPopup}
                className="text-white/50 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 flex-shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick questions — prefill AI input, user decides to send */}
            <div className="px-3 py-3 space-y-2">
              <div className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1">
                {t('cityPopup.quickAskTitle')}
              </div>
              {selectedCityQuestions.map((q, idx) => (
                <button
                  key={`${idx}-${q}`}
                  type="button"
                  onClick={() => {
                    closeCityPopup();
                    setTimeout(() => onAskOther?.(q), 0);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 hover:border-purple-400/60 text-white text-xs leading-snug transition-all"
                >
                  {q}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  closeCityPopup();
                  setTimeout(() => onAskOther?.(''), 0);
                }}
                className="w-full mt-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-lg transition-all"
              >
                {t('askOther.buttonLabel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Line guidance popup */}
      {selectedLinePopup && (() => {
        const { left: clickLeft, top: clickTop } = selectedLinePopup.position;
        const fromPanel = clickLeft === 0 && clickTop === 0;

        // Mobile: fixed bottom-center (above Ask AI button)
        if (isMobile) {
          return (
            <div className="absolute z-[1250] pointer-events-auto bottom-[88px] left-1/2 -translate-x-1/2">
              <LinePopupCard
                selectedLinePopup={selectedLinePopup}
                t={t}
                closeLinePopup={closeLinePopup}
                selectedLineQuestions={selectedLineQuestions}
                onAskOther={onAskOther}
              />
            </div>
          );
        }

        // Desktop: near click point (smart above/below), or center if opened from panel
        if (fromPanel) {
          return (
            <div
              className="absolute z-[1250] pointer-events-auto"
              style={{ left: '50%', top: '35%', transform: 'translate(-50%, -50%)' }}
            >
              <LinePopupCard
                selectedLinePopup={selectedLinePopup}
                t={t}
                closeLinePopup={closeLinePopup}
                selectedLineQuestions={selectedLineQuestions}
                onAskOther={onAskOther}
              />
            </div>
          );
        }

        // Desktop: anchor near the clicked point, flip above if click is in lower half
        const showAbove = clickTop > 320;
        return (
          <div
            className="absolute z-[1250] pointer-events-auto"
            style={{
              left: clickLeft,
              top: showAbove ? clickTop - 8 : clickTop + 8,
              transform: showAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            <LinePopupCard
              selectedLinePopup={selectedLinePopup}
              t={t}
              closeLinePopup={closeLinePopup}
              selectedLineQuestions={selectedLineQuestions}
              onAskOther={onAskOther}
            />
          </div>
        );
      })()}

      {/* Panel toggle button (shown when panel is closed) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="absolute left-4 top-16 z-[1000] bg-black/80 hover:bg-black backdrop-blur-md text-white p-2 rounded-md shadow-lg transition-colors"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </button>
      )}
    </div>
  );
}
