// src/hooks/usePlaces.ts (ORS 단일 API 버전)

import Papa from "papaparse";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import pThrottle from "p-throttle";
import { RouteOptions } from "../types";

const ORS_KEY = import.meta.env.VITE_ORS_KEY as string;

export interface Place {
  id: string;
  addr: string;
  lat: number;
  lon: number;
  visited: boolean;
  photos: string[];
  geocodeFailed?: boolean;
}

interface Store {
  places: Place[];
  routePlaces: string[]; // IDs of places included in the route
  routeOptions: RouteOptions;
  setRouteOptions: (options: Partial<RouteOptions>) => void;
  loadCsv: (text: string) => Promise<void>;
  addAddresses: (text: string) => Promise<void>;
  toggleVisited: (id: string) => void;
  addPhoto: (id: string, url: string) => void;
  toggleStop: (id: string) => void;
  clearStops: () => void;
  reorderPlaces: (newOrder: Place[]) => void;
  // Route 관리용
  addToRoute: (id: string) => void;
  removeFromRoute: (id: string) => void;
  reorderRoute: (newOrder: string[]) => void;
  clearRoute: () => void;
  /** openrouteservice TSP 최적화 */
  optimizeWithORS: (start: [number, number]) => Promise<void>;
}

/** 요청 속도 : ORS 무료 2 req/sec → limit 2 */
const throttle = pThrottle({ limit: 2, interval: 1000 });

/** 주소 → 위·경도 (ORS Geocode) */
async function geocodeOnce(line: string): Promise<Place> {
  const KEY = import.meta.env.VITE_LOC_KEY;
  const url =
    `https://us1.locationiq.com/v1/search?key=${KEY}` +
    `&q=${encodeURIComponent(line)}&format=json&limit=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("LocIQ HTTP " + res.status);
  const data = (await res.json()) as any[];

  if (data.length) {
    const { lat, lon, display_name } = data[0];
    return {
      id: crypto.randomUUID(),
      addr: display_name,
      lat: +lat,
      lon: +lon,
      visited: false,
      photos: [],
    };
  }
  throw new Error("geocode result empty");
}
// throttle 래핑
const geocodeAddress = throttle(async (line: string): Promise<Place> => {
  const cacheKey = "geo:" + line;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const p = await geocodeOnce(line);
    localStorage.setItem(cacheKey, JSON.stringify(p));
    return p;
  } catch (e) {
    console.warn("geocode 실패:", line, e);
    return {
      id: crypto.randomUUID(),
      addr: line,
      lat: 0,
      lon: 0,
      visited: false,
      photos: [],
      geocodeFailed: true,
    };
  }
});

/** 주소 문자열의 두 번째 컴마 뒤 지역명 추출(정렬용) */
function extractRegion(addr: string) {
  const parts = addr.split(",");
  return parts[1]?.trim().toLowerCase() || "";
}

export const usePlaces = create<Store>()(
  persist(
    (set, get) => ({
      places: [],
      routePlaces: [],
      routeOptions: {
        startPoint: "current",
        endPoint: "start",
        skipIds: [],
        scenario: "nearest",
      },

      setRouteOptions: (options) =>
        set((state) => ({ routeOptions: { ...state.routeOptions, ...options } })),

      /** CSV 혹은 개행 구분 텍스트 로드 */
      async loadCsv(text) {
        const rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
        const addrs = rows.map((r) => r.join(",").trim()).filter(Boolean);
        const newPlaces = await Promise.all(
          addrs.map(async (line) => {
            const parts = line.split(",");
            const n1 = parseFloat(parts[0]);
            const n2 = parseFloat(parts[1]);
            if (!isNaN(n1) && !isNaN(n2) && parts.length >= 3) {
              return {
                id: crypto.randomUUID(),
                addr: parts.slice(2).join(",").trim(),
                lat: n1,
                lon: n2,
                visited: false,
                photos: [],
              } as Place;
            }
            return geocodeAddress(line);
          })
        );
        newPlaces.sort((a, b) => extractRegion(a.addr).localeCompare(extractRegion(b.addr)));
        set({ places: newPlaces });
      },

      /** textarea 수동 추가 */
      async addAddresses(text) {
        const lines = text
          .split("\n")
          .map((l) => l.trim().replace(/^"|"$/g, ""))
          .filter(Boolean);
        const existing = new Set(get().places.map((p) => p.addr));
        const newLines = lines.filter((l) => !existing.has(l));
        if (newLines.length === 0) return;
        const newPlaces = await Promise.all(newLines.map(geocodeAddress));
        const all = [...get().places, ...newPlaces];
        all.sort((a, b) => extractRegion(a.addr).localeCompare(extractRegion(b.addr)));
        set({ places: all });
      },

      toggleVisited: (id) =>
        set({ places: get().places.map((p) => (p.id === id ? { ...p, visited: !p.visited } : p)) }),

      addPhoto: (id, url) =>
        set({ places: get().places.map((p) => (p.id === id ? { ...p, photos: [...p.photos, url] } : p)) }),

      toggleStop: (id) =>
        set({ places: get().places.map((p) => (p.id === id ? { ...p, visited: !p.visited } : p)) }),

      clearStops: () => set({ places: get().places.map((p) => ({ ...p, visited: false })) }),
      reorderPlaces: (newOrder) => set({ places: newOrder }),

      // ---- Route 관리 ----
      addToRoute: (id) => set((s) => ({ routePlaces: [...s.routePlaces, id] })),
      removeFromRoute: (id) => set((s) => ({ routePlaces: s.routePlaces.filter((pid) => pid !== id) })),
      reorderRoute: (newOrder) => set(() => ({ routePlaces: newOrder })),
      clearRoute: () => set({ routePlaces: [] }),

      /** ORS Optimization (TSP) */
      async optimizeWithORS(start) {
        const routeList = get()
          .routePlaces.map((id) => get().places.find((p) => p.id === id))
          .filter((p): p is Place => !!p);
        if (routeList.length < 2) return;

        const body = {
          jobs: routeList.map((p, i) => ({ id: i + 1, location: [p.lon, p.lat] })),
          vehicles: [{ id: 1, profile: "driving-car", start: [start[1], start[0]] }],
        };
        try {
          const r = await fetch("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!r.ok) throw new Error("ORS optimize " + r.status);
          const plan = await r.json();
          const orderIdx = plan.routes[0].steps.map((s: any) => s.job - 1);
          const newOrder = orderIdx.map((i: number) => routeList[i].id);
          set({ routePlaces: newOrder });
        } catch (e) {
          console.error("ORS optimize 실패", e);
          alert("경로 최적화 실패: " + (e as Error).message);
        }
      },
    }),
    { name: "grassgps" }
  )
);

/** 앱 시작 시 public/addresses.csv 자동 로드 */
// (async () => {
//   try {
//     const res = await fetch("/addresses.csv");
//     if (res.ok) {
//       const text = await res.text();
//       await usePlaces.getState().loadCsv(text);
//     }
//   } catch (e) {
//     console.warn("초기 CSV 로드 실패:", e);
//   }
// })();
