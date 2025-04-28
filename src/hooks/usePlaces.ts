import Papa from "papaparse";
import axios from "axios";
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
  routeOptions: RouteOptions;
  setRouteOptions: (options: Partial<RouteOptions>) => void;
  loadCsv: (text: string) => Promise<void>;
  addAddresses: (text: string) => Promise<void>;
  toggleVisited: (id: string) => void;
  addPhoto: (id: string, url: string) => void;
  toggleStop: (id: string) => void;
  clearStops: () => void;
  reorderPlaces: (newOrder: Place[]) => void;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

async function geocodeAddress(line: string): Promise<Place> {
  const cacheKey = "geo:" + line;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const { data } = await axios.get(NOMINATIM, {
      params: { q: line, format: "json", limit: 1 },
    });
    if (!data[0]) {
      console.warn("❗️ geocode fail:", line);
      return {
        id: crypto.randomUUID(),
        addr: line,
        lat: 0,
        lon: 0,
        visited: false,
        photos: [],
        geocodeFailed: true
      };
    }
    const p: Place = {
      id: crypto.randomUUID(),
      addr: line,
      lat: +data[0].lat,
      lon: +data[0].lon,
      visited: false,
      photos: [],
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
      geocodeFailed: true
    };
  }
}

export const usePlaces = create<Store>()(
  persist(
    (set, get) => ({
      places: [],
      routeOptions: {
        startPoint: 'current',
        endPoint: 'start',
        skipIds: [],
        scenario: 'nearest'
      },
      setRouteOptions: (options) => 
        set((state) => ({
          routeOptions: { ...state.routeOptions, ...options }
        })),

      async loadCsv(text) {
        const rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
        const addrs = rows.map((r) => r[0]?.trim()).filter(Boolean);
        const newPlaces = await Promise.all(
          addrs.map(async (line) => {
            /* lat,lon,title 형식인지 확인 */
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
        set({ places: newPlaces.filter(Boolean) });
      },

      async addAddresses(text) {
        const lines = text
          .split('\n')
          .map(line => line.trim().replace(/^"|"$/g, ''))  // Remove quotes at start/end
          .filter(Boolean);
        
        // Filter out addresses that already exist
        const existingAddrs = new Set(get().places.map(p => p.addr));
        const newLines = lines.filter(line => !existingAddrs.has(line));
        
        if (newLines.length === 0) return;  // No new addresses to add
        
        const newPlaces = await Promise.all(newLines.map(geocodeAddress));
        set((state) => ({
          places: [...state.places, ...newPlaces]
        }));
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
    }),
    { name: "grassgps" }
  )
);

/* 앱 시작 시 CSV 자동 로드 */
(async () => {
  const res = await fetch("/addresses.csv");
  if (res.ok) {
    const text = await res.text();
    await usePlaces.getState().loadCsv(text);
  }
})();
