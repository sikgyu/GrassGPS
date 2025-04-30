import Papa from "papaparse";
import axios from "axios";

export type Place = {
  addr: string;
  lat: number;
  lon: number;
};

const GOOGLE_GEOCODE = "https://maps.googleapis.com/maps/api/geocode/json";
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export async function loadPlaces(): Promise<Place[]> {
  console.log("loadPlaces CALLED");

  // 1️⃣ CSV fetch – make sure public/addresses.csv exists
  const resp = await fetch("/addresses.csv");
  if (!resp.ok) throw new Error("addresses.csv not found → place it in /public");

  const csvText = await resp.text();
  // trim header/values, skip 빈줄
  const rows = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  }).data as any[];

  // 👉 첫 번째 컬럼 값으로 주소 추출 (헤더가 address가 아닐 때도 동작)
  const validRows = rows
    .map((r) => r.address ?? Object.values(r)[0])
    .filter((addr) => typeof addr === "string" && addr.length > 0);

  if (validRows.length === 0) throw new Error("No valid address rows found");

  // 2️⃣ Geocode each address (with localStorage cache)
  const places = await Promise.all(
    validRows.map(async (addr: string) => {
      const key = `geo:${addr}`;
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);

      const { data } = await axios.get(GOOGLE_GEOCODE, {
        params: {
          address: addr,
          key: API_KEY,
        },
      });

      if (!data.results[0]) throw new Error(`Geocoding failed for ${addr}`);

      const { lat, lng } = data.results[0].geometry.location;
      const obj = { addr, lat, lon: lng } as Place;
      localStorage.setItem(key, JSON.stringify(obj));
      return obj;
    })
  );

  console.log("geo-coded", places.length, "addresses");
  return places;
}
