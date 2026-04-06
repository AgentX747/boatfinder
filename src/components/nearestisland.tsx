import { useEffect, useRef, useState, useMemo } from "react";

const MAPBOX_KEY = "pk.eyJ1IjoibWFkYXJhYWhyIiwiYSI6ImNtbmxjNmgycDFhczIycXBrdXZzZHZ6MTMifQ.jTbYTdU4_ia4-bMG6ET1_A";

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const PORTS: Location[] = [
  { id: "marigondon", name: "Marigondon Port (Mar Beach)", lat: 10.2845, lng: 124.0016 },
  { id: "hilton", name: "Hilton / Punta Engaño Pier", lat: 10.311, lng: 124.0248 },
  { id: "angasil", name: "Angasil Port (Sta. Rosa Ferry)", lat: 10.3103, lng: 123.9494 },
];

const ISLANDS: Location[] = [
  { id: "panganaan", name: "Pangan-an Island", lat: 10.2287, lng: 124.0122 },
  { id: "olango", name: "Olango Island", lat: 10.2325, lng: 124.0318 },
  { id: "gilutongan", name: "Gilutongan Island", lat: 10.2065, lng: 123.9891 },
  { id: "nalusuan", name: "Nalusuan Island", lat: 10.1877, lng: 124.0003 },
  { id: "caohagan", name: "Caohagan Island", lat: 10.2732, lng: 124.0336 },
  { id: "sulpa", name: "Sulpa Island", lat: 10.2398, lng: 124.0009 },
  { id: "pandanon", name: "Pandanon Island", lat: 10.2169, lng: 124.1687 },
  { id: "camotes", name: "Camotes Island (Consuelo)", lat: 10.6508, lng: 124.3484 },
  { id: "getafe", name: "Getafe Port (Bohol)", lat: 10.1727, lng: 124.3580 },
  { id: "kawhagan", name: "Kawhagan Island", lat: 10.251, lng: 124.02 },
];

const ALL_LOCATIONS: Location[] = [...PORTS, ...ISLANDS];

// Returns km between two lat/lng points
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns closest point on segment A→B to P
function closestPointOnSegment(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): { lat: number; lng: number } {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { lat: aLat, lng: aLng };
  let t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { lat: aLat + t * dy, lng: aLng + t * dx };
}

// Distance from point to segment
function pointToSegmentDist(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const closest = closestPointOnSegment(pLat, pLng, aLat, aLng, bLat, bLng);
  return haversine(pLat, pLng, closest.lat, closest.lng);
}

export default function NearestIslandRecommendation() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [depId, setDepId] = useState(PORTS[0].id);
  const [arrId, setArrId] = useState(ISLANDS[0].id);
  const [mapLoaded, setMapLoaded] = useState(false);

  const dep = useMemo(() => PORTS.find((p) => p.id === depId)!, [depId]);
  const arr = useMemo(() => ALL_LOCATIONS.find((p) => p.id === arrId)!, [arrId]);

  const routeDist = useMemo(() => haversine(dep.lat, dep.lng, arr.lat, arr.lng), [dep, arr]);
  const travelMins = useMemo(() => Math.round((routeDist / 12) * 60), [routeDist]);

  const candidates = useMemo(() => {
    return ALL_LOCATIONS
      .filter((p) => p.id !== depId && p.id !== arrId)
      .map((p) => ({
        ...p,
        dist: pointToSegmentDist(p.lat, p.lng, dep.lat, dep.lng, arr.lat, arr.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);
  }, [dep, arr, depId, arrId]);

  // Load Mapbox GL JS dynamically (only once)
  useEffect(() => {
    if ((window as any).mapboxgl) {
      initMap();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  function initMap() {
    if (!mapContainer.current || mapRef.current) return;
    const mapboxgl = (window as any).mapboxgl;
    mapboxgl.accessToken = MAPBOX_KEY;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [124.05, 10.28],
      zoom: 10,
    });
    mapRef.current = map;
    map.on("load", () => setMapLoaded(true));
  }

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    
    // Additional check to ensure map style is loaded
    const map = mapRef.current;
    if (map.isStyleLoaded && !map.isStyleLoaded()) {
      // Wait for style to load before rendering
      map.once('styledata', () => {
        renderRoute();
      });
    } else {
      renderRoute();
    }
  }, [mapLoaded, dep, arr, candidates]);

  function clearMarkers() {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }

  function renderRoute() {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded || !map.isStyleLoaded()) return;
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    clearMarkers();

    // Remove old layers/sources safely
    try {
      ["route-line", "nearest-line"].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      ["route-src", "nearest-src"].forEach((id) => {
        if (map.getSource(id)) map.removeSource(id);
      });
    } catch (e) {
      console.warn("Error removing layers/sources:", e);
    }

    // Route line
    map.addSource("route-src", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [[dep.lng, dep.lat], [arr.lng, arr.lat]],
        },
      },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route-src",
      paint: { "line-color": "#1D6FE8", "line-width": 3, "line-dasharray": [2, 1.5] },
    });

    // Dashed line to nearest island
    if (candidates.length > 0) {
      const nearest = candidates[0];
      const midLng = (dep.lng + arr.lng) / 2;
      const midLat = (dep.lat + arr.lat) / 2;

      map.addSource("nearest-src", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [midLng, midLat],
              [nearest.lng, nearest.lat],
            ],
          },
        },
      });
      map.addLayer({
        id: "nearest-line",
        type: "line",
        source: "nearest-src",
        paint: { "line-color": "#E85B1D", "line-width": 2, "line-dasharray": [3, 2] },
      });
    }

    // Markers
    function createMarker(el: HTMLElement, lng: number, lat: number, anchor: any = "bottom") {
      markersRef.current.push(new mapboxgl.Marker({ element: el, anchor }).setLngLat([lng, lat]).addTo(map));
    }

    // Departure
    const depEl = document.createElement("div");
    depEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#1D6FE8;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(29,111,232,.4);margin-bottom:4px">
          ${dep.name.split("(")[0].trim()}
        </div>
        <div style="width:14px;height:14px;border-radius:50%;background:#1D6FE8;border:2.5px solid #fff;box-shadow:0 0 0 2px #1D6FE8"></div>
      </div>`;
    createMarker(depEl, dep.lng, dep.lat);

    // Arrival
    const arrEl = document.createElement("div");
    arrEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#16A34A;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(22,163,74,.4);margin-bottom:4px">
          ${arr.name}
        </div>
        <div style="width:14px;height:14px;border-radius:50%;background:#16A34A;border:2.5px solid #fff;box-shadow:0 0 0 2px #16A34A"></div>
      </div>`;
    createMarker(arrEl, arr.lng, arr.lat);

    // Candidate islands
    candidates.forEach((isl, i) => {
      const isNearest = i === 0;
      const el = document.createElement("div");
      el.innerHTML = isNearest
        ? `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="background:#E85B1D;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(232,91,29,.5);margin-bottom:4px">
              ⚓ ${isl.name}
            </div>
            <div style="width:16px;height:16px;border-radius:50%;background:#E85B1D;border:3px solid #fff;box-shadow:0 0 0 3px #E85B1D,0 0 12px rgba(232,91,29,.6)"></div>
          </div>`
        : `<div style="width:10px;height:10px;border-radius:50%;background:#94A3B8;border:2px solid #fff"></div>`;
      createMarker(el, isl.lng, isl.lat, isNearest ? "bottom" : "center");
    });

    // Fit bounds safely with proper validation
    try {
      // Validate coordinates first
      if (!dep?.lng || !dep?.lat || !arr?.lng || !arr?.lat) {
        console.warn("Invalid coordinates for bounds");
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([dep.lng, dep.lat]);
      bounds.extend([arr.lng, arr.lat]);
      
      candidates.forEach((c) => {
        if (c?.lng && c?.lat) {
          bounds.extend([c.lng, c.lat]);
        }
      });
      
      map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 800 });
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }

  const arrOptions = ALL_LOCATIONS.filter((l) => l.id !== depId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Nearest Island Recommendation</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Select a departure port and arrival destination to find the nearest emergency stop along your route
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Selectors + legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Departure Port
              </label>
              <select
                value={depId}
                onChange={(e) => {
                  setDepId(e.target.value);
                  const newArr = ALL_LOCATIONS.find((l) => l.id !== e.target.value);
                  if (newArr) setArrId(newArr.id);
                }}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500 transition-colors text-sm"
              >
                {PORTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Arrival Island / Port
              </label>
              <select
                value={arrId}
                onChange={(e) => setArrId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-green-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-green-500 transition-colors text-sm"
              >
                {arrOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-600 ring-offset-1" />
              <span className="text-xs text-slate-500 font-medium">Departure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600 ring-2 ring-green-600 ring-offset-1" />
              <span className="text-xs text-slate-500 font-medium">Arrival</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-500 ring-offset-1" />
              <span className="text-xs text-slate-500 font-medium">Nearest stop (recommended)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Other islands</span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div
          ref={mapContainer}
          className="w-full rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          style={{ height: 420 }}
        />

        {/* Route stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Route Info</p>
          <div className="flex flex-wrap gap-8">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Distance</span>
              <span className="text-sm font-semibold text-slate-800">{routeDist.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Est. travel time</span>
              <span className="text-sm font-semibold text-slate-800">{travelMins} min</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Average speed</span>
              <span className="text-sm font-semibold text-slate-800">12 knots</span>
            </div>
          </div>
        </div>

        {/* Ranked island list */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Nearest Islands Along Route
          </p>
          <div className="space-y-3">
            {candidates.map((isl, i) => (
              <div
                key={isl.id}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                  i === 0
                    ? "bg-orange-50 border-orange-300 shadow-sm"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className={`text-sm font-bold min-w-[28px] text-center ${i === 0 ? "text-orange-600" : "text-slate-400"}`}>
                  #{i + 1}
                </span>
                <span className={`flex-1 text-sm font-semibold ${i === 0 ? "text-orange-800" : "text-slate-700"}`}>
                  {isl.name}
                </span>
                {i === 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500 text-white">
                    Recommended
                  </span>
                )}
                <span className={`text-xs font-medium ${i === 0 ? "text-orange-600" : "text-slate-400"}`}>
                  {isl.dist.toFixed(2)} km off-route
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}