import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SITE_URL } from "@/lib/site";
import { normEmail } from "@/lib/rally";

/**
 * Rider sign-in for Rally Rewards: no passwords. A rider types their email,
 * we email a link that's good for an hour, and the link sets a 30-day cookie.
 * Same HMAC pattern as the Garage session (lib/garageAuth.ts), with its own
 * prefix and cookie so a rider link can never open the Garage.
 */

const COOKIE = "ad_rally";
const SESSION_DAYS = 30;
const LINK_MINUTES = 60;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured.");
  return s;
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function signInLink(email: string, next = "/rally"): string {
  const e = Buffer.from(normEmail(email)).toString("base64url");
  const x = String(Date.now() + LINK_MINUTES * 60 * 1000);
  const t = hmac(`rally-in:${e}:${x}`);
  return `${SITE_URL}/rally/in?e=${e}&x=${x}&t=${t}&next=${encodeURIComponent(next)}`;
}

export function verifySignInLink(e: unknown, x: unknown, t: unknown): string | null {
  if (typeof e !== "string" || typeof x !== "string" || typeof t !== "string") return null;
  if (!/^\d+$/.test(x) || Number(x) < Date.now()) return null;
  try {
    if (!same(hmac(`rally-in:${e}:${x}`), t)) return null;
    const email = Buffer.from(e, "base64url").toString("utf8");
    return email.includes("@") ? normEmail(email) : null;
  } catch {
    return null;
  }
}

function sessionValue(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email: normEmail(email), exp: Date.now() + SESSION_DAYS * 86400000 })).toString("base64url");
  return `${payload}.${hmac(`rally-session:${payload}`)}`;
}

export async function setRiderSession(email: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, sessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearRiderSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The signed-in rider's email, or null. */
export async function getRiderEmail(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  try {
    if (!same(hmac(`rally-session:${payload}`), sig)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; exp?: number };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    return data.email;
  } catch {
    return null;
  }
}

/** "I was there" from the thank-you email (events without Tailgate). Signed
 *  per RSVP + event slug; no token stored. */
export function wasThereLink(slug: string, rsvpId: string): string {
  try {
    return `${SITE_URL}/rally/there?s=${encodeURIComponent(slug)}&id=${rsvpId}&t=${hmac(`rally-there:${slug}:${rsvpId}`)}`;
  } catch {
    return "";
  }
}

export function verifyWasThere(slug: unknown, id: unknown, t: unknown): boolean {
  if (typeof slug !== "string" || typeof id !== "string" || typeof t !== "string") return false;
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return false;
  try {
    return same(hmac(`rally-there:${slug}:${id}`), t);
  } catch {
    return false;
  }
}
