import { Loader } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API key is missing! Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
}

let googleMapsPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (googleMapsPromise) return googleMapsPromise;

  const loader = new Loader({
    apiKey: GOOGLE_MAPS_API_KEY,
    version: 'weekly',
    libraries: ['places']
  });

  googleMapsPromise = loader.load();
  return googleMapsPromise;
}

export function calculateRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: { lat: number; lng: number }[]
): Promise<google.maps.DirectionsResult> {
  return loadGoogleMaps().then((maps) => {
    const directionsService = new maps.DirectionsService();
    
    return directionsService.route({
      origin,
      destination,
      waypoints: waypoints?.map(point => ({
        location: point,
        stopover: true
      })),
      optimizeWaypoints: true,
      travelMode: maps.TravelMode.DRIVING
    });
  });
} 