import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { usePlaces } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import { useEffect, useState } from "react";
import axios from "axios";

export default function MapView() {
  const { places, stops } = usePlaces();
  const pos = useGeo();
  const [route, setRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    const handler = async () => {
      if (stops.length < 2) return;
      const coords = stops.map((id) => {
        const p = places.find((pl) => pl.id === id)!;
        return [p.lon, p.lat];
      });
      const { data } = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car",
        { coordinates: coords },
        { headers: { Authorization: import.meta.env.VITE_ORS_KEY } }
      );
      setRoute(
        data.routes[0].geometry.coordinates.map(
          ([lon, lat]: any) => [lat, lon] as [number, number]
        )
      );
    };
    window.addEventListener("calc-route", handler as EventListener);
    return () =>
      window.removeEventListener("calc-route", handler as EventListener);
  }, [stops, places]);

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={pos ?? [49.25, -123.1]}
        zoom={12}
        className="absolute inset-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {places.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
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

        {route.length > 1 && <Polyline positions={route} color="blue" />}

        {pos && (
          <Marker position={pos}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
