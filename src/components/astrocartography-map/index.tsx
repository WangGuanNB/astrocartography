'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Eye, EyeOff, ChevronLeft } from 'lucide-react';

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

// Planetary line type labels
const LINE_TYPE_LABELS: Record<string, string> = {
  AS: 'Rising (Ascendant)',
  DS: 'Setting (Descendant)',
  MC: 'Midheaven',
  IC: 'Nadir (Imum Coeli)',
};

// Major city markers (similar to competitor websites)
const MAJOR_CITIES: Array<{ name: string; lat: number; lng: number; country: string }> = [
  // North America
  { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'USA' },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, country: 'USA' },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, country: 'USA' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, country: 'Canada' },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, country: 'Mexico' },
  // South America
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, country: 'Brazil' },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, country: 'Brazil' },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, country: 'Argentina' },
  { name: 'Lima', lat: -12.0464, lng: -77.0428, country: 'Peru' },
  { name: 'Bogotá', lat: 4.7110, lng: -74.0721, country: 'Colombia' },
  // Europe
  { name: 'London', lat: 51.5074, lng: -0.1278, country: 'UK' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'France' },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, country: 'Germany' },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, country: 'Spain' },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, country: 'Italy' },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, country: 'Russia' },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, country: 'Turkey' },
  // Asia
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'Japan' },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, country: 'China' },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, country: 'China' },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, country: 'India' },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090, country: 'India' },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, country: 'Thailand' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'Singapore' },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780, country: 'South Korea' },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, country: 'UAE' },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, country: 'Indonesia' },
  // Africa
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, country: 'Egypt' },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, country: 'Nigeria' },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, country: 'South Africa' },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, country: 'Kenya' },
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898, country: 'Morocco' },
  // Oceania
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'Australia' },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, country: 'Australia' },
  { name: 'Auckland', lat: -36.8485, lng: 174.7633, country: 'New Zealand' },
];

export default function AstrocartographyMap({ birthData, planetLines = [] }: AstrocartographyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [visiblePlanets, setVisiblePlanets] = useState<Set<string>>(new Set());
  const [planetVisibility, setPlanetVisibility] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map - using colorful continent style (similar to competitors)
    // Ensure global view is displayed, support dragging, zooming, and panning
    const map = L.map(mapContainerRef.current, {
      center: [20, 0], // Global view center
      zoom: 2, // Initial zoom level (show global view)
      zoomControl: true, // Show zoom controls
      attributionControl: true,
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

      // Automatically open birth location marker popup
      birthMarker.openPopup();
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

      // Bind city information popup
      cityMarker.bindPopup(`
        <div style="color: #1a1a2e; font-weight: 600; padding: 6px; min-width: 150px;">
          <div style="font-size: 14px; margin-bottom: 4px;">
            📍 ${city.name}
          </div>
          <div style="font-size: 11px; color: #666;">
            ${city.country}
          </div>
        </div>
      `);

      // Mouse hover effects
      cityMarker.on('mouseover', function() {
        this.setStyle({
          radius: 6,
          fillOpacity: 1,
        });
      });

      cityMarker.on('mouseout', function() {
        this.setStyle({
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

        // Bind popup information
        polyline.bindPopup(`
          <div style="color: #1a1a2e; font-weight: 600; padding: 8px; min-width: 180px;">
            <div style="font-size: 16px; margin-bottom: 6px; color: ${color};">
              ${PLANET_SYMBOLS[planet] || '•'} ${planet}
            </div>
            <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
              ${LINE_TYPE_LABELS[line.type] || line.type} Line
            </div>
            <div style="font-size: 11px; color: #999; margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
              Click anywhere on this line to explore how ${planet} influences this location.
            </div>
          </div>
        `);

        // Add mouse hover effects
        polyline.on('mouseover', function() {
          this.setStyle({
            weight: 4,
            opacity: 1
          });
        });

        polyline.on('mouseout', function() {
          this.setStyle({
            weight: 2.5,
            opacity: 0.85
          });
        });
      });
    });
  }, [planetLines, planetVisibility, planetGroups]);

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
                polyline.addTo(mapRef.current!);
              } else {
                mapRef.current!.removeLayer(polyline);
              }
            }
          }
        });
      }
      
      return newVisibility;
    });
  }, [planetLines]);

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
        const planet = lineId.split('-')[0];
        if (show) {
          if (!mapRef.current!.hasLayer(polyline)) {
            polyline.addTo(mapRef.current!);
          }
        } else {
          mapRef.current!.removeLayer(polyline);
        }
      });
    }
  }, [visiblePlanets]);

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
      
      {/* Planetary control panel */}
      {planetLines.length > 0 && (
        <div className={`absolute left-0 top-0 bottom-0 z-[1000] transition-transform duration-300 ${
          isPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full bg-black/90 backdrop-blur-md border-r border-white/20 shadow-2xl overflow-y-auto">
            <div className="p-4 space-y-4 min-w-[200px]">
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

              {/* Planet list */}
              <div className="space-y-2">
                {uniquePlanets.map((planet) => {
                  const line = planetLines.find(l => l.planet === planet);
                  const isVisible = planetVisibility[planet] ?? true;
                  
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
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-xs text-white/60 space-y-1">
                  <div><strong className="text-white/80">AS:</strong> Rising (Ascendant)</div>
                  <div><strong className="text-white/80">DS:</strong> Setting (Descendant)</div>
                  <div><strong className="text-white/80">MC:</strong> Midheaven</div>
                  <div><strong className="text-white/80">IC:</strong> Nadir</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel toggle button (shown when panel is closed) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="absolute left-4 top-4 z-[1000] bg-black/80 hover:bg-black backdrop-blur-md text-white p-2 rounded-md shadow-lg transition-colors"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </button>
      )}
    </div>
  );
}
