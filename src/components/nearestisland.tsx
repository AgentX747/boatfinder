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
  info: string;
  source: string;
}

// ─── COORDINATE AUDIT LOG ─────────────────────────────────────────────────────
//
// Every coordinate verified against authoritative sources in priority order:
//   1. PhilAtlas (Philippine Statistics Authority official data)
//   2. Wikidata citing US Geographic Names Server (GNS)
//   3. OpenStreetMap / Mapcarta / GeoNames (CC-BY-SA)
//   4. Wikivoyage (editorial review)
//   5. nearbyph.com / latitude.to (used only when above unavailable)
//
// PORTS
//  Marigondon   10.2749, 123.9752  PhilAtlas brgy + OSM 10.27442,123.97608
//               was 10.2845, 124.0016 — 2.7 km east, at sea
//  Hilton       10.3112, 124.0248  Wikivoyage Olango Island — confirmed
//  Angasil      10.3037, 124.0185  nearbyph.com Brgy.Angasil 10.303720,124.018539
//               was 10.3103, 123.9494 — 7 km west, near airport
//
// ISLANDS
//  Pangan-an    10.2208, 124.0398  PhilAtlas PSA — was 124.0122, fixed 3.2 km
//  Olango       10.2515, 124.0566  PhilAtlas Sabang brgy on Olango — was 10.2325, fixed 3.1 km
//  Gilutongan   10.2065, 123.9891  OSM way 64494667 — confirmed
//  Nalusuan     10.1877, 124.0003  latitude.to/Wikipedia — confirmed
//  Caohagan     10.2028, 124.0194  Wikidata Q11293940 / GNS -2420588: 10°12'10"N,124°1'10"E
//               was 10.2732, 124.0336 — 8+ km off! pointing to open water
//  Sulpa        10.2375, 124.0111  Wikidata Q31830998 / GNS -2454312: 10°14'15"N,124°0'40"E
//               was 10.2398, 124.0009 — 0.7 km off
//  Pandanon     10.17875,124.08154 OSM way 149850025 / GeoNames 1695503 / Wikidata Q31828038
//               was 10.2169, 124.1687 — 9 km off!
//  Camotes      10.6347, 124.3014  PhilAtlas PSA Consuelo brgy (Pacijan island)
//               was 10.6508, 124.3484 — 5 km off, wrong island
//  Getafe       10.1454, 124.1588  PhilAtlas Poblacion Getafe (port/town center)
//               was 10.1727, 124.358 — 22 km off!
// ─────────────────────────────────────────────────────────────────────────────

export const PORTS: Location[] = [
  {
    id: "marigondon",
    name: "Mar Beach / Marigondon Port",
    lat: 10.2749,
    lng: 123.9752,
    type: "port",
    info: "Main departure for Pangan-an, Gilutongan & island hopping tours.",
    source: "PhilAtlas PSA / OSM Geoview 10.27442, 123.97608",
  },
  {
    id: "hilton",
    name: "Hilton / Punta Engaño Port",
    lat: 10.3112,
    lng: 124.0248,
    type: "port",
    info: "Officially Punta Engaño Pier, beside Mövenpick Hotel. Hub for Olango, Bohol & all island boats.",
    source: "Wikivoyage Olango Island: '10.311, 124.0248'",
  },
  {
    id: "angasil",
    name: "Angasil Port (Sta. Rosa Ferry)",
    lat: 10.3037,
    lng: 124.0185,
    type: "port",
    info: "Sta. Rosa Ferry Express to Olango. Every 30 min, 3:30 AM onwards. Reopened Dec 2023.",
    source: "nearbyph.com Brgy. Angasil: 10.303720, 124.018539",
  },
];

export const ISLANDS: Location[] = [
  {
    id: "pangan_an",
    name: "Pangan-an Island",
    lat: 10.2208,
    lng: 124.0398,
    type: "island",
    info: "Lapu-Lapu City barangay. Island hopping stop, fishing community.",
    source: "PhilAtlas PSA (was 124.0122 — fixed 3.2 km)",
  },
  {
    id: "olango",
    name: "Olango Island (Sta. Rosa Port)",
    lat: 10.2515,
    lng: 124.0566,
    type: "island",
    info: "Wildlife sanctuary. Main port is Sta. Rosa, 15–20 min from Angasil or Hilton.",
    source: "PhilAtlas Sabang brgy on Olango (was 10.2325 — fixed 3.1 km)",
  },
  {
    id: "gilutongan",
    name: "Gilutongan Island",
    lat: 10.2065,
    lng: 123.9891,
    type: "island",
    info: "Cordova municipality. Marine sanctuary, excellent for snorkeling & diving.",
    source: "OpenStreetMap way 64494667 via Mapcarta — confirmed",
  },
  {
    id: "nalusuan",
    name: "Nalusuan Island",
    lat: 10.1877,
    lng: 124.0003,
    type: "island",
    info: "Man-made resort on coral reef (~1 ha). Protected marine sanctuary. Iconic long wooden bridge.",
    source: "latitude.to citing Wikipedia: 10°11'15.60\"N, 124°0'1.20\"E — confirmed",
  },
  {
    id: "caohagan",
    name: "Caohagan Island (Cawhagan)",
    lat: 10.2028,
    lng: 124.0194,
    type: "island",
    info: "Fishing village with white-sand beach, fresh seafood market, shell crafts. ~20 min from Marigondon.",
    source: "Wikidata Q11293940 / GNS -2420588: 10°12'10\"N,124°1'10\"E (was 10.2732 — fixed 8+ km!)",
  },
  {
    id: "sulpa",
    name: "Sulpa Islet",
    lat: 10.2375,
    lng: 124.0111,
    type: "island",
    info: "Smallest of the Olango Group islets. Crystal-clear water, snorkeling. Privately owned.",
    source: "Wikidata Q31830998 / GNS -2454312: 10°14'15\"N,124°0'40\"E",
  },
  {
    id: "pandanon",
    name: "Pandanon Island",
    lat: 10.17875,
    lng: 124.08154,
    type: "island",
    info: "White-sand sandbar island in the Danajon Bank, Getafe, Bohol. ~80 min from Mactan.",
    source: "OSM way 149850025 / GeoNames 1695503 / Wikidata Q31828038 (was 124.1687 — fixed 9 km!)",
  },
  {
    id: "camotes",
    name: "Camotes Island (Consuelo Port)",
    lat: 10.6347,
    lng: 124.3014,
    type: "island",
    info: "Consuelo is the main ferry dock on Pacijan Island, Camotes. ~2–3 hr voyage from Mactan.",
    source: "PhilAtlas PSA Consuelo brgy: '10.6347, 124.3014, island of Pacijan' (was 124.3484 — fixed 5 km)",
  },
  {
    id: "getafe",
    name: "Getafe Port, Bohol",
    lat: 10.1454,
    lng: 124.1588,
    type: "island",
    info: "Ferry from Hilton: 5:10 AM, 7 AM, 9 AM, 11:30 AM, 1 PM, 3:20 PM daily. N. Bohol coast.",
    source: "PhilAtlas Poblacion Getafe: '10.1454, 124.1588' — port/town center (was 124.358 — fixed 22 km!)",
  },
];

export const ALL_LOCATIONS: Location[] = [...PORTS, ...ISLANDS];

// ─── SEA ROUTE WAYPOINTS ─────────────────────────────────────────────────────
//
// Straight-line routing passes through land (Mactan, Olango, Cordova reefs).
// These named open-water checkpoints reflect actual bangka boat corridors.
//
// Sources:
//   • Hilutangan Channel: Wikipedia/Grokipedia — 10°13'–10°16'N, 124°02'–124°04'E
//   • Real tour itineraries: TravelMark, WanderEra, GetYourGuide, BradTours
//   • Olango Channel (east of Olango toward Pandanon/Bohol)
//
// Routes keyed as "depId→arrId". Reverse lookups auto-reverse waypoints.
// ─────────────────────────────────────────────────────────────────────────────

interface SeaWaypoint {
  lat: number;
  lng: number;
  label: string;
}

const WP: Record<string, SeaWaypoint> = {
  // Hilutangan Channel (between Mactan east coast & Olango west coast)
  // Channel: 10°13'–10°16'N, 124°02'–124°04'E (Wikipedia/Grokipedia)
  hch_n:   { lat: 10.300, lng: 124.028, label: "Hilutangan Ch. N entry" },
  hch_mid: { lat: 10.272, lng: 124.030, label: "Hilutangan Ch. centre" },
  hch_s:   { lat: 10.230, lng: 124.015, label: "Hilutangan Ch. S exit" },

  // Marigondon SE exit — avoids Mactan SE reef corner
  mar_exit: { lat: 10.262, lng: 124.002, label: "Marigondon SE exit" },

  // South clearance below Nalusuan / Cordova reefs
  cordova_clear: { lat: 10.195, lng: 124.005, label: "Cordova reef clearance" },

  // Olango Channel — open water east of Olango toward Pandanon / Bohol
  olango_e: { lat: 10.225, lng: 124.090, label: "Olango Channel E" },

  // Pandanon approach (Danajon Bank, north of sandbar island)
  pandanon_sw: { lat: 10.185, lng: 124.070, label: "Pandanon SW" },
  pandanon_n:  { lat: 10.190, lng: 124.082, label: "Pandanon N approach" },

  // Bohol Strait approach toward Getafe (NW Bohol coast)
  bohol_1: { lat: 10.190, lng: 124.110, label: "Bohol Strait W" },
  bohol_2: { lat: 10.165, lng: 124.140, label: "Bohol Strait mid" },

  // Camotes Sea — heading NE toward Pacijan / Consuelo
  cam_s:   { lat: 10.350, lng: 124.055, label: "Camotes Sea S" },
  cam_mid: { lat: 10.450, lng: 124.150, label: "Camotes Sea mid" },
  cam_n:   { lat: 10.560, lng: 124.250, label: "Camotes Sea N" },
};

const SEA_ROUTE_WAYPOINTS: Record<string, SeaWaypoint[]> = {
  // ── From Angasil ───────────────────────────────────────────────────────────
  "angasil→olango":     [WP.hch_n, WP.hch_mid],
  "angasil→pangan_an":  [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→gilutongan": [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→nalusuan":   [WP.hch_n, WP.hch_mid, WP.hch_s, WP.cordova_clear],
  "angasil→caohagan":   [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→sulpa":      [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→pandanon":   [WP.hch_n, WP.hch_mid, WP.olango_e, WP.pandanon_sw, WP.pandanon_n],
  "angasil→getafe":     [WP.hch_n, WP.hch_mid, WP.olango_e, WP.bohol_1, WP.bohol_2],
  "angasil→camotes":    [WP.hch_n, WP.cam_s, WP.cam_mid, WP.cam_n],

  // ── From Hilton / Punta Engaño ─────────────────────────────────────────────
  "hilton→olango":     [WP.hch_n, WP.hch_mid],
  "hilton→pangan_an":  [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→gilutongan": [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→nalusuan":   [WP.hch_n, WP.hch_mid, WP.hch_s, WP.cordova_clear],
  "hilton→caohagan":   [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→sulpa":      [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→pandanon":   [WP.hch_mid, WP.olango_e, WP.pandanon_sw, WP.pandanon_n],
  "hilton→getafe":     [WP.hch_mid, WP.olango_e, WP.bohol_1, WP.bohol_2],
  "hilton→camotes":    [WP.cam_s, WP.cam_mid, WP.cam_n],

  // ── From Marigondon ────────────────────────────────────────────────────────
  "marigondon→olango":     [WP.mar_exit, WP.hch_mid],
  "marigondon→pangan_an":  [WP.mar_exit, WP.hch_mid, WP.hch_s],
  "marigondon→gilutongan": [WP.mar_exit, WP.hch_s],
  "marigondon→nalusuan":   [WP.mar_exit, WP.hch_s, WP.cordova_clear],
  "marigondon→caohagan":   [WP.mar_exit, WP.hch_s],
  "marigondon→sulpa":      [WP.mar_exit, WP.hch_s],
  "marigondon→pandanon":   [WP.mar_exit, WP.hch_s, WP.olango_e, WP.pandanon_sw, WP.pandanon_n],
  "marigondon→getafe":     [WP.mar_exit, WP.hch_s, WP.olango_e, WP.bohol_1, WP.bohol_2],
  "marigondon→camotes":    [WP.mar_exit, WP.cam_s, WP.cam_mid, WP.cam_n],
};

function getSeaRoute(
  depId: string,
  arrId: string
): Array<{ lat: number; lng: number }> {
  const key = `${depId}→${arrId}`;
  const reverseKey = `${arrId}→${depId}`;
  const dep = ALL_LOCATIONS.find((l) => l.id === depId)!;
  const arr = ALL_LOCATIONS.find((l) => l.id === arrId)!;
  const waypoints =
    SEA_ROUTE_WAYPOINTS[key] ??
    (SEA_ROUTE_WAYPOINTS[reverseKey]
      ? [...SEA_ROUTE_WAYPOINTS[reverseKey]].reverse()
      : []);
  return [dep, ...waypoints, arr];
}

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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
 * Minimum distance (km) from point P to a multi-segment sea route.
 *
 * Uses equirectangular projection (cosLat-scaled) so that 1° longitude ≠ 1°
 * latitude in the parametric t calculation. At 10°N the error without scaling
 * is ~1.3%, enough to misrank islands 200–400 m apart on diagonal routes.
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

    // Project to km offsets centred on P
    const ax = (a.lng - pLng) * cosLat * 111.32;
    const ay = (a.lat - pLat) * 111.0;
    const bx = (b.lng - pLng) * cosLat * 111.32;
    const by = (b.lat - pLat) * 111.0;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let distKm: number;
    if (lenSq < 1e-12) {
      distKm = Math.sqrt(ax * ax + ay * ay);
    } else {
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
      const cx = ax + t * dx;
      const cy = ay + t * dy;
      distKm = Math.sqrt(cx * cx + cy * cy);
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
  const arr = useMemo(
    () => ALL_LOCATIONS.find((p) => p.id === arrId)!,
    [arrId]
  );

  const seaRoute = useMemo(
    () => getSeaRoute(depId, arrId),
    [depId, arrId]
  );

  const routeDist = useMemo(() => {
    let total = 0;
    for (let i = 0; i < seaRoute.length - 1; i++) {
      total += haversine(
        seaRoute[i].lat, seaRoute[i].lng,
        seaRoute[i + 1].lat, seaRoute[i + 1].lng
      );
    }
    return total;
  }, [seaRoute]);

  const travelMins = useMemo(
    () => Math.round((routeDist / 12) * 60),
    [routeDist]
  );

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

  // ── Map bootstrap ─────────────────────────────────────────────────────────
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

    ["route-line", "nearest-line"].forEach((id) => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch (_) {}
    });
    ["route-src", "nearest-src"].forEach((id) => {
      try { if (map.getSource(id)) map.removeSource(id); } catch (_) {}
    });

    // Blue dashed sea-route polyline
    map.addSource("route-src", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: seaRoute.map((p) => [p.lng, p.lat]),
        },
      },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route-src",
      paint: { "line-color": "#1D6FE8", "line-width": 3, "line-dasharray": [2, 1.5] },
    });

    // Orange dashed line to nearest island
    if (candidates.length > 0) {
      const nearest = candidates[0];
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

    function addMarker(el: HTMLElement, lng: number, lat: number, anchor = "bottom") {
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor }).setLngLat([lng, lat]).addTo(map)
      );
    }

    // Departure (blue)
    const depEl = document.createElement("div");
    depEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#1D6FE8;color:#fff;font-size:11px;font-weight:600;
                    padding:4px 8px;border-radius:6px;white-space:nowrap;
                    box-shadow:0 2px 8px rgba(29,111,232,.35);margin-bottom:4px">
          ${dep.name.split("(")[0].trim()}
        </div>
        <div style="width:14px;height:14px;border-radius:50%;
                    background:#1D6FE8;border:2.5px solid #fff"></div>
      </div>`;
    addMarker(depEl, dep.lng, dep.lat);

    // Arrival (green)
    const arrEl = document.createElement("div");
    arrEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#16A34A;color:#fff;font-size:11px;font-weight:600;
                    padding:4px 8px;border-radius:6px;white-space:nowrap;
                    box-shadow:0 2px 8px rgba(22,163,74,.35);margin-bottom:4px">
          ${arr.name.split("(")[0].trim()}
        </div>
        <div style="width:14px;height:14px;border-radius:50%;
                    background:#16A34A;border:2.5px solid #fff"></div>
      </div>`;
    addMarker(arrEl, arr.lng, arr.lat);

    // Candidate islands
    candidates.forEach((isl, i) => {
      const isNearest = i === 0;
      const el = document.createElement("div");
      el.innerHTML = isNearest
        ? `<div style="display:flex;flex-direction:column;align-items:center">
             <div style="background:#E85B1D;color:#fff;font-size:11px;font-weight:700;
                         padding:4px 10px;border-radius:6px;white-space:nowrap;
                         box-shadow:0 2px 8px rgba(232,91,29,.45);margin-bottom:4px">
               ⚓ ${isl.name.split("(")[0].trim()}
             </div>
             <div style="width:16px;height:16px;border-radius:50%;
                         background:#E85B1D;border:3px solid #fff"></div>
           </div>`
        : `<div title="${isl.name}"
               style="width:10px;height:10px;border-radius:50%;
                      background:#94A3B8;border:2px solid #fff;cursor:pointer"></div>`;
      addMarker(el, isl.lng, isl.lat, isNearest ? "bottom" : "center");
    });

    // Waypoint dots (small light blue)
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

  const arrOptions = ALL_LOCATIONS.filter((l) => l.id !== depId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Ferry Route · Nearest Island Finder
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Lapu-Lapu City, Cebu — fully verified coordinates · sea-aware routing
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Selectors */}
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
                  if (arrId === newDep) {
                    const fallback = ALL_LOCATIONS.find((l) => l.id !== newDep);
                    if (fallback) setArrId(fallback.id);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-blue-200 bg-white
                           text-slate-800 font-medium focus:outline-none focus:border-blue-500
                           transition-colors text-sm"
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
                className="w-full px-3 py-2.5 rounded-lg border-2 border-green-200 bg-white
                           text-slate-800 font-medium focus:outline-none focus:border-green-500
                           transition-colors text-sm"
              >
                {arrOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
            {[
              { color: "bg-blue-600",   label: "Departure port" },
              { color: "bg-green-600",  label: "Arrival" },
              { color: "bg-orange-500", label: "Nearest island (recommended)" },
              { color: "bg-slate-400",  label: "Other islands" },
              { color: "bg-blue-200",   label: "Sea-route waypoint" },
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
              <span className="text-xs text-slate-400 block mb-0.5">Routing mode</span>
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
            Ranked by perpendicular distance to the actual sea route path
            (equirectangular projection with cosLat scaling).
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
                    {isl.dist.toFixed(2)} km off-route ·{" "}
                    {isl.distFromDep.toFixed(1)} km from dep ·{" "}
                    {isl.distFromArr.toFixed(1)} km from arr
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coordinate audit footer */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-500">Coordinate sources &amp; corrections</p>
          <p>Marigondon Port · PhilAtlas/OSM → 10.2749, 123.9752 (was 124.0016 — fixed 2.7 km)</p>
          <p>Angasil Port · nearbyph.com → 10.3037, 124.0185 (was 123.9494 — fixed 7 km)</p>
          <p>Hilton/Punta Engaño · Wikivoyage → 10.3112, 124.0248 — confirmed</p>
          <p>Pangan-an · PhilAtlas PSA → 10.2208, 124.0398 (was 124.0122 — fixed 3.2 km)</p>
          <p>Olango · PhilAtlas Sabang brgy → 10.2515, 124.0566 (was 10.2325 — fixed 3.1 km)</p>
          <p>Gilutongan · OSM way 64494667 → 10.2065, 123.9891 — confirmed</p>
          <p>Nalusuan · latitude.to/Wikipedia → 10.1877, 124.0003 — confirmed</p>
          <p>Caohagan · Wikidata/GNS -2420588 → 10.2028, 124.0194 (was 10.2732 — fixed 8+ km!)</p>
          <p>Sulpa · Wikidata/GNS -2454312 → 10.2375, 124.0111 (was 124.0009 — fixed 0.7 km)</p>
          <p>Pandanon · OSM/GeoNames 1695503 → 10.17875, 124.08154 (was 124.1687 — fixed 9 km!)</p>
          <p>Camotes/Consuelo · PhilAtlas PSA → 10.6347, 124.3014 (was 124.3484 — fixed 5 km)</p>
          <p>Getafe Port · PhilAtlas Poblacion → 10.1454, 124.1588 (was 124.358 — fixed 22 km!)</p>
        </div>
      </div>
    </div>
  );
}