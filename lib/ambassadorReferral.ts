/**
 * An ambassador's own A&D link: asphaltanddirt.com/r/CODE. Replaced Fourthwall
 * tracked links (2026-09-17). The link lands on their crew page (or the merch
 * page), counts the visit on their Ambassador record, and remembers their code
 * so it's applied at checkout: the shopper gets the discount without typing it,
 * and the sale is credited to the ambassador through the code, the same way a
 * typed code is. Safe to import on the client.
 */

const SITE = "https://www.asphaltanddirt.com";

/** First-party cookie holding the referring ambassador's code. */
export const REF_COOKIE = "ad_ref";
/** How long a referral sticks: a shopper who comes back within this many
 *  days still gets the code. */
export const REF_DAYS = 30;

/** Promo codes: letters and numbers only, 3 to 20 long, stored upper case. */
export function normalizePromoCode(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

export function isValidPromoCode(code: string): boolean {
  return /^[A-Z0-9]{3,20}$/.test(code);
}

export function referralLinkFor(code: string): string {
  return `${SITE}/r/${normalizePromoCode(code).toLowerCase()}`;
}

/** The code from the referral cookie, in the browser. */
export function readReferralCode(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([A-Za-z0-9]{3,20})`));
  return match ? match[1].toUpperCase() : "";
}
