import { useEffect, useState } from 'react';
import { Polyline, useMap, Popup } from 'react-leaflet';
import { Place } from '../hooks/usePlaces';
import { LatLngBounds, LatLng } from 'leaflet';
import { calculateRoute } from '../utils/googleMaps';

interface RoutePolylineProps {
  places: Place[];
}

interface RouteInfo {
  distance: string;
  duration: string;
}

export default function RoutePolyline({ places }: RoutePolylineProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const map = useMap();

  useEffect(() => {
    let isMounted = true;
    setError(null);

    if (places.length < 2) {
      setRouteCoordinates([]);
      setRouteInfo(null);
      return;
    }

    const origin = { lat: places[0].lat, lng: places[0].lon };
    const destination = { lat: places[places.length - 1].lat, lng: places[places.length - 1].lon };
    const waypoints = places.slice(1, -1).map(place => ({
      lat: place.lat,
      lng: place.lon
    }));

    calculateRoute(origin, destination, waypoints)
      .then(result => {
        if (!isMounted) return;

        const route = result.routes[0];
        const path = route.overview_path;
        const coordinates: [number, number][] = path.map(point => [
          point.lat(),
          point.lng()
        ]);

        // 경로 정보 설정
        const leg = route.legs[0];
        setRouteInfo({
          distance: leg.distance?.text || '알 수 없음',
          duration: leg.duration?.text || '알 수 없음'
        });

        setRouteCoordinates(coordinates);

        // Fit map bounds to include all route points
        if (coordinates.length > 0) {
          const bounds = coordinates.reduce(
            (bounds: LatLngBounds, coord: number[]) => bounds.extend(new LatLng(coord[0], coord[1])),
            map.getBounds()
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error calculating route:', err);
        setError(err.message || '경로를 계산하는 중 오류가 발생했습니다');
        setRouteCoordinates([]);
        setRouteInfo(null);
      });

    return () => {
      isMounted = false;
    };
  }, [places, map]);

  if (error) {
    console.warn('Route error:', error);
  }

  if (routeCoordinates.length === 0) return null;

  const center = routeCoordinates[Math.floor(routeCoordinates.length / 2)];

  return (
    <>
      <Polyline
        positions={routeCoordinates}
        color="blue"
        weight={3}
        opacity={0.7}
      />
      {routeInfo && center && (
        <Popup position={center}>
          <div>
            <p>총 거리: {routeInfo.distance}</p>
            <p>예상 소요 시간: {routeInfo.duration}</p>
          </div>
        </Popup>
      )}
    </>
  );
} 