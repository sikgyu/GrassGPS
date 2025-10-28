// Node 18+ 필수. 실행:  node scripts/geocode.js
// 결과 파일: public/addresses.csv
// 무료 Nominatim(OSM) 사용. 요청 사이 1.2초 딜레이로 예의 지킴.

// 주소 목록
const ADDRESSES = [
    "1307 Sixth Ave, New Westminster, V3M 2C3",
    "7712 15th Ave, Burnaby,BC V3N 35K",
    "11171 2nd Ave, Richmond V7E 3K6"
];

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT = path.join(process.cwd(), "public", "addresses.csv");

// 간단 정규화. 오타나 중복 BC만 살짝 손봄. 필요시 여기에 케이스 추가.
function normalizeAddress(a) {
  let s = a.replace(/\s+/g, " ").trim();
  s = s.replace(/,?\s*BC\s*BC/i, ", BC"); // "BC BC" -> "BC"
  s = s.replace(/\bVaness\b/i, "Vanness"); // Vaness -> Vanness
  s = s.replace(/\bNo\.\s*/i, "Number "); // "No. 4 Road" -> "Number 4 Road" 보정
  return s;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function geocode(address) {
  const query = normalizeAddress(address);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "ca");
  url.searchParams.set("accept-language", "en");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "GrassGPS-geocoder/1.0",
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) return { lat: "", lng: "" };
  const item = json[0];
  return { lat: String(item.lat ?? ""), lng: String(item.lon ?? "") };
}

async function main() {
  // 헤더 생성
  const rows = [["name", "address", "lat", "lng"]];

  for (let i = 0; i < ADDRESSES.length; i++) {
    const addr = ADDRESSES[i];
    try {
      const { lat, lng } = await geocode(addr);
      rows.push([addr, addr, lat, lng]); // name에 주소 그대로 넣음. 심플
      console.log(`${i + 1}/${ADDRESSES.length} OK: ${addr} -> ${lat}, ${lng}`);
    } catch (e) {
      rows.push([addr, addr, "", ""]);
      console.log(`${i + 1}/${ADDRESSES.length} FAIL: ${addr} -> ${e.message}`);
    }
    // Nominatim 배려. 과도 요청 방지
    await sleep(1200);
  }

  // CSV 저장
  const csv = rows.map(r => r.map(field => {
    // 콤마 포함 안전 처리
    const needsQuote = /[",\n]/.test(field);
    const safe = String(field).replace(/"/g, '""');
    return needsQuote ? `"${safe}"` : safe;
  }).join(",")).join("\n");

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, csv, "utf-8");
  console.log(`\nSaved: ${OUTPUT}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
