// src/components/PlaceCard.tsx
import React, { useState } from "react";
import dayjs from "dayjs";
import { Place, VisitLog } from "../Pages/PlacesPage"; // 경로 맞게 수정
import { usePlaces } from "../hooks/usePlaces";

interface Props {
  place: Place;
}

const PlaceCard: React.FC<Props> = ({ place }) => {
  const { updatePlace } = usePlaces();
  /* ▼ 아주 간단한 Log visit 예시 ▼ */
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
  const [tarp, setTarp] = useState("");
  
  console.log("PlaceCard", place.logs)
  const save = () => {
    const log: VisitLog = { date: new Date(date).toISOString(), tarp };
    updatePlace({
      ...place,
      lastVisit: log.date,
      tarp: log.tarp,
      logs: [...place.logs, log],
    });
    setOpen(false);
    setTarp("");
  };

  return (
    <div className="p-4 w-72 text-sm">
      <h3 className="font-bold text-lg mb-2">{place.addr}</h3>
      <p>Last visit: {place.lastVisit ? dayjs(place.lastVisit).format("YYYY-MM-DD HH:mm") : "—"}</p>
      <p>Tarp used: {place.tarp || "—"}</p>

      <button onClick={() => setOpen(!open)} className="mt-2 rounded border px-2 py-1">
        Log visit
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded w-full px-2 py-1" />
          <input type="text" value={tarp} placeholder="5 (full truck)" onChange={(e) => setTarp(e.target.value)} className="border rounded w-full px-2 py-1" />
          <button onClick={save} className="rounded border px-2 py-1 w-full bg-green-600 text-white">Save</button>
        </div>
      )}
    </div>
  );
};

export default PlaceCard;
