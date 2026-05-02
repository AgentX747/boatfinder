import { useEffect, useRef, useState, useMemo } from "react";
import {
  Anchor,
  Navigation,
  MapPin,
  Clock,
  Waves,
  Zap,
  ChevronRight,
  LifeBuoy,
} from "lucide-react";

// ─── MAPBOX ───────────────────────────────────────────────────────────────────
const MAPBOX_KEY =
  "pk.eyJ1IjoibWFkYXJhYWhyIiwiYSI6ImNtbmxjNmgycDFhczIycXBrdXZzZHZ6MTMifQ.jTbYTdU4_ia4-bMG6ET1_A";

// ─── ROUTE MAP ────────────────────────────────────────────────────────────────
// Maps departure port name → allowed arrival island names
const ROUTE_MAP: Record<string, string[]> = {
  "Mar Beach / Marigondon Port": ["Pangan-an Island", "Caohagan Island (Cawhagan)", "Olango Island (Sta. Rosa Port)"],
  "Hilton / Punta Engaño Port":  ["Olango Island (Sta. Rosa Port)"],
  "Angasil Port (Sta. Rosa Ferry)": ["Olango Island (Sta. Rosa Port)"],
};

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

// ─── DATA ─────────────────────────────────────────────────────────────────────
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
interface SeaWaypoint {
  lat: number;
  lng: number;
  label: string;
}

const WP: Record<string, SeaWaypoint> = {
  hch_n:         { lat: 10.300, lng: 124.028, label: "Hilutangan Ch. N entry" },
  hch_mid:       { lat: 10.272, lng: 124.030, label: "Hilutangan Ch. centre" },
  hch_s:         { lat: 10.230, lng: 124.015, label: "Hilutangan Ch. S exit" },
  mar_exit:      { lat: 10.262, lng: 124.002, label: "Marigondon SE exit" },
  cordova_clear: { lat: 10.195, lng: 124.005, label: "Cordova reef clearance" },
  olango_e:      { lat: 10.225, lng: 124.090, label: "Olango Channel E" },
  pandanon_sw:   { lat: 10.185, lng: 124.070, label: "Pandanon SW" },
  pandanon_n:    { lat: 10.190, lng: 124.082, label: "Pandanon N approach" },
  bohol_1:       { lat: 10.190, lng: 124.110, label: "Bohol Strait W" },
  bohol_2:       { lat: 10.165, lng: 124.140, label: "Bohol Strait mid" },
  cam_s:         { lat: 10.350, lng: 124.055, label: "Camotes Sea S" },
  cam_mid:       { lat: 10.450, lng: 124.150, label: "Camotes Sea mid" },
  cam_n:         { lat: 10.560, lng: 124.250, label: "Camotes Sea N" },
};

const SEA_ROUTE_WAYPOINTS: Record<string, SeaWaypoint[]> = {
  "angasil→olango":     [WP.hch_n, WP.hch_mid],
  "angasil→pangan_an":  [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→gilutongan": [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→nalusuan":   [WP.hch_n, WP.hch_mid, WP.hch_s, WP.cordova_clear],
  "angasil→caohagan":   [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→sulpa":      [WP.hch_n, WP.hch_mid, WP.hch_s],
  "angasil→pandanon":   [WP.hch_n, WP.hch_mid, WP.olango_e, WP.pandanon_sw, WP.pandanon_n],
  "angasil→getafe":     [WP.hch_n, WP.hch_mid, WP.olango_e, WP.bohol_1, WP.bohol_2],
  "angasil→camotes":    [WP.hch_n, WP.cam_s, WP.cam_mid, WP.cam_n],

  "hilton→olango":     [WP.hch_n, WP.hch_mid],
  "hilton→pangan_an":  [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→gilutongan": [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→nalusuan":   [WP.hch_n, WP.hch_mid, WP.hch_s, WP.cordova_clear],
  "hilton→caohagan":   [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→sulpa":      [WP.hch_n, WP.hch_mid, WP.hch_s],
  "hilton→pandanon":   [WP.hch_mid, WP.olango_e, WP.pandanon_sw, WP.pandanon_n],
  "hilton→getafe":     [WP.hch_mid, WP.olango_e, WP.bohol_1, WP.bohol_2],
  "hilton→camotes":    [WP.cam_s, WP.cam_mid, WP.cam_n],

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

// ─── RANK CONFIGS ─────────────────────────────────────────────────────────────
const RANK_CONFIG = [
  { badgeBg: "#fee2e2", badgeText: "#991b1b", border: "#fca5a5", activeBorder: "#ef4444", cardBg: "#fff5f5", label: "CLOSEST" },
  { badgeBg: "#fff7ed", badgeText: "#9a3412", border: "#fed7aa", activeBorder: "#f97316", cardBg: "#fffbf5", label: "2ND"     },
  { badgeBg: "#fefce8", badgeText: "#854d0e", border: "#fde68a", activeBorder: "#eab308", cardBg: "#fffef5", label: "3RD"     },
  { badgeBg: "#eff6ff", badgeText: "#1e40af", border: "#bfdbfe", activeBorder: "#3b82f6", cardBg: "#f8faff", label: "#4"      },
  { badgeBg: "#eff6ff", badgeText: "#1e40af", border: "#bfdbfe", activeBorder: "#3b82f6", cardBg: "#f8faff", label: "#5"      },
  { badgeBg: "#eff6ff", badgeText: "#1e40af", border: "#bfdbfe", activeBorder: "#3b82f6", cardBg: "#f8faff", label: "#6"      },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
/** Return the allowed arrival island names for a given departure port name */
function getAllowedArrivalNames(depName: string): string[] {
  return ROUTE_MAP[depName] ?? [];
}

/** Return island Location objects allowed for a departure port */
function getAllowedArrivals(dep: Location): Location[] {
  const allowed = getAllowedArrivalNames(dep.name);
  return ISLANDS.filter((isl) => allowed.includes(isl.name));
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function NearestIslandRecommendation() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [depId, setDepId] = useState<string>(PORTS[0].id);
  const [arrId, setArrId] = useState<string>("");
  const [mapLoaded, setMapLoaded] = useState(false);

  const dep = useMemo(() => PORTS.find((p) => p.id === depId)!, [depId]);

  // Arrivals restricted by ROUTE_MAP for the selected departure
  const allowedArrivals = useMemo(() => getAllowedArrivals(dep), [dep]);

  // Keep arrId in sync whenever dep changes — pick first allowed arrival
  useEffect(() => {
    if (allowedArrivals.length > 0) {
      const stillValid = allowedArrivals.some((a) => a.id === arrId);
      if (!stillValid) setArrId(allowedArrivals[0].id);
    } else {
      setArrId("");
    }
  }, [depId, allowedArrivals]);

  const arr = useMemo(
    () => ALL_LOCATIONS.find((p) => p.id === arrId) ?? allowedArrivals[0],
    [arrId, allowedArrivals]
  );

  const seaRoute = useMemo(
    () => (arr ? getSeaRoute(depId, arr.id) : []),
    [depId, arr]
  );

  const routeDist = useMemo(() => {
    let total = 0;
    for (let i = 0; i < seaRoute.length - 1; i++) {
      total += haversine(seaRoute[i].lat, seaRoute[i].lng, seaRoute[i + 1].lat, seaRoute[i + 1].lng);
    }
    return total;
  }, [seaRoute]);

  const travelMins = useMemo(() => Math.round((routeDist / 12) * 60), [routeDist]);

  const candidates = useMemo(() => {
    if (!arr || seaRoute.length < 2) return [];
    return ALL_LOCATIONS.filter((p) => p.id !== depId && p.id !== arr.id)
      .map((p) => ({
        ...p,
        dist: pointToRouteSegmentsDist(p.lat, p.lng, seaRoute),
        distFromDep: haversine(p.lat, p.lng, dep.lat, dep.lng),
        distFromArr: haversine(p.lat, p.lng, arr.lat, arr.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [dep, arr, depId, seaRoute]);

  // ── Map bootstrap ──────────────────────────────────────────────────────────
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
    if (!mapLoaded || !mapRef.current || !arr) return;
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
    if (!map || !map.isStyleLoaded?.() || !arr) return;
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    clearMarkers();

    const allLayerIds = ["route-line", ...Array.from({ length: 6 }, (_, i) => `nearest-line-${i}`)];
    const allSourceIds = ["route-src", ...Array.from({ length: 6 }, (_, i) => `nearest-src-${i}`)];
    allLayerIds.forEach((id) => { try { if (map.getLayer(id)) map.removeLayer(id); } catch (_) {} });
    allSourceIds.forEach((id) => { try { if (map.getSource(id)) map.removeSource(id); } catch (_) {} });

    map.addSource("route-src", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: seaRoute.map((p) => [p.lng, p.lat]) },
      },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route-src",
      paint: {
        "line-color": "#2563eb",
        "line-width": 3,
        "line-dasharray": [2, 1.5],
      },
    });

    const indicatorColors = ["#dc2626", "#ea580c", "#ca8a04"];
    candidates.slice(0, 3).forEach((nearest, i) => {
      const mid = seaRoute[Math.floor(seaRoute.length / 2)];
      const srcId = `nearest-src-${i}`;
      const layId = `nearest-line-${i}`;
      try { if (map.getLayer(layId)) map.removeLayer(layId); } catch (_) {}
      try { if (map.getSource(srcId)) map.removeSource(srcId); } catch (_) {}
      map.addSource(srcId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [[mid.lng, mid.lat], [nearest.lng, nearest.lat]] },
        },
      });
      map.addLayer({
        id: layId,
        type: "line",
        source: srcId,
        paint: {
          "line-color": indicatorColors[i],
          "line-width": i === 0 ? 2.5 : 1.5,
          "line-dasharray": [3, 2],
        },
      });
    });

    function addMarker(el: HTMLElement, lng: number, lat: number, anchor = "bottom") {
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor }).setLngLat([lng, lat]).addTo(map)
      );
    }

    // Departure marker
    const depEl = document.createElement("div");
    depEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:default">
        <div style="background:#1d4ed8;color:#fff;font-size:11px;font-weight:600;
                    padding:4px 9px;border-radius:6px;white-space:nowrap;
                    box-shadow:0 2px 6px rgba(37,99,235,.35);margin-bottom:4px">
          ⚓ ${dep.name.split("(")[0].trim()}
        </div>
        <div style="width:13px;height:13px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(37,99,235,.4)"></div>
      </div>`;
    addMarker(depEl, dep.lng, dep.lat);

    // Arrival marker
    const arrEl = document.createElement("div");
    arrEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:default">
        <div style="background:#16a34a;color:#fff;font-size:11px;font-weight:700;
                    padding:4px 9px;border-radius:6px;white-space:nowrap;
                    box-shadow:0 2px 6px rgba(0,0,0,.2);margin-bottom:4px">
          🟢 ${arr.name.split("(")[0].trim()}
        </div>
        <div style="width:14px;height:14px;border-radius:50%;
                    background:#16a34a;border:2.5px solid #fff;
                    box-shadow:0 1px 4px rgba(0,0,0,.2)"></div>
      </div>`;
    addMarker(arrEl, arr.lng, arr.lat);

    const top3Styles = [
      { bg: "#dc2626", text: "#fff", dot: "#dc2626", emoji: "🔴" },
      { bg: "#ea580c", text: "#fff", dot: "#ea580c", emoji: "🟠" },
      { bg: "#ca8a04", text: "#fff", dot: "#ca8a04", emoji: "🟡" },
    ];
    candidates.slice(0, 3).forEach((isl, i) => {
      const s = top3Styles[i];
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="background:${s.bg};color:${s.text};font-size:11px;font-weight:700;
                      padding:4px 9px;border-radius:6px;white-space:nowrap;
                      box-shadow:0 2px 6px rgba(0,0,0,.25);margin-bottom:4px">
            ${s.emoji} #${i + 1} ${isl.name.split("(")[0].trim()}
          </div>
          <div style="width:${i === 0 ? 14 : 11}px;height:${i === 0 ? 14 : 11}px;border-radius:50%;
                      background:${s.dot};border:2.5px solid #fff;
                      box-shadow:0 1px 4px rgba(0,0,0,.2)"></div>
        </div>`;
      // Clicking a candidate on the map only sets arrival if it is in the allowed list
      el.addEventListener("click", () => {
        if (allowedArrivals.some((a) => a.id === isl.id)) {
          setArrId(isl.id);
        }
      });
      addMarker(el, isl.lng, isl.lat);
    });

    candidates.slice(3, 6).forEach((isl) => {
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.title = isl.name;
      el.innerHTML = `<div style="width:9px;height:9px;border-radius:50%;background:#94a3b8;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.15)"></div>`;
      el.addEventListener("click", () => {
        if (allowedArrivals.some((a) => a.id === isl.id)) {
          setArrId(isl.id);
        }
      });
      addMarker(el, isl.lng, isl.lat, "center");
    });

    seaRoute.slice(1, -1).forEach((wp) => {
      const el = document.createElement("div");
      el.style.cssText = `width:5px;height:5px;border-radius:50%;background:#93c5fd;border:1px solid #fff;opacity:0.8`;
      addMarker(el, wp.lng, wp.lat, "center");
    });

    try {
      const bounds = new mapboxgl.LngLatBounds();
      seaRoute.forEach((p) => bounds.extend([p.lng, p.lat]));
      candidates.forEach((c) => bounds.extend([c.lng, c.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 800 });
    } catch (e) {
      console.error("fitBounds error:", e);
    }
  }

  const topLabel = (i: number) => {
    if (i === 0) return "CLOSEST";
    if (i === 1) return "2ND";
    if (i === 2) return "3RD";
    return `#${i + 1}`;
  };

  return (
    <div className="min-h-screen" style={{ background: "#f1f5f9" }}>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Anchor size={26} color="#2563eb" />
          <div>
            <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
              Ferry Route · Nearest Island Finder
            </h1>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: 1 }}>
              Lapu-Lapu City, Cebu — verified coordinates · sea-aware routing
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── SELECTORS ──────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* ── Departure ── */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#2563eb",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  marginBottom: 6,
                }}
              >
                <Navigation size={10} /> Departure Port
              </label>
              <select
                value={depId}
                onChange={(e) => setDepId(e.target.value)}
                style={{
                  width: "100%",
                  background: "#f8fafc",
                  color: "#1e3a5f",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: 7,
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {PORTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* ── Arrival — filtered by ROUTE_MAP ── */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#16a34a",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  marginBottom: 6,
                }}
              >
                <MapPin size={10} /> Arrival Island
              </label>
              <select
                value={arrId}
                onChange={(e) => setArrId(e.target.value)}
                disabled={allowedArrivals.length === 0}
                style={{
                  width: "100%",
                  background: "#f8fafc",
                  color: "#14532d",
                  border: "1.5px solid #bbf7d0",
                  borderRadius: 7,
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: allowedArrivals.length === 0 ? "not-allowed" : "pointer",
                  outline: "none",
                  opacity: allowedArrivals.length === 0 ? 0.5 : 1,
                }}
              >
                {allowedArrivals.length === 0 ? (
                  <option value="">No routes available</option>
                ) : (
                  allowedArrivals.map((isl) => (
                    <option key={isl.id} value={isl.id}>{isl.name}</option>
                  ))
                )}
              </select>

              {/* Route badge showing allowed count */}
              <div style={{ marginTop: 5, fontSize: "11px", color: "#94a3b8" }}>
                {allowedArrivals.length} route{allowedArrivals.length !== 1 ? "s" : ""} available from this port
              </div>
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            {[
              { color: "#2563eb", label: "Route line" },
              { color: "#2563eb", label: "Departure" },
              { color: "#16a34a", label: "Destination" },
              { color: "#dc2626", label: "Nearest (#1)" },
              { color: "#ea580c", label: "2nd closest" },
              { color: "#ca8a04", label: "3rd closest" },
              { color: "#94a3b8", label: "Other islands" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: "11px", color: "#64748b" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAP ────────────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div ref={mapContainer} style={{ width: "100%", height: 440 }} />
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(255,255,255,0.92)",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: "11px",
              color: "#2563eb",
              fontWeight: 600,
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            }}
          >
            Click island to select
          </div>
        </div>

        {/* ── STATS ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            {
              icon: <Waves size={14} color="#2563eb" />,
              label: "Sea route dist",
              val: `${routeDist.toFixed(1)} km`,
              accent: "#1d4ed8",
            },
            {
              icon: <Clock size={14} color="#16a34a" />,
              label: "Est. travel time",
              val: `${travelMins} min`,
              accent: "#15803d",
            },
            {
              icon: <Navigation size={14} color="#64748b" />,
              label: "Waypoints",
              val: `${seaRoute.length - 2}`,
              accent: "#334155",
            },
            {
              icon: <Zap size={14} color="#7c3aed" />,
              label: "Islands nearby",
              val: `${candidates.length}`,
              accent: "#6d28d9",
            },
          ].map(({ icon, label, val, accent }) => (
            <div
              key={label}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                {icon} {label}
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: accent }}>{val}</div>
            </div>
          ))}
        </div>

        {/* ── ISLAND LIST ────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              padding: "13px 16px",
              borderBottom: "1px solid #f1f5f9",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <LifeBuoy size={15} color="#2563eb" />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                Nearest islands along route — top 6
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: 1 }}>
                Ranked by perpendicular distance to sea route · top 3 shown on map with icons
              </div>
            </div>
          </div>

          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
            {candidates.map((isl, i) => {
              const rc = RANK_CONFIG[i] || RANK_CONFIG[5];
              const isTop3 = i < 3;
              const isSelectable = allowedArrivals.some((a) => a.id === isl.id);

              return (
                <div
                  key={isl.id}
                  onClick={() => { if (isSelectable) setArrId(isl.id); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 9,
                    border: `1px solid ${isTop3 ? rc.border : "#f1f5f9"}`,
                    background: isTop3 ? rc.cardBg : "#ffffff",
                    cursor: isSelectable ? "pointer" : "default",
                    opacity: isSelectable ? 1 : 0.6,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelectable) return;
                    (e.currentTarget as HTMLElement).style.borderColor = rc.activeBorder;
                    (e.currentTarget as HTMLElement).style.background = rc.cardBg;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = isTop3 ? rc.border : "#f1f5f9";
                    (e.currentTarget as HTMLElement).style.background = isTop3 ? rc.cardBg : "#ffffff";
                  }}
                >
                  {/* Rank badge */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: rc.badgeBg,
                      color: rc.badgeText,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 700,
                      flexShrink: 0,
                      letterSpacing: "0.03em",
                      border: `1px solid ${rc.border}`,
                    }}
                  >
                    {topLabel(i)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: isTop3 ? rc.badgeText : "#64748b" }}>
                        {isl.name}
                      </span>
                      {isTop3 && (
                        <span
                          style={{
                            background: rc.badgeBg,
                            color: rc.badgeText,
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: `1px solid ${rc.border}`,
                          }}
                        >
                          On map
                        </span>
                      )}
                      {isSelectable && (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          ✓ Routable
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>{isl.info}</p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: 1 }}>
                      {isl.dist.toFixed(2)} km off-route · {isl.distFromDep.toFixed(1)} km from dep · {isl.distFromArr.toFixed(1)} km from dest
                    </p>
                  </div>

                  {/* Distance */}
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: isTop3 ? rc.badgeText : "#94a3b8" }}>
                      {isl.dist.toFixed(1)} km
                    </div>
                    <div style={{ fontSize: "10px", color: "#cbd5e1" }}>off route</div>
                    {isSelectable && <ChevronRight size={15} color={isTop3 ? rc.activeBorder : "#cbd5e1"} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: "11px",
            color: "#94a3b8",
            lineHeight: 1.8,
          }}
        >
          <p style={{ color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
            Coordinate sources &amp; corrections
          </p>
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