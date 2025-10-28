// src/hooks/usePlaces.ts — CSV 전용(지오코딩 제거) + hydration 후 자동 로드

import Papa from "papaparse";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RouteOptions } from "../types";

export interface Place {
  id: string;
  addr: string;      // 표시용 주소
  rawAddr: string;   // 원본 입력(중복 체크용)
  lat: number;
  lon: number;
  lng?: number;      // 호환용(lon 복사)
  visited: boolean;
  lastVisit?: string;
  logs: [];
  photos: string[];
  geocodeFailed?: boolean; // 좌표 없을 때 true
}

interface Store {
  places: Place[];
  routePlaces: string[];
  routeOptions: RouteOptions;

  setRouteOptions: (options: Partial<RouteOptions>) => void;

  loadCsv: (text: string) => Promise<void>;     // 덮어쓰기
  addAddresses: (text: string) => Promise<void>; // 병합

  toggleVisited: (id: string) => void;
  addPhoto: (id: string, url: string) => void;
  toggleStop: (id: string) => void;
  clearStops: () => void;
  reorderPlaces: (newOrder: Place[]) => void;

  addToRoute: (id: string) => void;
  removeFromRoute: (id: string) => void;
  reorderRoute: (newOrder: string[]) => void;
  clearRoute: () => void;

  updatePlace: (updated: Place) => void;

  optimizeWithORS: (start: [number, number]) => Promise<void>;
}

/* ───────────── helpers ───────────── */
function extractRegion(addr: string) {
  const parts = addr.split(",");
  return parts[1]?.trim().toLowerCase() || "";
}
function t(s: unknown) {
  return String(s ?? "").trim().replace(/^"|"$/g, "");
}
function n(s: unknown) {
  const v = Number(String(s ?? "").trim());
  return Number.isFinite(v) ? v : NaN;
}

/**
 * CSV/텍스트 → Place[]
 * 지원 포맷
 *  - 헤더 O: address|addr|name, lat, lng|lon
 *  - 헤더 X:
 *      1) "address",lat,lng
 *      2) lat,lon[,name...]
 *      3) address,lat,lng
 * 좌표 없으면 geocodeFailed=true
 */
function parseTextToPlaces(text: string): Place[] {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true }).data as string[][];
  if (!parsed?.length) return [];

  const first = (parsed[0] || []).map((c) => t(c).toLowerCase());
  const hasHeader =
    (first.includes("address") || first.includes("addr") || first.includes("name")) &&
    first.includes("lat") &&
    (first.includes("lng") || first.includes("lon"));

  const rows = hasHeader ? parsed.slice(1) : parsed;
  const idx = {
    name: hasHeader ? first.findIndex((x) => x === "name") : -1,
    addr: hasHeader ? first.findIndex((x) => x === "addr" || x === "address") : -1,
    lat: hasHeader ? first.findIndex((x) => x === "lat") : -1,
    lng: hasHeader ? first.findIndex((x) => x === "lng" || x === "lon") : -1,
  };

  const out: Place[] = [];

  for (const r of rows) {
    const cells = (r || []).map((c) => t(c));

    let addr = "";
    let rawAddr = "";
    let lat = NaN;
    let lon = NaN;

    if (hasHeader) {
      const name = idx.name >= 0 ? cells[idx.name] : "";
      const addrCell = idx.addr >= 0 ? cells[idx.addr] : name;
      lat = n(cells[idx.lat]);
      lon = n(cells[idx.lng]);
      addr = addrCell || name || "";
      rawAddr = addr;
    } else {
      if (cells.length >= 3) {
        const a = cells[0], b = cells[1], rest = cells.slice(2).join(", ").trim();
        const aNum = n(a), bNum = n(b);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
          // lat,lon[,name...]
          lat = aNum; lon = bNum;
          addr = rest || `${lat}, ${lon}`;
          rawAddr = addr;
        } else {
          // "address",lat,lng
          addr = a; rawAddr = a;
          lat = n(cells[1]); lon = n(cells[2]);
        }
      } else if (cells.length === 1) {
        // 주소만 — 좌표 없음
        addr = cells[0]; rawAddr = cells[0];
        lat = NaN; lon = NaN;
      } else {
        continue;
      }
    }

    const okLat = Number.isFinite(lat);
    const okLon = Number.isFinite(lon);

    out.push({
      id: crypto.randomUUID(),
      addr,
      rawAddr,
      lat: okLat ? lat : 0,
      lon: okLon ? lon : 0,
      lng: okLon ? lon : 0,
      visited: false,
      logs: [],
      photos: [],
      geocodeFailed: !(okLat && okLon),
    });
  }

  return out;
}

function sortPlaces(a: Place, b: Place) {
  return extractRegion(a.addr).localeCompare(extractRegion(b.addr));
}

/* ───────────── store ───────────── */
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

      async loadCsv(text) {
        const next = parseTextToPlaces(text);
        next.sort(sortPlaces);
        set({ places: next });
      },

      async addAddresses(text) {
        const next = parseTextToPlaces(text);
        if (next.length === 0) return;

        const key = (p: Place) => `${p.addr}|${p.lat}|${p.lon}`;
        const existing = new Set(get().places.map(key));
        const dedup = next.filter((p) => !existing.has(key(p)));
        if (dedup.length === 0) return;

        const all = [...get().places, ...dedup].sort(sortPlaces);
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

      addToRoute: (id) => set((s) => ({ routePlaces: [...s.routePlaces, id] })),
      removeFromRoute: (id) => set((s) => ({ routePlaces: s.routePlaces.filter((pid) => pid !== id) })),
      reorderRoute: (newOrder) => set(() => ({ routePlaces: newOrder })),
      clearRoute: () => set({ routePlaces: [] }),

      updatePlace: (updated: Place) =>
        set((state) => ({
          places: state.places.map((p) => (p.id === updated.id ? updated : p)),
        })),

      // ORS 최적화(기존 그대로 유지)
      async optimizeWithORS(start) {
        const routeList = get()
          .routePlaces
          .map((id) => get().places.find((p) => p.id === id))
          .filter((p): p is Place => !!p);

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
    {
      name: "grassgps",
      // persist 복구가 끝난 뒤 places가 비어있으면 CSV 자동 로드
      onRehydrateStorage: () => () => {
        setTimeout(async () => {
          try {
            if (usePlaces.getState().places.length === 0) {
              const res = await fetch("/addresses.csv");
              if (!res.ok) return;
              const text = await res.text();
              await usePlaces.getState().loadCsv(text);
            }
          } catch (e) {
            console.warn("CSV auto-load after hydration failed:", e);
          }
        }, 0);
      },
    }
  ) 
);

if (import.meta.env.DEV) {
  (window as any).__places = usePlaces;
  console.log("[usePlaces] probe ready. places =", usePlaces.getState().places.length);
}