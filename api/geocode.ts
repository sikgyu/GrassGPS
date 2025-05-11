import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = String(req.query.q || "");
  if (!q) return res.status(400).send("query parameter q required");

  const url =
    "https://api.openrouteservice.org/geocode/search?" +
    "api_key=" + process.env.ORS_KEY +
    "&text=" + encodeURIComponent(q) +
    "&size=1";

  const r = await fetch(url);
  const txt = await r.text();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(r.status).send(txt);
  console.log("q =", q);
  console.log("ORS_KEY len =", process.env.ORS_KEY?.length);
}
