import { Loader } from "@googlemaps/js-api-loader";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
if (!API_KEY) console.warn(".env 에 VITE_GOOGLE_MAPS_API_KEY 설정 필요");

let mapsPromise: Promise<typeof google.maps> | null = null;
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Loader({
    apiKey: API_KEY,
    version: "weekly",
    libraries: ["routes", "geometry"],
  })
    .load()
    .then(() => window.google.maps);
  return mapsPromise;
}

export async function calculateRoute(
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  waypoints: google.maps.LatLngLiteral[] = [],
  options?: { trafficModel?: string; optimizeWaypoints?: boolean }
) {
  const gmaps = await loadGoogleMaps();
  const dirSvc = new gmaps.DirectionsService();

  const tm = options?.trafficModel
    ?.toLowerCase()
    .replace(/_/g, "") as
    | "bestguess"
    | "pessimistic"
    | "optimistic";

  const res = await dirSvc.route({
    origin,
    destination,
    waypoints: waypoints.map((w) => ({ location: w, stopover: true })),
    optimizeWaypoints: Boolean(options?.optimizeWaypoints),
    travelMode: gmaps.TravelMode.DRIVING,
    drivingOptions: tm
      ? { departureTime: new Date(), trafficModel: tm as any }
      : undefined,
  });

  return {
    res,
    decode: (poly: string) => gmaps.geometry.encoding.decodePath(poly),
  };
}
