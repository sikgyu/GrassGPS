import { useEffect, useState } from "react";
import { Polyline, Popup, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { Place } from "../hooks/usePlaces";
import { calculateRoute } from "../utils/googleMaps";
import { useGeo } from "../hooks/useGeo";

interface RoutePolylineProps {
  places: Place[];
  optimizeTrigger: boolean;
  onOptimizeHandled: () => void;
}

interface RouteInfo {
  distance: string;
  duration: string;
  summary?: string;
  steps?: string[];
}

/**
 * Draws a driving route connecting given places using Google Directions API.
 * - Fits the Leaflet map to the resulting bounds.
 * - Shows distance / duration popup at mid‑route.
 */
export default function RoutePolyline({ places, optimizeTrigger, onOptimizeHandled }: RoutePolylineProps) {
  const map = useMap();
  const pos = useGeo();
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!optimizeTrigger) return;
    let alive = true;
    setShowPopup(false);

    // 현재 위치 + 경유지 1개 이상 필요
    if (!pos || places.length < 1) {
      setRouteCoords([]);
      setRouteInfo(null);
      onOptimizeHandled();
      return;
    }

    const origin = { lat: pos[0], lng: pos[1] };
    const destination = { lat: places[places.length - 1].lat, lng: places[places.length - 1].lon };
    const waypoints = places.slice(0, -1).map((p) => ({ lat: p.lat, lng: p.lon }));

    calculateRoute(origin, destination, waypoints, { trafficModel: 'best_guess' })
      .then(({ res }) => {
        if (!alive) return;

        const route = res.routes[0];
        const path = route.overview_path;
        const coords: [number, number][] = path.map((p: google.maps.LatLng) => [p.lat(), p.lng()]);
        setRouteCoords(coords);

        // 안내 정보
        const leg = route.legs[0];
        const summary = route.summary || '';
        const steps = leg?.steps?.map((step: any) => step.instructions.replace(/<[^>]+>/g, '')) || [];
        setRouteInfo({
          distance: leg?.distance?.text ?? "Unknown",
          duration: leg?.duration_in_traffic?.text ?? leg?.duration?.text ?? "Unknown",
          summary,
          steps
        });
        setShowPopup(true);

        // 지도 화면 자동 맞춤
        if (coords.length) {
          map.fitBounds(new LatLngBounds(coords.map((c) => [c[0], c[1]])), {
            padding: [40, 40]
          });
        }
        onOptimizeHandled();
      })
      .catch((err) => {
        if (!alive) return;
        console.error("Error calculating route:", err);
        setError(err.message || "경로 계산 오류");
        setRouteCoords([]);
        setRouteInfo(null);
        onOptimizeHandled();
      });

    return () => {
      alive = false;
    };
  }, [places, pos, map, optimizeTrigger, onOptimizeHandled]);

  if (error) return null;

  return (
    <>
      {routeCoords.length > 0 && <Polyline positions={routeCoords} />}
      {showPopup && routeInfo && routeCoords.length > 0 && (
        <Popup position={routeCoords[Math.floor(routeCoords.length / 2)]}>
          <div className="text-sm">
            <div>경로 요약: {routeInfo.summary}</div>
            <div>총 거리: {routeInfo.distance}</div>
            <div>예상 소요 시간(실시간): {routeInfo.duration}</div>
            {routeInfo.steps && routeInfo.steps.length > 0 && (
              <ul className="mt-2 list-disc pl-4">
                {routeInfo.steps.slice(0, 5).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
                {routeInfo.steps.length > 5 && <li>...</li>}
              </ul>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
