export type RouteOptions = {
  startPoint: 'current' | string; // string은 place.id
  endPoint: 'current' | 'start' | string;
  mustVisitFirst?: string; // place.id
  skipIds: string[];
  scenario: 'nearest' | 'farthest' | 'roundTrip' | 'custom';
}; 

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface PlannerState {
  todayPlan: Place[];
  weekPlan: Record<DayOfWeek, Place[]>;
}