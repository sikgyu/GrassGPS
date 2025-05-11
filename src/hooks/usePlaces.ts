// src/hooks/usePlaces.ts

import Papa from "papaparse";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RouteOptions } from "../types";

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
  routePlaces: string[];           // IDs of places included in the route
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
}

/** 문자열 주소를 위경도로 변환 */
async function geocodeAddress(line: string): Promise<Place> {
  const cacheKey = "geo:" + line;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    // 주소 형식이 "lat,lon,title"인 경우
    const parts = line.split(",");
    const n1 = parseFloat(parts[0]);
    const n2 = parseFloat(parts[1]);
    if (!isNaN(n1) && !isNaN(n2) && parts.length >= 3) {
      const p: Place = {
        id: crypto.randomUUID(),
        addr: parts.slice(2).join(",").trim(),
        lat: n1,
        lon: n2,
        visited: false,
        photos: [],
      };
      localStorage.setItem(cacheKey, JSON.stringify(p));
      return p;
    }

    // 일반 주소인 경우 기본값 반환
    const p: Place = {
      id: crypto.randomUUID(),
      addr: line,
      lat: 0,
      lon: 0,
      visited: false,
      photos: [],
      geocodeFailed: true,
    };
    localStorage.setItem(cacheKey, JSON.stringify(p));
    return p;
  } catch (e) {
    console.error("geo error", e);
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
}

/** 주소 문자열의 두 번째 컴마 뒤 지역명을 뽑아 알파벳 순 정렬에 사용 */
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
        set((state) => ({
          routeOptions: { ...state.routeOptions, ...options },
        })),

      /** CSV 혹은 개행 구분 텍스트 로드 (앱 최초 자동 호출됨) */
      async loadCsv(text) {
        const rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
        const addrs = rows.map((r) => r[0]?.trim()).filter(Boolean);
        const newPlaces = await Promise.all(
          addrs.map(async (line) => {
            // 이미 "lat,lon,title" 형식일 수도
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
        // 지역명 기준 알파벳 정렬
        newPlaces.sort((a, b) =>
          extractRegion(a.addr).localeCompare(extractRegion(b.addr))
        );
        set({ places: newPlaces });
      },

      /** 수동 추가(Address list textarea용) */
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
        all.sort((a, b) =>
          extractRegion(a.addr).localeCompare(extractRegion(b.addr))
        );
        set({ places: all });
      },

      toggleVisited: (id) =>
        set({
          places: get().places.map((p) =>
            p.id === id ? { ...p, visited: !p.visited } : p
          ),
        }),

      addPhoto: (id, url) =>
        set({
          places: get().places.map((p) =>
            p.id === id ? { ...p, photos: [...p.photos, url] } : p
          ),
        }),

      toggleStop: (id) =>
        set({
          places: get().places.map((p) =>
            p.id === id ? { ...p, visited: !p.visited } : p
          ),
        }),

      clearStops: () =>
        set({
          places: get().places.map((p) => ({ ...p, visited: false })),
        }),

      reorderPlaces: (newOrder) => set({ places: newOrder }),

      // ---- Route 관리 함수들 ----
      addToRoute: (id) =>
        set((state) => ({ routePlaces: [...state.routePlaces, id] })),

      removeFromRoute: (id) =>
        set((state) => ({
          routePlaces: state.routePlaces.filter((pid) => pid !== id),
        })),

      reorderRoute: (newOrder) =>
        set(() => ({ routePlaces: newOrder })),

      clearRoute: () => set({ routePlaces: [] }),
    }),
    { name: "grassgps" }
  )
);

/** 앱 시작 시 public/addresses.csv 자동 로드 */
;(async () => {
  try {
    const res = await fetch("/addresses.csv");
    if (res.ok) {
      const text = await res.text();
      await usePlaces.getState().loadCsv(text);
    }
  } catch (e) {
    console.warn("초기 CSV 로드 실패:", e);
  }
})();
