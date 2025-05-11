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
import RoutePolyline from "./RoutePolyline";
import { haversine } from "../utils/haversine";     // 기존 util

/* ───────────────────────── 기본 설정 ───────────────────────── */
const DEFAULT_CENTER = [49.25, -123.1] as [number, number];
const DEFAULT_ZOOM   = 12;

/* 메트로타운(‘Home’) 좌표 — 실제 값으로 교체 가능 */
const HOME: [number, number] = [49.2266, -123.0027];
const HOME_RADIUS_M = 300;      // 300 m 안이면 “메트로타운 안”

/* Leaflet 기본 아이콘 경로를 Vite 어셋으로 지정 */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function createNumberedIcon(i: number) {
  return L.divIcon({
    className: "custom-icon",
    html:
      `<div style='background:#1976d2;color:#fff;border-radius:50%;` +
      `width:32px;height:32px;display:flex;align-items:center;` +
      `justify-content:center;font-weight:bold;'>${i + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

/* ───────────────────────── 컴포넌트 ───────────────────────── */
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
  const geoHookPos = useGeo();           // 기존 훅 (배터리 저전력 1‑shot)
  const [posState, setPosState] =
    useState<[number, number]>(() => {
      const cached = localStorage.getItem("lastPos");
      return cached ? JSON.parse(cached) : DEFAULT_CENTER;
    });

  const mapRef = useRef<L.Map | null>(null);
  const lastUpdate = useRef(0);

  /* ── 고속 위치 추적 (watchPosition) ── */
  useEffect(() => {
    if (!navigator.geolocation) return;

    const opts: PositionOptions = {
      enableHighAccuracy: true,  // GPS 사용 (10‑30 m)
      timeout: 5000,
      maximumAge: 10_000,        // 10 초 이내 캐시 사용
    };

    const id = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        /* ① 100 m 이상 & 2 초 이상 변했을 때만 업데이트  */
        if (
          haversine(lat, lon, posState[0], posState[1]) < 0.1 && // km → 100 m
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

  /* ── useGeo 훅 결과(느린 fallback) 반영 ── */
  useEffect(() => {
    if (geoHookPos) setPosState(geoHookPos);
  }, [geoHookPos]);

  /* ── ‘Home’ 핀 자동 생성 ── */
  useEffect(() => {
    const distToHome = haversine(
      posState[0],
      posState[1],
      HOME[0],
      HOME[1]
    ) * 1000; // m

    const homeExists = places.some((p) => p.id === "__HOME__");
    if (distToHome > HOME_RADIUS_M && !homeExists) {
      // 메트로타운 밖 → Home 핀 추가 (id = __HOME__)
      addAddresses(`${HOME[0]},${HOME[1]},Home`);
    }
  }, [posState, places, addAddresses]);

  /* ── Route 리스트 ── */
  const routeList = useMemo(
    () =>
      routePlaces
        .map((id) => places.find((p) => p.id === id))
        .filter((p): p is Place => !!p),
    [places, routePlaces]
  );

  /* ── 콜백 래핑 ── */
  const handleRouteInfo = useCallback(onRouteInfo, [onRouteInfo]);
  const handleOptimizeHandled = useCallback(onOptimizeHandled, [onOptimizeHandled]);

  /* ── 렌더 ── */
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

        <RoutePolyline
          places={routeList}
          optimizeTrigger={optimizeTrigger}
          onOptimizeHandled={handleOptimizeHandled}
          onRouteInfo={handleRouteInfo}
          mapRef={mapRef}
        />

        {routeList.map((place: Place, idx: number) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={createNumberedIcon(idx)}
          >
            <Popup>{place.addr}</Popup>
          </Marker>
        ))}

        <Marker position={posState}>
          <Popup>현재 위치</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
