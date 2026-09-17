import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageFeaturedPicker from "@/components/GarageFeaturedPicker";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import {
  FEATURED_RIGS_MAX,
  PRODUCT_SECTIONS,
  getFeaturedBuildSlugs,
  getFeaturedProductSlugs,
  listFeaturableBuilds,
  productCatalog,
} from "@/lib/garageReview";
import { getProductsBySlugs } from "@/lib/fourthwall";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Featured · A and D Garage",
  robots: { index: false, follow: false },
};

const titleCase = (slug: string) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default async function GarageFeaturedPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const catalog = productCatalog();
  const [builds, featuredBuilds, featuredProducts, live] = await Promise.all([
    listFeaturableBuilds().catch(() => []),
    getFeaturedBuildSlugs().catch(() => []),
    getFeaturedProductSlugs().catch(() => null),
    getProductsBySlugs(catalog.map((p) => p.slug)).catch(() => []),
  ]);
  const liveBySlug = new Map(live.map((p) => [p.slug, p]));
  const productOptions = catalog.map((p) => {
    const product = liveBySlug.get(p.slug);
    return {
      slug: p.slug,
      label: product?.name || titleCase(p.slug),
      sub: product ? p.collection : `${p.collection}, not live in the shop`,
      image: product?.image?.url,
    };
  });

  return (
    <div className="garage">
      <GarageBack title="Featured" back={{ href: "/garage/review", label: "Review" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">Featured on the site</h1>

        <section className="garage-panel">
          <h2>Featured Rigs on /builds</h2>
          <p className="garage-form-note">Up to {FEATURED_RIGS_MAX}, in this order. Team builds and approved community builds.</p>
          <GarageFeaturedPicker
            kind="featured-builds"
            idPrefix="rigs"
            max={FEATURED_RIGS_MAX}
            initial={featuredBuilds}
            options={builds.map((b) => ({ slug: b.slug, label: b.name, sub: b.kicker, image: b.image }))}
          />
        </section>

        {featuredProducts ? (
          PRODUCT_SECTIONS.map((s) => (
            <section key={s.value} className="garage-panel">
              <h2>{s.label}</h2>
              <p className="garage-form-note">{s.help}</p>
              <GarageFeaturedPicker
                kind="featured-products"
                section={s.value}
                idPrefix={`products-${s.value.replace(/\W+/g, "-").toLowerCase()}`}
                max={12}
                initial={featuredProducts[s.value]}
                options={productOptions}
              />
            </section>
          ))
        ) : (
          <p className="garage-error">Couldn&apos;t read the Featured Products table.</p>
        )}
      </div>
    </div>
  );
}
