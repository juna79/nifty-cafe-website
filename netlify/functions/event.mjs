import { getStore } from "@netlify/blobs";
import { verifyRequest, json } from "../lib/auth.mjs";

export const config = { path: "/api/event" };

const MAX_IMAGE_BYTES = 3_000_000; // posters are resized to ~1600px in the browser first

function clean(v, max) {
  return String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
// Only accept real JPEG/PNG/WebP files (checked by file signature, not by what the browser claims)
function sniffImage(buf) {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export default async (req) => {
  const store = getStore("event");
  const url = new URL(req.url);

  // ---- public: read ----
  if (req.method === "GET") {
    if (url.searchParams.get("image")) {
      const img = await store.getWithMetadata("image", { type: "arrayBuffer" }).catch(() => null);
      if (!img) return new Response("Not found", { status: 404 });
      return new Response(img.data, {
        headers: {
          "content-type": img.metadata?.contentType || "image/jpeg",
          "cache-control": "public, max-age=31536000, immutable", // URL carries ?v=<version>
        },
      });
    }
    const event = await store.get("current", { type: "json" }).catch(() => null);
    return json({ event: event || null }, 200, { "cache-control": "public, max-age=0, must-revalidate" });
  }

  // ---- staff only: write ----
  if (!verifyRequest(req)) return json({ error: "Please log in again." }, 401);

  if (req.method === "DELETE") {
    await store.delete("current");
    await store.delete("image");
    return json({ ok: true, event: null });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  const title = clean(b.title, 80);
  const date = clean(b.date, 10);          // optional: the poster hides itself after this date
  const time = clean(b.time, 40);
  const description = clean(b.description, 300);
  if (date && !validDate(date)) return json({ error: "That date is not valid." }, 400);

  const prev = (await store.get("current", { type: "json" }).catch(() => null)) || {};
  let imageVersion = prev.imageVersion || null;

  if (b.removeImage) {
    await store.delete("image");
    imageVersion = null;
  }
  if (typeof b.image === "string" && b.image) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(b.image);
    if (!m) return json({ error: "Image must be a JPEG, PNG or WebP." }, 400);
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_IMAGE_BYTES) return json({ error: "Image is too large. Try a smaller photo." }, 413);
    const type = sniffImage(buf);
    if (!type) return json({ error: "That file is not a valid image." }, 400);
    await store.set("image", buf, { metadata: { contentType: type } });
    imageVersion = Date.now();
  }

  if (!imageVersion) return json({ error: "Please upload the event poster." }, 400);

  const event = { title, date, time, description, imageVersion, updatedAt: new Date().toISOString() };
  await store.setJSON("current", event);
  return json({ ok: true, event });
};
