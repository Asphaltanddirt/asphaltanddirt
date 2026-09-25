import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import {
  FEATURED_RIGS_MAX,
  PRODUCT_SECTIONS,
  listFeaturableBuilds,
  productCatalog,
  setBuildSubmission,
  setFeaturedBuilds,
  setFeaturedProducts,
  setReview,
  type ProductSectionValue,
  type ReviewState,
} from "@/lib/garageReview";

const STATES: ReviewState[] = ["waiting", "approved", "declined"];
const isRecordId = (v: unknown): v is string => typeof v === "string" && /^rec[A-Za-z0-9]{14}$/.test(v);
const slugList = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === "string"))] : null);

/** Owners approve/decline submissions and set what the site features. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const bad = (error = "Invalid request.") => NextResponse.json({ error }, { status: 400 });
  const state = STATES.includes(body.state as ReviewState) ? (body.state as ReviewState) : undefined;
  if (body.state !== undefined && !state) return bad();

  try {
    switch (body.kind) {
      case "build":
        if (!isRecordId(body.id)) return bad();
        await setBuildSubmission(body.id, {
          state,
          ambassador: typeof body.ambassador === "boolean" ? body.ambassador : undefined,
        });
        break;
      case "review":
        if (!isRecordId(body.id)) return bad();
        await setReview(body.id, { state, homepage: typeof body.homepage === "boolean" ? body.homepage : undefined });
        break;
      case "featured-builds": {
        const slugs = slugList(body.slugs);
        if (!slugs || slugs.length > FEATURED_RIGS_MAX) return bad(`Pick up to ${FEATURED_RIGS_MAX} builds.`);
        const known = new Set((await listFeaturableBuilds()).map((b) => b.slug));
        if (slugs.some((s) => !known.has(s))) return bad("One of those builds isn't approved anymore. Reload and try again.");
        await setFeaturedBuilds(slugs);
        break;
      }
      case "featured-products": {
        const section = PRODUCT_SECTIONS.find((s) => s.value === body.section)?.value as ProductSectionValue | undefined;
        const slugs = slugList(body.slugs);
        if (!section || !slugs || slugs.length > 12) return bad();
        const known = new Set(productCatalog().map((p) => p.slug));
        if (slugs.some((s) => !known.has(s))) return bad("Unknown product.");
        await setFeaturedProducts(section, slugs);
        break;
      }
      default:
        return bad();
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("garage review action failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
