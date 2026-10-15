import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { adminConfigured, checkPassword, makeToken, json } from "../lib/auth.mjs";

export const config = { path: "/api/login" };

const MAX_FAILS = 8;           // failed attempts allowed...
const WINDOW_MS = 15 * 60e3;   // ...per 15 minutes, per visitor

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!adminConfigured()) {
    return json({ error: "Admin is not set up yet. Set the ADMIN_PASSWORD environment variable in Netlify (8+ characters)." }, 503);
  }

  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  const key = "fails:" + createHash("sha256").update(ip).digest("hex").slice(0, 24);
  const store = getStore("admin-auth");
  const now = Date.now();
  let rec = (await store.get(key, { type: "json" }).catch(() => null)) || { n: 0, t: now };
  if (now - rec.t > WINDOW_MS) rec = { n: 0, t: now };
  if (rec.n >= MAX_FAILS) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  if (!checkPassword(body?.password)) {
    rec.n += 1;
    await store.setJSON(key, rec).catch(() => {});
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return json({ error: "Wrong password." }, 401);
  }
  await store.delete(key).catch(() => {});
  return json({ token: makeToken() });
};
