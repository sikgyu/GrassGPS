import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePlaces, type Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import RoutePolyline from "./RoutePolyline";
import { useEffect, useState } from "react";

const DEFAULT_CENTER = [49.25, -123.1] as [number, number]; // 밴쿠버
const DEFAULT_ZOOM = 12;
const MARKER_SIZE = 32;

const markerStyle = {
  background: '#1976d2',
  color: 'white',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'inline-block',
  textAlign: 'center',
  lineHeight: '32px',
  fontWeight: 'bold',
  fontSize: '18px',
  boxSizing: 'border-box',
};

function createNumberedIcon(index: number) {
  return L.divIcon({
    className: "custom-icon",
    html: `<div style='background:#1976d2;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;'>${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

interface MapViewProps {
  optimizeTrigger: boolean;
  setOptimizeTrigger: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function MapView({ optimizeTrigger, setOptimizeTrigger }: MapViewProps) {
  const { places, routePlaces } = usePlaces();
  const pos = useGeo();
  const [posState, setPos] = useState<[number, number] | undefined>(pos);

  // Filter places to only show those in the route, maintaining route order
  const routeFilteredPlaces = routePlaces
    .map(id => places.find(p => p.id === id))
    .filter((p): p is Place => p !== undefined);

  const handlePlaceClick = (placeId: string) => {
    window.dispatchEvent(
      new CustomEvent("open-place", { detail: placeId })
    );
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      (err) => {
        console.error('Geolocation error:', err);
      }
    );
  }, []);

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={posState ?? DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="absolute inset-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RoutePolyline
          places={routeFilteredPlaces}
          optimizeTrigger={optimizeTrigger}
          onOptimizeHandled={() => setOptimizeTrigger(false)}
        />
        {routeFilteredPlaces.map((place, idx) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={createNumberedIcon(idx)}
            eventHandlers={{
              click: () => handlePlaceClick(place.id),
            }}
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
