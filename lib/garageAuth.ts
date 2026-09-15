import crypto from "crypto";
import { cookies } from "next/headers";
import { listRecords, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { SITE_URL } from "@/lib/site";

/**
 * A&D Garage sign-in. Google only, invite only.
 *
 * Google tells us who someone is; the "A&D Garage" Airtable base decides
 * whether they're allowed in and what they can see. An email that isn't in
 * Users with Active ticked gets turned away, even with a valid Google account.
 *
 * No auth library: the whole flow is one redirect out to Google, one callback,
 * and a signed session cookie. That's less to keep patched than a framework,
 * and it keeps every Airtable detail in lib/ the way the rest of the site does.
 *
 * Google client: its own Google Cloud project ("A and D Garage", External, in
 * production) so the analytics/Drive/YouTube tokens on the older project are
 * never affected. Redirect URI registered there:
 *   <site>/api/auth/callback/google
 */

const BASE_ID = process.env.AIRTABLE_GARAGE_BASE_ID;
const USERS_TABLE = "Users";
const COOKIE = "ad_garage_session";
const STATE_COOKIE = "ad_garage_state";
/** Sessions last two weeks; event days and posting days are spread out. */
const SESSION_DAYS = 14;

export type GarageRole = "Owner" | "Staff" | "Crew";

export interface GarageUser {
  id: string;
  email: string;
  name: string;
  role: GarageRole;
  photoUrl: string;
}

export interface GarageSession {
  userId: string;
  email: string;
  name: string;
  role: GarageRole;
  photoUrl: string;
  expiresAt: number;
}

export function isGarageConfigured() {
  return Boolean(
    isAirtableConfigured(BASE_ID) &&
      process.env.GARAGE_GOOGLE_CLIENT_ID &&
      process.env.GARAGE_GOOGLE_CLIENT_SECRET &&
      process.env.AUTH_SECRET,
  );
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured.");
  return value;
}

/** Google must get back exactly the origin the browser is on, or the callback
 *  lands on the wrong site: localhost during development, www in production.
 *  Both are registered on the Google client. */
export function redirectUri(origin?: string) {
  return `${origin || SITE_URL}/api/auth/callback/google`;
}

// ---------------------------------------------------------------------------
// Session cookie: JSON + HMAC, so the browser can hold it but not edit it.
// ---------------------------------------------------------------------------

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function serialize(session: GarageSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function deserialize(value: string): GarageSession | null {
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as GarageSession;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export async function setSession(user: GarageUser) {
  const session: GarageSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    photoUrl: user.photoUrl,
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const store = await cookies();
  store.set(COOKIE, serialize(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Who's signed in on this request, or null. Every Garage page and API route
 *  starts here — there is no other way in. */
export async function getSession(): Promise<GarageSession | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value ? deserialize(value) : null;
}

export function canSeeOwnerOnly(session: GarageSession | null) {
  return session?.role === "Owner";
}

/** Staff-side abilities: running an event day (Tailgate staff mode, check-in). */
export function canRunEvents(session: GarageSession | null) {
  return session?.role === "Owner" || session?.role === "Staff";
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

/** The URL we send someone to when they tap "Continue with Google", plus the
 *  one-time state we store to prove the callback is ours. */
export async function startGoogleSignIn(next: string, origin?: string) {
  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  store.set(STATE_COOKIE, `${state}:${next}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  const params = new URLSearchParams({
    client_id: process.env.GARAGE_GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Checks the state cookie and returns where to send them afterwards. */
export async function consumeState(state: string | null): Promise<{ ok: boolean; next: string }> {
  const store = await cookies();
  const stored = store.get(STATE_COOKIE)?.value || "";
  store.delete(STATE_COOKIE);
  const [expected, ...rest] = stored.split(":");
  const next = rest.join(":") || "/garage";
  return { ok: Boolean(state) && state === expected, next: next.startsWith("/") ? next : "/garage" };
}

export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
}

/** Trades the callback code for the signed-in person's Google profile. */
export async function exchangeCode(code: string, origin?: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GARAGE_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GARAGE_GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }).toString(),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${JSON.stringify(data)}`);

  const profile = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
    cache: "no-store",
  });
  const info = await profile.json();
  if (!profile.ok) throw new Error(`Google userinfo failed: ${profile.status} ${JSON.stringify(info)}`);
  return {
    email: String(info.email || "").trim().toLowerCase(),
    name: String(info.name || "").trim(),
    picture: String(info.picture || ""),
  };
}

// ---------------------------------------------------------------------------
// The invite list
// ---------------------------------------------------------------------------

function toUser(r: { id: string; fields: AirtableFields }): GarageUser {
  const role = r.fields.Role as GarageRole;
  return {
    id: r.id,
    email: ((r.fields.Email as string) || "").trim().toLowerCase(),
    name: (r.fields.Name as string) || "",
    role: role === "Owner" || role === "Staff" ? role : "Crew",
    photoUrl: (r.fields["Photo URL"] as string) || "",
  };
}

/** The Users row for this Google address, only if they're allowed in.
 *  Read fresh, never cached: switching someone off has to take effect now. */
export async function findAllowedUser(email: string): Promise<GarageUser | null> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("A&D Garage base is not configured.");
  const records = await listRecords(USERS_TABLE, `{Active} = TRUE()`, { baseId: BASE_ID });
  const match = records.find((r) => ((r.fields.Email as string) || "").trim().toLowerCase() === email);
  return match ? toUser(match) : null;
}

/** Keeps the Users row in step with their Google account on each sign-in. */
export async function recordSignIn(user: GarageUser, profile: GoogleProfile) {
  await updateRecord(
    USERS_TABLE,
    user.id,
    {
      ...(profile.name ? { Name: profile.name } : {}),
      ...(profile.picture ? { "Photo URL": profile.picture } : {}),
      "Last Signed In": new Date().toISOString(),
    },
    { baseId: BASE_ID },
  );
}

export async function listGarageUsers(): Promise<GarageUser[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const records = await listRecords(USERS_TABLE, `{Active} = TRUE()`, { baseId: BASE_ID });
  return records.map(toUser).sort((a, b) => a.name.localeCompare(b.name));
}
