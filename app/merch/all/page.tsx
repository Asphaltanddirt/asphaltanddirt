import type { Metadata } from "next";
import { Suspense } from "react";
import { getFeaturedProducts, MERCH_COLLECTIONS } from "@/lib/fourthwall";
import AllProductsClient from "@/components/AllProductsClient";

export const metadata: Metadata = {
  title: "Shop All Merch",
  description: "Every Asphalt & Dirt product in one place.",
};

export default async function AllProductsPage() {
  const products = await getFeaturedProducts("all", 100);

  // Map each product slug to its collection slug, so the client component
  // can filter without needing to know the collection model itself.
  const collectionByProductSlug: Record<string, string> = {};
  for (const c of MERCH_COLLECTIONS) {
    for (const slug of c.productSlugs) {
      collectionByProductSlug[slug] = c.slug;
    }
  }

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Shop All Merch</div>
        </div>
        <Suspense fallback={null}>
          <AllProductsClient
            products={products}
            collections={MERCH_COLLECTIONS.map((c) => ({ slug: c.slug, name: c.name }))}
            collectionByProductSlug={collectionByProductSlug}
          />
        </Suspense>
      </div>
    </section>
  );
}
