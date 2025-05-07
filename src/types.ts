export type RouteOptions = {
  startPoint: "current" | string;
  endPoint: "current" | "start" | string;
  mustVisitFirst?: string;
  skipIds: string[];
  scenario: "nearest" | "farthest" | "roundTrip" | "custom";
};