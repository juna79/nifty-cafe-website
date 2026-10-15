import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SESSION_HOURS = 12;

const sha = (s) => createHash("sha256").update(String(s)).digest();

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
}

// Constant-time password check (compare fixed-length digests)
export function checkPassword(candidate) {
  if (!adminConfigured() || typeof candidate !== "string") return false;
  return timingSafeEqual(sha(candidate), sha(process.env.ADMIN_PASSWORD));
}

function signingKey() {
  return sha("nifty-admin|" + (process.env.SESSION_SECRET || "") + "|" + process.env.ADMIN_PASSWORD);
}

// Token = "<expiry ms>.<hmac>", valid for SESSION_HOURS. Changing the password invalidates all tokens.
export function makeToken() {
  const exp = String(Date.now() + SESSION_HOURS * 3600 * 1000);
  const sig = createHmac("sha256", signingKey()).update(exp).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyRequest(req) {
  if (!adminConfigured()) return false;
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const good = createHmac("sha256", signingKey()).update(exp).digest("hex");
  const a = Buffer.from(sig), b = Buffer.from(good);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
