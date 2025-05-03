import { useEffect, useState, MutableRefObject } from "react";
import { Polyline } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { calculateRoute } from "../utils/googleMaps";
import { useGeo } from "../hooks/useGeo";
import { usePlaces, type Place } from "../hooks/usePlaces";

interface Props {
  places: Place[];
  optimizeTrigger: boolean;
  onOptimizeHandled: () => void;
  onRouteInfo: (i:{ summary:string; distance:string; duration:string }) => void;
  mapRef: MutableRefObject<L.Map | null>;
}

export default function RoutePolyline({
  places, optimizeTrigger, onOptimizeHandled, onRouteInfo, mapRef,
}: Props) {
  const pos = useGeo();
  const { reorderRoute } = usePlaces();
  const [coords, setCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!pos || places.length===0) return;
    let alive = true;

    const origin   = { lat: pos[0], lng: pos[1] };
    const dest     = { lat: places.at(-1)!.lat, lng: places.at(-1)!.lon };
    const waypts   = places.slice(0,-1).map(p=>({ lat:p.lat, lng:p.lon }));
    const wayIds   = places.slice(0,-1).map(p=>p.id);

    calculateRoute(origin, dest, waypts, {
      trafficModel:"best_guess",
      optimizeWaypoints: optimizeTrigger,
    })
      .then(({ res, decode }) => {
        if (!alive) return;
        const route = res.routes[0];
        const poly  = decode(route.overview_polyline).map(ll=>[ll.lat(),ll.lng()]);
        setCoords(poly);

        /* 지도 맞춤: TSP 수행 시에만 */
        if (optimizeTrigger && mapRef.current)
          mapRef.current.fitBounds(new LatLngBounds(poly),{padding:[40,40]});

        /* 거리/시간 합계 */
        const dist = route.legs.reduce((s,l)=>s+l.distance.value,0);
        const dura = route.legs.reduce((s,l)=>s+(l.duration_in_traffic?.value ?? l.duration.value),0);
        onRouteInfo({
          summary:  route.summary ?? "",
          distance: (dist/1000).toFixed(1)+" km",
          duration: Math.round(dura/60)+" mins",
        });

        /* 리스트 재정렬 */
        if (optimizeTrigger && route.waypoint_order) {
          reorderRoute([
            ...route.waypoint_order.map(i=>wayIds[i]),
            places.at(-1)!.id,
          ]);
        }

        onOptimizeHandled();
      })
      .catch(e => { console.error(e); onOptimizeHandled(); });

    return () => { alive = false; };
  }, [places, pos, optimizeTrigger]);

  return coords.length ? <Polyline positions={coords} /> : null;
}
