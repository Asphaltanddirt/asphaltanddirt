import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived public links to a posting-board asset, for the auto-poster.
 *
 * Instagram and Facebook fetch media from a URL rather than taking an upload,
 * and Instagram only accepts JPEG images — our social images are PNGs. So the
 * poster hands Meta a link to /api/social-media on our own site, which serves
 * the asset (converted to JPEG when asked) only while the signature is valid.
 * The board itself stays owners-only; nothing here lists or guesses assets.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.asphaltanddirt.com";
const TTL_SECONDS = 2 * 60 * 60;

function secret() {
  const s = process.env.CRON_SECRET || process.env.ADMIN_API_SECRET || "";
  if (!s) throw new Error("CRON_SECRET is not set, so media links can't be signed.");
  return s;
}

/** raw = as uploaded · jpeg = re-encoded · ig = JPEG fitted inside Instagram's 4:5 to 1.91:1 frame. */
export type MediaFormat = "jpeg" | "ig" | "raw";

function sign(id: string, index: number, format: MediaFormat, expires: number) {
  return createHmac("sha256", secret()).update(`${id}.${index}.${format}.${expires}`).digest("base64url");
}

export function signedMediaUrl(id: string, index: number, format: MediaFormat, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + TTL_SECONDS;
  const qs = new URLSearchParams({ id, i: String(index), f: format, e: String(expires), s: sign(id, index, format, expires) });
  return `${SITE.replace(/\/$/, "")}/api/social-media?${qs}`;
}

export function verifyMediaUrl(params: URLSearchParams): { id: string; index: number; format: MediaFormat } | null {
  const id = params.get("id") || "";
  const index = Number(params.get("i"));
  const f = params.get("f");
  const format: MediaFormat = f === "jpeg" || f === "ig" ? f : "raw";
  const expires = Number(params.get("e"));
  const given = params.get("s") || "";
  if (!/^rec[A-Za-z0-9]{14}$/.test(id) || !Number.isInteger(index) || index < 0 || !Number.isFinite(expires)) return null;
  if (expires < Date.now() / 1000) return null;
  let expected: string;
  try {
    expected = sign(id, index, format, expires);
  } catch {
    return null;
  }
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id, index, format };
}
