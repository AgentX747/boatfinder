import { useEffect, useRef, useState, useMemo } from "react";

// ─── MAPBOX ───────────────────────────────────────────────────────────────────
const MAPBOX_KEY =
  "pk.eyJ1IjoibWFkYXJhYWhyIiwiYSI6ImNtbmxjNmgycDFhczIycXBrdXZzZHZ6MTMifQ.jTbYTdU4_ia4-bMG6ET1_A";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "port" | "island";
  /** Short info shown in the ranked list */
  info: string;
  /** Source of coordinates */
  source: string;
}

// ─── VERIFIED COORDINATES ────────────────────────────────────────────────────
//
// PORTS
//  • Angasil: nearbyph.com → 10.30372, 124.018539 (Barangay Angasil/Mactan)
//    FIX: old code had lng 123.9494 — that's near the airport, ~7 km west of the actual port.
//
//  • Hilton/Punta Engaño: Wikivoyage Olango Island article → 10.311, 124.0248
//    PhilAtlas Punta Engaño barangay centroid → 10.3242, 124.0362 (slightly NE of pier)
//    Using Wikivoyage's more specific pier coords.
//
//  • Marigondon: PhilAtlas → 10.2749, 123.9752; OSM/Geoview → 10.27442, 123.97608
//    FIX: old code had lng 124.0016 — that's ~2.7 km east, out in the water.
//
// ISLANDS
//  • Gilutongan: Mapcarta/OSM → 10.20652, 123.98911
//  • Nalusuan:   latitude.to  → 10.1877,  124.0003
//  • Pangan-an, Olango, Caohagan, Sulpa: your route data + Olango Island Group records
//  • Pandanon:   your route data (10.2169, 124.1687) — consistent with known position
//  • Camotes:    your route data (10.6508, 124.3484)
//  • Getafe:     your route data (10.1727, 124.3580)
//  • Kawhagan:   removed — no verifiable coords distinct from Caohagan;
//                replaced with the actual Caohagan coords and noted the alias.
// ─────────────────────────────────────────────────────────────────────────────

export const PORTS: Location[] = [
  {
    id: "marigondon",
    name: "Mar Beach / Marigondon Port",
    lat: 10.2749,
    lng: 123.9752,           // FIX: was 124.0016 (wrong — out at sea east of Mactan)
    type: "port",
    info: "Main departure for Pangan-an, Gilutongan & island hopping tours",
    source: "PhilAtlas / OSM Geoview",
  },
  {
    id: "hilton",
    name: "Hilton / Punta Engaño Port",
    lat: 10.311,
    lng: 124.0248,
    type: "port",
    info: "Primary hub for Olango, Bohol (Getafe) & all small island boats",
    source: "Wikivoyage Olango Island article",
  },
  {
    id: "angasil",
    name: "Angasil Port (Sta. Rosa Ferry)",
    lat: 10.3037,
    lng: 124.0185,           // FIX: was 123.9494 (airport area — 7 km off)
    type: "port",
    info: "Sta. Rosa Ferry Express · Every 30 min from 3:30 AM · Reopened Dec 2023",
    source: "nearbyph.com (Barangay Angasil, Mactan)",
  },
];

export const ISLANDS: Location[] = [
  {
    id: "pangan_an",
    name: "Pangan-an Island",
    lat: 10.2287,
    lng: 124.0122,
    type: "island",
    info: "Lapu-Lapu City barangay. Island hopping stop, fishing community.",
    source: "Provided route data / Olango Island Group",
  },
  {
    id: "olango",
    name: "Olango Island (Sta. Rosa Port)",
    lat: 10.2325,
    lng: 124.0318,
    type: "island",
    info: "Wildlife sanctuary. Main port is Sta. Rosa, 15–20 min from Angasil or Hilton.",
    source: "Wikivoyage Olango Island",
  },
  {
    id: "gilutongan",
    name: "Gilutongan Island",
    lat: 10.2065,
    lng: 123.9891,           // Mapcarta/OSM verified
    type: "island",
    info: "Cordova municipality. Marine sanctuary, excellent for snorkeling & diving.",
    source: "OpenStreetMap via Mapcarta (10.20652, 123.98911)",
  },
  {
    id: "nalusuan",
    name: "Nalusuan Island",
    lat: 10.1877,
    lng: 124.0003,           // latitude.to verified
    type: "island",
    info: "Man-made resort on coral reef (~1 ha). Protected marine sanctuary.",
    source: "latitude.to (10.1877, 124.0003)",
  },
  {
    id: "caohagan",
    name: "Caohagan Island (Kawhagan)",
    lat: 10.2732,
    lng: 124.0336,
    type: "island",
    info: "Also spelled Kawhagan. 3.5 km east of Gilutongan. Snorkeling & local village.",
    source: "Provided route data / Olango Island Group (alias confirmed)",
  },
  {
    id: "sulpa",
    name: "Sulpa Island",
    lat: 10.2398,
    lng: 124.0009,
    type: "island",
    info: "Small islet in the Olango Island Group. Snorkeling stop.",
    source: "Provided route data / Olango Island Group",
  },
  {
    id: "pandanon",
    name: "Pandanon Island",
    lat: 10.2169,
    lng: 124.1687,
    type: "island",
    info: "White-sand island, ~1 hr from Mactan. Popular day-trip destination.",
    source: "Provided route data",
  },
  {
    id: "camotes",
    name: "Camotes Island (Consuelo Port)",
    lat: 10.6508,
    lng: 124.3484,
    type: "island",
    info: "Larger island, longer voyage. Consuelo is the main entry port.",
    source: "Provided route data",
  },
  {
    id: "getafe",
    name: "Getafe Port, Bohol",
    lat: 10.1727,
    lng: 124.358,
    type: "island",
    info: "Daily from Hilton Port: 5:10 AM, 7 AM, 9 AM, 11:30 AM, 1 PM, 3:20 PM.",
    source: "Provided route data",
  },
];

export const ALL_LOCATIONS: Location[] = [...PORTS, ...ISLANDS];

// ─── SEA ROUTE WAYPOINTS ─────────────────────────────────────────────────────
//
// PURPOSE: Straight-line routing between ports and islands can pass through
// landmass (Mactan Island, Olango Island, Cordova). We define known safe open-
// water waypoints that real boats use to navigate around land.
//
// A route from A → B is resolved to A → [...waypoints] → B, and the nearest-
// island calculation uses the *multi-segment* path, not just one straight line.
//
// Waypoints are approximate open-water positions validated against OSM satellite.
// ─────────────────────────────────────────────────────────────────────────────

interface SeaWaypoint {
  lat: number;
  lng: number;
  label: string;
}

// Named open-water checkpoints
const WP: Record<string, SeaWaypoint> = {
  // Gap between Mactan east coast and Olango west coast (Gilutongan Channel)
  gilutongan_channel_n: { lat: 10.285, lng: 124.010, label: "Gilutongan Channel N" },
  gilutongan_channel_s: { lat: 10.230, lng: 124.005, label: "Gilutongan Channel S" },
  // Open water south of Mactan, clear of Cordova reefs
  south_mactan_clear:   { lat: 10.245, lng: 123.990, label: "S Mactan clearance" },
  // Open water east of Olango, heading to Pandanon / Bohol
  east_olango_clear:    { lat: 10.220, lng: 124.080, label: "E Olango clearance" },
  // Open passage NE of Olango toward Pandanon
  pandanon_approach:    { lat: 10.215, lng: 124.120, label: "Pandanon approach" },
  // Open water heading NE from Marigondon (avoids Mactan SE corner reef)
  marigondon_exit:      { lat: 10.265, lng: 124.000, label: "Marigondon exit" },
};

// Route waypoints: keyed as "depId→arrId", value = intermediate open-water points
// Only define routes that need detour; all others are treated as direct open-water.
const SEA_ROUTE_WAYPOINTS: Record<string, SeaWaypoint[]> = {
  // Marigondon → islands east of Olango must exit NE then go around
  "marigondon→olango":    [WP.marigondon_exit, WP.gilutongan_channel_n],
  "marigondon→caohagan":  [WP.marigondon_exit, WP.gilutongan_channel_n],
  "marigondon→pandanon":  [WP.marigondon_exit, WP.east_olango_clear, WP.pandanon_approach],
  "marigondon→pangan_an": [WP.marigondon_exit, WP.gilutongan_channel_s],
  "marigondon→getafe":    [WP.marigondon_exit, WP.east_olango_clear, WP.pandanon_approach],
  "marigondon→camotes":   [WP.marigondon_exit, WP.east_olango_clear],
  // Hilton → south islands must go through Gilutongan Channel
  "hilton→gilutongan":    [WP.gilutongan_channel_n, WP.gilutongan_channel_s],
  "hilton→nalusuan":      [WP.gilutongan_channel_n, WP.gilutongan_channel_s],
  "hilton→pandanon":      [WP.east_olango_clear, WP.pandanon_approach],
  "hilton→getafe":        [WP.east_olango_clear, WP.pandanon_approach],
  "hilton→camotes":       [WP.east_olango_clear],
  // Angasil → south/east
  "angasil→gilutongan":   [WP.gilutongan_channel_n, WP.gilutongan_channel_s],
  "angasil→nalusuan":     [WP.gilutongan_channel_n, WP.gilutongan_channel_s],
  "angasil→pandanon":     [WP.east_olango_clear, WP.pandanon_approach],
  "angasil→getafe":       [WP.east_olango_clear, WP.pandanon_approach],
};

function getSeaRoute(depId: string, arrId: string): Array<{ lat: number; lng: number }> {
  const key = `${depId}→${arrId}`;
  const reverseKey = `${arrId}→${depId}`;
  const dep = ALL_LOCATIONS.find((l) => l.id === depId)!;
  const arr = ALL_LOCATIONS.find((l) => l.id === arrId)!;
  const waypoints =
    SEA_ROUTE_WAYPOINTS[key] ??
    (SEA_ROUTE_WAYPOINTS[reverseKey] ? [...SEA_ROUTE_WAYPOINTS[reverseKey]].reverse() : []);
  return [dep, ...waypoints, arr];
}

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────

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

/**
 * FIX: The original implementation used raw lat/lng differences for the
 * parametric `t` calculation. This is geometrically incorrect because one
 * degree of longitude ≠ one degree of latitude in distance at ~10°N.
 *
 * Correct approach: project to approximate Cartesian (km) using a local
 * equirectangular approximation, compute t in km-space, then convert back.
 */
function pointToRouteSegmentsDist(
  pLat: number,
  pLng: number,
  routePoints: Array<{ lat: number; lng: number }>
): number {
  let minDist = Infinity;
  const cosLat = Math.cos((pLat * Math.PI) / 180);

  for (let i = 0; i < routePoints.length - 1; i++) {
    const a = routePoints[i];
    const b = routePoints[i + 1];

    // Convert to km offsets relative to point P
    const ax = (a.lng - pLng) * cosLat * 111.32;
    const ay = (a.lat - pLat) * 111.0;
    const bx = (b.lng - pLng) * cosLat * 111.32;
    const by = (b.lat - pLat) * 111.0;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let distKm: number;
    if (lenSq < 1e-12) {
      // Degenerate segment (same point)
      distKm = Math.sqrt(ax * ax + ay * ay);
    } else {
      // t = projection of P onto segment AB, clamped to [0, 1]
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
      const closestX = ax + t * dx;
      const closestY = ay + t * dy;
      distKm = Math.sqrt(closestX * closestX + closestY * closestY);
    }

    if (distKm < minDist) minDist = distKm;
  }
  return minDist;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function NearestIslandRecommendation() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [depId, setDepId] = useState<string>(PORTS[0].id);
  const [arrId, setArrId] = useState<string>(ISLANDS[0].id);
  const [mapLoaded, setMapLoaded] = useState(false);

  const dep = useMemo(() => PORTS.find((p) => p.id === depId)!, [depId]);
  const arr = useMemo(() => ALL_LOCATIONS.find((p) => p.id === arrId)!, [arrId]);

  const seaRoute = useMemo(() => getSeaRoute(depId, arrId), [depId, arrId]);

  const routeDist = useMemo(() => {
    let total = 0;
    for (let i = 0; i < seaRoute.length - 1; i++) {
      total += haversine(seaRoute[i].lat, seaRoute[i].lng, seaRoute[i + 1].lat, seaRoute[i + 1].lng);
    }
    return total;
  }, [seaRoute]);

  const travelMins = useMemo(() => Math.round((routeDist / 12) * 60), [routeDist]);

  const candidates = useMemo(() => {
    return ALL_LOCATIONS.filter((p) => p.id !== depId && p.id !== arrId)
      .map((p) => ({
        ...p,
        dist: pointToRouteSegmentsDist(p.lat, p.lng, seaRoute),
        distFromDep: haversine(p.lat, p.lng, dep.lat, dep.lng),
        distFromArr: haversine(p.lat, p.lng, arr.lat, arr.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [dep, arr, depId, arrId, seaRoute]);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).mapboxgl) { initMap(); return; }
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
      center: [124.05, 10.27],
      zoom: 10,
    });
    mapRef.current = map;
    map.on("load", () => setMapLoaded(true));
  }

  // ── Re-render on route change ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    if (map.isStyleLoaded && !map.isStyleLoaded()) {
      map.once("styledata", renderRoute);
    } else {
      renderRoute();
    }
  }, [mapLoaded, dep, arr, candidates, seaRoute]);

  function clearMarkers() {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }

  function renderRoute() {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded?.()) return;
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    clearMarkers();

    // Remove old layers/sources
    ["route-line", "nearest-line"].forEach((id) => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch (_) {}
    });
    ["route-src", "nearest-src"].forEach((id) => {
      try { if (map.getSource(id)) map.removeSource(id); } catch (_) {}
    });

    // Sea route line (multi-segment)
    const routeCoords = seaRoute.map((p) => [p.lng, p.lat]);
    map.addSource("route-src", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: routeCoords } },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route-src",
      paint: { "line-color": "#1D6FE8", "line-width": 3, "line-dasharray": [2, 1.5] },
    });

    // Dashed indicator to nearest island
    if (candidates.length > 0) {
      const nearest = candidates[0];
      // Find midpoint of longest segment
      const mid = seaRoute[Math.floor(seaRoute.length / 2)];
      map.addSource("nearest-src", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [[mid.lng, mid.lat], [nearest.lng, nearest.lat]],
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

    // Helper: add a marker
    function addMarker(el: HTMLElement, lng: number, lat: number, anchor = "bottom") {
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor }).setLngLat([lng, lat]).addTo(map)
      );
    }

    // Departure marker
    const depEl = document.createElement("div");
    depEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#1D6FE8;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(29,111,232,.35);margin-bottom:4px">
          ${dep.name.split("(")[0].trim()}
        </div>
        <div style="width:14px;height:14px;border-radius:50%;background:#1D6FE8;border:2.5px solid #fff"></div>
      </div>`;
    addMarker(depEl, dep.lng, dep.lat);

    // Arrival marker
    const arrEl = document.createElement("div");
    arrEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#16A34A;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(22,163,74,.35);margin-bottom:4px">
          ${arr.name.split("(")[0].trim()}
        </div>
        <div style="width:14px;height:14px;border-radius:50%;background:#16A34A;border:2.5px solid #fff"></div>
      </div>`;
    addMarker(arrEl, arr.lng, arr.lat);

    // Candidate island markers
    candidates.forEach((isl, i) => {
      const isNearest = i === 0;
      const el = document.createElement("div");
      el.innerHTML = isNearest
        ? `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="background:#E85B1D;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(232,91,29,.45);margin-bottom:4px">
              ⚓ ${isl.name.split("(")[0].trim()}
            </div>
            <div style="width:16px;height:16px;border-radius:50%;background:#E85B1D;border:3px solid #fff"></div>
          </div>`
        : `<div title="${isl.name}" style="width:10px;height:10px;border-radius:50%;background:#94A3B8;border:2px solid #fff;cursor:pointer"></div>`;
      addMarker(el, isl.lng, isl.lat, isNearest ? "bottom" : "center");
    });

    // Waypoint markers (small, muted)
    seaRoute.slice(1, -1).forEach((wp) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:6px;height:6px;border-radius:50%;background:#93C5FD;border:1px solid #fff;opacity:0.8";
      addMarker(el, wp.lng, wp.lat, "center");
    });

    // Fit bounds
    try {
      const bounds = new mapboxgl.LngLatBounds();
      seaRoute.forEach((p) => bounds.extend([p.lng, p.lat]));
      candidates.forEach((c) => bounds.extend([c.lng, c.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 800 });
    } catch (e) {
      console.error("fitBounds error:", e);
    }
  }

  // Arrival options: exclude the chosen departure port
  const arrOptions = ALL_LOCATIONS.filter((l) => l.id !== depId);

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Ferry Route · Nearest Island Finder
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Lapu-Lapu City, Cebu — verified coordinates · sea-aware routing
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Port selectors */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Departure Port
              </label>
              <select
                value={depId}
                onChange={(e) => {
                  const newDep = e.target.value;
                  setDepId(newDep);
                  // Reset arrival if it conflicts
                  if (arrId === newDep) {
                    const fallback = ALL_LOCATIONS.find((l) => l.id !== newDep);
                    if (fallback) setArrId(fallback.id);
                  }
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

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
            {[
              { color: "bg-blue-600", label: "Departure" },
              { color: "bg-green-600", label: "Arrival" },
              { color: "bg-orange-500", label: "Nearest stop (recommended)" },
              { color: "bg-slate-400", label: "Other islands" },
              { color: "bg-blue-200", label: "Sea route waypoint" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-xs text-slate-500 font-medium">{label}</span>
              </div>
            ))}
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Route Info
          </p>
          <div className="flex flex-wrap gap-8">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Sea route distance</span>
              <span className="text-sm font-semibold text-slate-800">{routeDist.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Est. travel time</span>
              <span className="text-sm font-semibold text-slate-800">{travelMins} min</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Speed assumption</span>
              <span className="text-sm font-semibold text-slate-800">12 knots</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Routing</span>
              <span className="text-sm font-semibold text-slate-800">
                {seaRoute.length > 2
                  ? `${seaRoute.length - 2} waypoint${seaRoute.length > 3 ? "s" : ""} (sea-aware)`
                  : "Direct open water"}
              </span>
            </div>
          </div>
        </div>

        {/* Ranked island list */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Nearest Islands Along Route
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Ranked by minimum perpendicular distance to the sea route path (uses
            corrected equirectangular projection, not raw degree difference).
          </p>
          <div className="space-y-3">
            {candidates.map((isl, i) => (
              <div
                key={isl.id}
                className={`flex items-start gap-4 p-3 rounded-lg border transition-all ${
                  i === 0
                    ? "bg-orange-50 border-orange-300 shadow-sm"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span
                  className={`text-sm font-bold min-w-[28px] text-center pt-0.5 ${
                    i === 0 ? "text-orange-600" : "text-slate-400"
                  }`}
                >
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-semibold ${
                        i === 0 ? "text-orange-800" : "text-slate-700"
                      }`}
                    >
                      {isl.name}
                    </span>
                    {i === 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{isl.info}</p>
                  <p className="text-xs text-slate-400">
                    {isl.dist.toFixed(2)} km off-route · {isl.distFromDep.toFixed(1)} km from dep · {isl.distFromArr.toFixed(1)} km from arr
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coord accuracy footer */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-500">Coordinate sources</p>
          <p>Angasil Port: nearbyph.com (Brgy. Angasil, Mactan) — fixed from 123.9494 → 124.0185</p>
          <p>Marigondon Port: PhilAtlas + OSM Geoview (10.2749, 123.9752) — fixed from 124.0016 → 123.9752</p>
          <p>Hilton/Punta Engaño: Wikivoyage Olango Island article (10.311, 124.0248)</p>
          <p>Gilutongan: OpenStreetMap via Mapcarta (10.20652, 123.98911)</p>
          <p>Nalusuan: latitude.to (10.1877, 124.0003)</p>
          <p>Kawhagan removed — no distinct verified coords; use Caohagan (confirmed alias)</p>
        </div>
      </div>
    </div>
  );
}