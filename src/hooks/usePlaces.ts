import Papa from "papaparse";
import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Place {
  id: string;
  addr: string;
  lat: number;
  lon: number;
  visited: boolean;
  photos: string[];
}

interface Store {
  places: Place[];
  stops: string[];
  loadCsv: (text: string, replace: boolean) => Promise<void>;
  addAddresses: (text: string) => Promise<void>;
  toggleVisited: (id: string) => void;
  addPhoto: (id: string, url: string) => void;
  toggleStop: (id: string) => void;
  clearStops: () => void;
}

const GEOCODE = "https://nominatim.openstreetmap.org/search";

export const usePlaces = create<Store>()(
  persist(
    (set, get) => ({
      places: [],
      stops: [],

      async loadCsv(text, replace) {
        const rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
        const addrs = rows.map((r) => r[0]).filter(Boolean);
        await importAddrs(addrs, replace, set, get);
      },

      async addAddresses(text) {
        const addrs = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
        await importAddrs(addrs, false, set, get);
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
          stops: get().stops.includes(id)
            ? get().stops.filter((s) => s !== id)
            : [...get().stops, id],
        }),

      clearStops: () => set({ stops: [] }),
    }),
    { name: "grassgps" }
  )
);

// CSV 자동 로드
(async () => {
  try {
    const res = await fetch("/addresses.csv");
    if (res.ok) {
      const text = await res.text();
      await usePlaces.getState().loadCsv(text, true);
    }
  } catch (e) {
    console.error(e);
  }
})();

async function importAddrs(
  addrs: string[],
  replace: boolean,
  set: any,
  get: any
) {
  const existing = get().places;

  const newPlaces = await Promise.all(
    addrs.map(async (addr) => {
      const cache = localStorage.getItem("geo:" + addr);
      if (cache) return JSON.parse(cache);

      try {
        const { data } = await axios.get(GEOCODE, {
          params: { q: addr, format: "json", limit: 1 },
        });
        if (!data[0]) return null;
        const obj: Place = {
          id: crypto.randomUUID(),
          addr,
          lat: +data[0].lat,
          lon: +data[0].lon,
          visited: false,
          photos: [],
        };
        localStorage.setItem("geo:" + addr, JSON.stringify(obj));
        return obj;
      } catch {
        return null;
      }
    })
  );

  const cleaned = newPlaces.filter(Boolean) as Place[];
  set({ places: replace ? cleaned : [...existing, ...cleaned] });
}
