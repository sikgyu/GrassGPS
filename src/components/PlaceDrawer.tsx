import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDropzone } from "react-dropzone";
import { usePlaces } from "../hooks/usePlaces";
import axios from "axios";

/* ───────── util: haversine km ───────── */
const toRad = (d: number) => (d * Math.PI) / 180;
function km(a: [number, number], b: [number, number]) {
  const R = 6371;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function PlaceDrawer() {
  const { places, toggleVisited, addPhoto } = usePlaces();
  const [openId, setOpenId] = useState<string>();
  const place = places.find((p) => p.id === openId);

  /* 현재 GPS */
  const [pos, setPos] = useState<[number, number]>();
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((p) =>
      setPos([p.coords.latitude, p.coords.longitude])
    );
  }, []);

  /* 실 주행 거리·시간 */
  const [drive, setDrive] = useState<{ km: string; min: string }>();
  useEffect(() => {
    const getRoute = async () => {
      if (!pos || !place) return;
      try {
        const url =
          "https://api.openrouteservice.org/v2/directions/driving-car" +
          `?api_key=${import.meta.env.VITE_ORS_KEY}` +
          `&start=${pos[1]},${pos[0]}` +
          `&end=${place.lon},${place.lat}`;
        const { data } = await axios.get(url);
        const seg = data.routes[0].segments[0];
        setDrive({
          km: (seg.distance / 1000).toFixed(2),
          min: Math.ceil(seg.duration / 60).toString(),
        });
      } catch (e) {
        console.error("ORS error", e);
      }
    };
    getRoute();
  }, [pos, place]);

  /* 마커 클릭 → id 전달 */
  useEffect(() => {
    const h = (e: Event) => setOpenId((e as CustomEvent).detail);
    window.addEventListener("open-place", h as EventListener);
    return () => window.removeEventListener("open-place", h as EventListener);
  }, []);

  /* 사진 업로드 */
  const onDrop = (files: File[]) =>
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = () => place && addPhoto(place.id, r.result as string);
      r.readAsDataURL(f);
    });
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  /* place 없으면 Drawer 숨김 */
  if (!place) return null;

  /* ───────── Drawer Markup ───────── */
  const body = (
    <div className="fixed right-0 top-[48px] z-[12000] w-80 h-[calc(100%-48px)] bg-white shadow p-4 overflow-y-auto">
      <button
        className="float-right text-xl leading-none"
        onClick={() => setOpenId(undefined)}
      >
        &times;
      </button>

      <h2 className="font-semibold mb-3 pr-6 break-words">{place.addr}</h2>

      {/* 거리/시간 */}
      <p className="text-sm mb-3">
        {drive
          ? `🚗  ${drive.km} km · ${drive.min} min drive`
          : pos
          ? `📍  ${km(pos, [place.lat, place.lon]).toFixed(2)} km straight-line`
          : "Locating…"}
      </p>

      {/* 방문 체크 */}
      <label className="flex items-center mb-4">
        <input
          type="checkbox"
          checked={place.visited}
          onChange={() => toggleVisited(place.id)}
        />
        <span className="ml-1">Visited</span>
      </label>

      {/* 사진 업로드 영역 */}
      <div
        {...getRootProps()}
        className="border border-dashed p-4 text-center text-sm mb-4 cursor-pointer"
      >
        <input {...getInputProps()} />
        {isDragActive ? "Drop photos" : "Click or drag photo"}
      </div>

      {/* 썸네일 */}
      <div className="grid grid-cols-2 gap-1 mb-4">
        {(place.photos ?? []).map((src) => (
          <img key={src} src={src} className="object-cover w-full h-24 rounded" />
        ))}
      </div>

      <button
        className="btn w-full"
        onClick={() =>
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              place.addr
            )}`,
            "_blank"
          )
        }
      >
        Navigate
      </button>
    </div>
  );

  /* createPortal → body 최상단 */
  return createPortal(body, document.body);
}
