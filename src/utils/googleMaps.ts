import { Loader } from "@googlemaps/js-api-loader";

/* 1. API 키 ---------------------------------------------------- */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.warn("◻︎  .env 에 VITE_GOOGLE_MAPS_API_KEY 를 넣어주세요.");
}

/* 2. Google Maps 로더 (안정판 weekly + 필수 라이브러리 지정) ---- */
let mapsPromise: Promise<typeof google.maps> | null = null;
export function loadGoogleMaps() {
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Loader({
    apiKey: API_KEY,
    version: "weekly",
    libraries: ["routes", "geometry"]   // ← Directions & polyline decoder
  }).load();

  return mapsPromise;
}

/* 3. Directions + geometry.decodePath 래퍼 --------------------- */
export async function calculateRoute(
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  waypoints: google.maps.LatLngLiteral[] = []
) {
  const gmaps = await loadGoogleMaps();

  /* 3-a. DirectionsService는 즉시 사용 가능 */
  const dirSvc = new gmaps.DirectionsService();

  const res = await dirSvc.route({
    origin,
    destination,
    waypoints: waypoints.map((w) => ({ location: w, stopover: true })),
    optimizeWaypoints: true,
    travelMode: gmaps.TravelMode.DRIVING
  });

  /* 3-b. polyline 디코더 */
  const decode = (poly: string) =>
    gmaps.geometry.encoding.decodePath(poly);

  return { res, decode };
}
