import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import haversine from "haversine-distance";
import { loadPlaces, Place } from "./hooks/useAddressData";

const VAN_CENTER: LatLngTuple = [49.25, -123.1];
const YARD_COORD: LatLngTuple = [49.3054, -123.0012];

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [top3, setTop3] = useState<Place[]>([]);
  const [myPos, setMyPos] = useState<LatLngTuple | null>(null);

  useEffect(() => {
    loadPlaces()
      .then(setPlaces)
      .catch((e) => console.error("loadPlaces error", e));
  }, []);

  const handleNearest = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const me: LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
      setMyPos(me);
      const ranked = [...places].sort(
        (a, b) => haversine([me[1], me[0]], [a.lon, a.lat]) - haversine([me[1], me[0]], [b.lon, b.lat])
      );
      setTop3(ranked.slice(0, 3));
    });
  };

  return (
    <div style={{ padding: "8px" }}>
      <div className="bg-green-500 text-white p-4 text-xl"> Tailwind 작동 확인!</div>
      <button onClick={handleNearest}>📍 Show nearest 3</button>
      <div style={{ height: "500px", marginTop: "8px" }}>
        <MapContainer center={VAN_CENTER} zoom={10} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {places.map((p) => (
            <Marker key={p.addr} position={[p.lat, p.lon]} />
          ))}
          {myPos && <Marker position={myPos} />}
          <Marker position={YARD_COORD} />
        </MapContainer>
      </div>
      {top3.length > 0 && (
        <ul style={{ marginTop: "8px" }}>
          {top3.map((p) => (
            <li key={p.addr}>{p.addr}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
