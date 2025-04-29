import { useEffect, useState } from "react";
import { Polyline, Popup, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { Place } from "../hooks/usePlaces";
import { calculateRoute } from "../utils/googleMaps";

interface RoutePolylineProps {
  places: Place[];
}

interface RouteInfo {
  distance: string;
  duration: string;
}

/**
 * Draws a driving route connecting given places using Google Directions API.
 * - Fits the Leaflet map to the resulting bounds.
 * - Shows distance / duration popup at mid‑route.
 */
export default function RoutePolyline({ places }: RoutePolylineProps) {
  const map = useMap();
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // 최소 2개 지점이 있어야 경로 계산
    if (places.length < 2) {
      setRouteCoords([]);
      setRouteInfo(null);
      return;
    }

    const origin = { lat: places[0].lat, lng: places[0].lon };
    const destination = {
      lat: places[places.length - 1].lat,
      lng: places[places.length - 1].lon
    };
    const waypoints = places.slice(1, -1).map((p) => ({ lat: p.lat, lng: p.lon }));

    calculateRoute(origin, destination, waypoints)
      .then(({ res, decode }) => {
        if (!alive) return;

        const route = res.routes[0];
        const path = (route as any).overview_path ?? decode(route.overview_polyline!.encodedPolyline);
        const coords: [number, number][] = path.map((p: google.maps.LatLng) => [p.lat(), p.lng()]);
        setRouteCoords(coords);

        // 거리 / 시간
        const leg = route.legs[0];
        setRouteInfo({
          distance: leg?.distance?.text ?? "Unknown",
          duration: leg?.duration?.text ?? "Unknown"
        });

        // 지도 화면 자동 맞춤
        if (coords.length) {
          map.fitBounds(new LatLngBounds(coords.map((c) => [c[0], c[1]])), {
            padding: [40, 40]
          });
        }
      })
      .catch((err) => {
        if (!alive) return;
        console.error("Error calculating route:", err);
        setError(err.message || "경로 계산 오류");
        setRouteCoords([]);
        setRouteInfo(null);
      });

    return () => {
      alive = false;
    };
  }, [places, map]);

  if (error) return null;

  return (
    <>
      {routeCoords.length > 0 && <Polyline positions={routeCoords} />}
      {routeInfo && routeCoords.length > 0 && (
        <Popup position={routeCoords[Math.floor(routeCoords.length / 2)]}>
          <div className="text-sm">
            <div>Distance: {routeInfo.distance}</div>
            <div>Duration: {routeInfo.duration}</div>
          </div>
        </Popup>
      )}
    </>
  );
}
