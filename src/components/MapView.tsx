import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { usePlaces, type Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import RoutePolyline from "./RoutePolyline";

const DEFAULT_CENTER: [number, number] = [49.25, -123.1];
const DEFAULT_ZOOM = 12;

/* 둥근 숫자 아이콘 (흰 박스 제거) */
function numIcon(idx: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:#1976d2;color:#fff;border-radius:50%;
      width:32px;height:32px;display:flex;align-items:center;
      justify-content:center;font-weight:bold;">${idx + 1}</div>`,
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
  }) => void;
}

export default function MapView({
  optimizeTrigger,
  setOptimizeTrigger,
  onRouteInfo,
}: Props) {
  const { places, routePlaces } = usePlaces();
  const pos = useGeo();
  const mapRef = useRef<L.Map | null>(null);

  /* 순서 변경 시(드래그) 거리/시간만 재계산 */
  useEffect(() => {
    if (routePlaces.length >= 2) setOptimizeTrigger(false);
  }, [routePlaces, setOptimizeTrigger]);

  /* 최초 한 번 GPS 위치로 맞춤 */
  useEffect(() => {
    if (pos && mapRef.current) {
      mapRef.current.setView(pos, mapRef.current.getZoom());
    }
  }, [pos]);

  const routeFiltered: Place[] = routePlaces
    .map((id) => places.find((p) => p.id === id))
    .filter((p): p is Place => !!p);

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={pos ?? DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        whenCreated={(m) => (mapRef.current = m)}
        className="absolute inset-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <RoutePolyline
          places={routeFiltered}
          optimizeTrigger={optimizeTrigger}
          onOptimizeHandled={() => setOptimizeTrigger(false)}
          onRouteInfo={onRouteInfo}
          mapRef={mapRef}
        />

        {routeFiltered.map((pl, i) => (
          <Marker key={pl.id} position={[pl.lat, pl.lon]} icon={numIcon(i)}>
            <Popup>{pl.addr}</Popup>
          </Marker>
        ))}
        {pos && (
          <Marker position={pos}>
            <Popup>현재 위치</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
