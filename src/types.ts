export type RouteOptions = {
  startPoint: 'current' | string; // string은 place.id
  endPoint: 'current' | 'start' | string;
  mustVisitFirst?: string; // place.id
  skipIds: string[];
  scenario: 'nearest' | 'farthest' | 'roundTrip' | 'custom';
}; 