import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { usePlaces, type Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import { haversine } from "../utils/haversine";
import PlaceCard from "./PlaceCard";

const DEFAULT_CENTER = [49.25, -123.1] as [number, number];
const DEFAULT_ZOOM = 12;
const HOME: [number, number] = [49.2266, -123.0027];
const HOME_RADIUS_M = 300;

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function createNumberedIcon(i: number) {
  return L.divIcon({
    className: "custom-icon",
    html: `<div style='background:#1976d2;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;'>${i + 1}</div>`,
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
  const { places, routePlaces, addAddresses } = usePlaces(); 
  const geoHookPos = useGeo();
  const [posState, setPosState] = useState<[number, number]>(() => {
    const cached = localStorage.getItem("lastPos");
    return cached ? JSON.parse(cached) : DEFAULT_CENTER;
  });
  const [selected, setSelected] = useState<Place | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 10_000,
    };

    const id = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        if (
          haversine(lat, lon, posState[0], posState[1]) < 0.1 &&
          now - lastUpdate.current < 2000
        )
          return;

        lastUpdate.current = now;
        const newPos: [number, number] = [lat, lon];
        setPosState(newPos);
        localStorage.setItem("lastPos", JSON.stringify(newPos));
      },
      (e) => console.warn("watchPosition error:", e),
      opts
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [posState]);

  useEffect(() => {
    if (geoHookPos) setPosState(geoHookPos);
  }, [geoHookPos]);

  useEffect(() => {
    const distToHome = haversine(
      posState[0],
      posState[1],
      HOME[0],
      HOME[1]
    ) * 1000;

    const homeExists = places.some((p) => p.id === "__HOME__");
    if (distToHome > HOME_RADIUS_M && !homeExists) {
      addAddresses(`${HOME[0]},${HOME[1]},Home`);
    }
  }, [posState, places, addAddresses]);

  const routeList = useMemo(() => {
    return routePlaces
      .map((id) => places.find((p) => p.id === id))
      .filter((p): p is Place => !!p);
  }, [places, routePlaces]);

  const handleRouteInfo = useCallback(onRouteInfo, [onRouteInfo]);
  const handleOptimizeHandled = useCallback(onOptimizeHandled, [onOptimizeHandled]);
  
  return (
    <div className="flex-1 relative">
      <MapContainer
        ref={mapRef}
        center={posState}
        zoom={DEFAULT_ZOOM}
        className="absolute inset-0"
        preferCanvas
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {routeList.map((place, idx) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lon]}
          icon={createNumberedIcon(idx)}
        >
          <Popup minWidth={350} maxWidth={400} autoClose={false}>
          <PlaceCard place={place} /> 
          </Popup>
        </Marker>
      ))}

        <Marker position={posState}>
          <Popup>현재 위치</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
