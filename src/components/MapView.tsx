import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePlaces } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";

export default function MapView() {
  const { places } = usePlaces();
  const pos = useGeo(); // [lat, lon]  | null

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={pos ?? [49.25, -123.1]}  // 기본 중심 = 밴쿠버
        zoom={12}
        className="absolute inset-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {places.map((p, idx) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={L.divIcon({
              className: "custom-icon",
              html: `<div style='background:#1976d2;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;'>${idx + 1}</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            })}
            eventHandlers={{
              click: () =>
                window.dispatchEvent(
                  new CustomEvent("open-place", { detail: p.id })
                ),
            }}
          >
            <Popup>{p.addr}</Popup>
          </Marker>
        ))}

        {pos && (
          <Marker position={pos}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
