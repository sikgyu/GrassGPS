import { Place } from "../hooks/usePlaces";
import { RouteOptions } from "../types";
import { haversine } from "./haversine";

export function optimizeRoute(
  places: Place[],
  options: RouteOptions,
  currentPos: [number, number] | null
): Place[] {
  // 1. 스킵할 장소 제외
  let stops = places.filter(p => !options.skipIds.includes(p.id));

  // 2. 시작점 위치 구하기
  const startPos = options.startPoint === "current" 
    ? currentPos 
    : stops.find(p => p.id === options.startPoint);

  if (!startPos) return stops; // 시작점이 없으면 원래 순서 유지

  // 3. 우선 방문지 처리
  if (options.mustVisitFirst) {
    const firstStop = stops.find(p => p.id === options.mustVisitFirst);
    if (firstStop) {
      stops = [
        firstStop,
        ...stops.filter(p => p.id !== options.mustVisitFirst)
      ];
    }
  }

  // 4. 시나리오별 정렬
  switch (options.scenario) {
    case 'nearest':
      stops = nearestNeighbor(stops, startPos);
      break;
    case 'farthest':
      stops = farthestFirst(stops, startPos);
      break;
    case 'roundTrip':
      stops = nearestNeighbor(stops, startPos);
      // 시작점이 Place인 경우에만 추가
      if (options.startPoint !== "current") {
        const start = stops.find(p => p.id === options.startPoint);
        if (start) stops.push(start);
      }
      break;
  }

  return stops;
}

// 가장 가까운 곳부터 방문
function nearestNeighbor(places: Place[], start: [number, number] | Place): Place[] {
  const result: Place[] = [];
  const unvisited = [...places];
  
  let current = start;
  
  while (unvisited.length > 0) {
    const currentPos: [number, number] = Array.isArray(current) 
      ? current 
      : [current.lat, current.lon];
    
    // 현재 위치에서 가장 가까운 장소 찾기
    let nearest = unvisited.reduce((nearest, place) => {
      const distance = haversine(
        currentPos[0], currentPos[1],
        place.lat, place.lon
      );
      return !nearest || distance < nearest.distance
        ? { place, distance }
        : nearest;
    }, null as { place: Place; distance: number } | null);

    if (!nearest) break;
    
    result.push(nearest.place);
    unvisited.splice(unvisited.indexOf(nearest.place), 1);
    current = nearest.place;
  }
  
  return result;
}

// 가장 먼 곳부터 방문
function farthestFirst(places: Place[], start: [number, number] | Place): Place[] {
  const result: Place[] = [];
  const unvisited = [...places];
  
  let current = start;
  
  while (unvisited.length > 0) {
    const currentPos: [number, number] = Array.isArray(current) 
      ? current 
      : [current.lat, current.lon];
    
    // 현재 위치에서 가장 먼 장소 찾기
    let farthest = unvisited.reduce((farthest, place) => {
      const distance = haversine(
        currentPos[0], currentPos[1],
        place.lat, place.lon
      );
      return !farthest || distance > farthest.distance
        ? { place, distance }
        : farthest;
    }, null as { place: Place; distance: number } | null);

    if (!farthest) break;
    
    result.push(farthest.place);
    unvisited.splice(unvisited.indexOf(farthest.place), 1);
    current = farthest.place;
  }
  
  return result;
} 