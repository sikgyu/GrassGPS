import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("POST only");

  const ors = "https://api.openrouteservice.org/optimization";
  const r = await fetch(ors, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.ORS_KEY as string,
    },
    body: JSON.stringify(req.body),
  });

  const txt = await r.text();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(r.status).send(txt);
}
