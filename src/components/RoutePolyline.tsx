import { useEffect, useState, RefObject } from "react";
import React from "react";
import { Polyline } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { useGeo } from "../hooks/useGeo";
import { usePlaces, type Place } from "../hooks/usePlaces";
import { optimizeRoute } from "../utils/routeOptimizer";

interface Props {
  places: Place[];
  optimizeTrigger: boolean;
  onOptimizeHandled: () => void;
  onRouteInfo: (info: {
    summary: string;
    distance: string;
    duration: string;
    waypointOrder?: number[];
  }) => void;
  mapRef: RefObject<L.Map | null>;
}

function RoutePolyline({
  places,
  optimizeTrigger,
  onOptimizeHandled,
  onRouteInfo,
  mapRef,
}: Props) {
  const pos = useGeo();
  const { reorderRoute, routeOptions } = usePlaces();
  const [coords, setCoords] = useState<[number, number][]>([]);

  // 1️⃣ 경로/거리 계산 (places 변화에만 반응)
  useEffect(() => {
    if (!pos || places.length < 2) return;

    // Calculate route using Local TSP
    const route = places.map(p => [p.lat, p.lon] as [number, number]);
    setCoords(route);

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const [lat1, lon1] = route[i];
      const [lat2, lon2] = route[i + 1];
      const dx = lon2 - lon1;
      const dy = lat2 - lat1;
      totalDistance += Math.sqrt(dx * dx + dy * dy) * 111; // rough km conversion
    }

    // Estimate duration (assuming average speed of 30 km/h)
    const duration = (totalDistance / 30) * 60; // in minutes

    // Update route info
    onRouteInfo({
      summary: "Local TSP Route",
      distance: totalDistance.toFixed(1) + " km",
      duration: Math.round(duration) + " mins",
      waypointOrder: places.map((_, i) => i),
    });
  }, [places, pos, onRouteInfo]);

  // 2️⃣ optimizeTrigger 처리
  useEffect(() => {
    if (!optimizeTrigger || !mapRef.current || coords.length === 0) return;

    // 경로 최적화
    const optimizedPlaces = optimizeRoute(places, routeOptions, pos);
    const optimizedIds = optimizedPlaces.map(p => p.id);
    
    // 최적화된 경로가 현재 경로와 다른 경우에만 적용
    if (JSON.stringify(optimizedIds) !== JSON.stringify(places.map(p => p.id))) {
      reorderRoute(optimizedIds);
    }

    // 지도 범위 조정
    mapRef.current.fitBounds(new LatLngBounds(coords), {
      padding: [40, 40],
    });

    // 최적화 완료 처리
    onOptimizeHandled();
  }, [optimizeTrigger, mapRef, coords, onOptimizeHandled, places, routeOptions, pos, reorderRoute]);

  return coords.length > 0 ? <Polyline positions={coords} /> : null;
}

export default React.memo(RoutePolyline);
