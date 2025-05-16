import { useState, useEffect } from "react";
import { usePlaces, type Place } from "../hooks/usePlaces";

export default function PlaceDrawer() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { places, toggleVisited } = usePlaces();

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => setOpenId(e.detail);
    window.addEventListener("open-place", handler as any);
    return () => window.removeEventListener("open-place", handler as any);
  }, []);

  const place = places.find((p) => p.id === openId);
  if (!place) return null;

  return (
    <div className="absolute top-16 right-4 bg-white shadow p-4 rounded max-w-xs">
      <h2 className="font-bold mb-2">{place.addr}</h2>
      <button
        className="btn mb-2"
        onClick={() => {
          toggleVisited(place.id);
          setOpenId(null);
        }}
      >
        {place.visited ? "방문 취소" : "방문 완료"}
      </button>
      <button className="btn" onClick={() => setOpenId(null)}>
        닫기
      </button>
    </div>
  );
}
