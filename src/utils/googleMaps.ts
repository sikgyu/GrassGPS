import { Loader } from "@googlemaps/js-api-loader";

/* 1. API 키 ---------------------------------------------------- */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.warn("◻︎  .env 에 VITE_GOOGLE_MAPS_API_KEY 를 넣어주세요.");
}

/* 2. Google Maps 로더 (안정판 weekly + 필수 라이브러리 지정) ---- */
let mapsPromise: Promise<typeof google.maps> | null = null;
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Loader({
    apiKey: API_KEY,
    version: "weekly",
    libraries: ["routes", "geometry"], // Directions & polyline decoder
  })
    .load()
    .then(() => window.google.maps);

  return mapsPromise;
}

/* 3. Directions + geometry.decodePath 래퍼 --------------------- */
type TrafficModel = "bestguess" | "pessimistic" | "optimistic";

interface RouteOptions {
  /** `"bestguess" | "pessimistic" | "optimistic"` (허용)  
   *  `"best_guess"` 같은 형태도 자동 변환 */
  trafficModel?: TrafficModel | "best_guess";
}

export async function calculateRoute(
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  waypoints: google.maps.LatLngLiteral[] = [],
  options?: { trafficModel?: string }
) {
  /* 3-a. Google Maps 객체 로드 */
  const gmaps = await loadGoogleMaps();
  const dirSvc = new gmaps.DirectionsService();

  /* 3-b. trafficModel 정규화 ---------------------------------- */
  let trafficModel: TrafficModel | undefined;
  if (options?.trafficModel) {
    // "best_guess"  → "bestguess"  로 변환
    const normalised = options.trafficModel.toLowerCase().replace(/_/g, "") as TrafficModel;

    if (["bestguess", "pessimistic", "optimistic"].includes(normalised)) {
      trafficModel = normalised;
    } else {
      console.warn(
        `⚠️  Unsupported trafficModel "${options.trafficModel}" – 기본 값으로 진행합니다.`
      );
    }
  }

  /* 3-c. Directions 요청 -------------------------------------- */
  const res = await dirSvc.route({
    origin,
    destination,
    waypoints: waypoints.map((w) => ({ location: w, stopover: true })),
    optimizeWaypoints: true,
    travelMode: gmaps.TravelMode.DRIVING,
    drivingOptions: trafficModel
      ? {
          departureTime: new Date(Date.now() + 60 * 1000), // 1분 뒤 미래로 설정
          trafficModel: trafficModel as any,
        }
      : undefined,
  });

  /* 3-d. polyline 디코더 -------------------------------------- */
  const decode = (poly: string) => gmaps.geometry.encoding.decodePath(poly);

  return { res, decode };
}
