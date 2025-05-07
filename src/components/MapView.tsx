import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePlaces, type Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import RoutePolyline from "./RoutePolyline";

const DEFAULT_CENTER = [49.25, -123.1] as [number, number];
const DEFAULT_ZOOM = 12;

function createNumberedIcon(index: number) {
  return L.divIcon({
    className: "custom-icon",
    html: `<div style='background:#1976d2;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;'>${index +
      1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

interface Props {
  optimizeTrigger: boolean;
  setOptimizeTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  onRouteInfo: (info: {
    summary: string;
    distance: string;
    duration: string;
    waypointOrder?: number[];
  }) => void;
  onOptimizeHandled: () => void;
}

export default function MapView({
  optimizeTrigger,
  setOptimizeTrigger,
  onRouteInfo,
  onOptimizeHandled,
}: Props) {
  const { places, routePlaces } = usePlaces();
  const pos = useGeo();
  const [posState, setPosState] = useState<[number, number] | undefined>(pos);
  const mapRef = useRef<L.Map | null>(null);

  /* 지오로케이션 */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setPosState([p.coords.latitude, p.coords.longitude]),
      (err) => console.error("Geolocation error:", err)
    );
  }, []);

  /* 최신 pos 반영 */
  useEffect(() => {
    if (pos) setPosState(pos);
  }, [pos]);

  /* Route 리스트(Place[]) */
  const routeList = useMemo(
    () =>
      routePlaces
        .map((id) => places.find((p) => p.id === id))
        .filter((p): p is Place => !!p),
    [places, routePlaces]
  );

  const handleRouteInfo = useCallback(
    (info: {
      summary: string;
      distance: string;
      duration: string;
      waypointOrder?: number[];
    }) => {
      onRouteInfo(info);
    },
    [onRouteInfo]
  );

  const handleOptimizeHandled = useCallback(() => {
    onOptimizeHandled();
  }, [onOptimizeHandled]);

  return (
    <div className="flex-1 relative">
      <MapContainer
        whenCreated={(map) => (mapRef.current = map)}
        center={posState ?? DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="absolute inset-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <RoutePolyline
          places={routeList}
          optimizeTrigger={optimizeTrigger}
          onOptimizeHandled={handleOptimizeHandled}
          onRouteInfo={handleRouteInfo}
          mapRef={mapRef}
        />

        {routeList.map((place, idx) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={createNumberedIcon(idx)}
          >
            <Popup>{place.addr}</Popup>
          </Marker>
        ))}

        {posState && (
          <Marker position={posState}>
            <Popup>현재 위치</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
