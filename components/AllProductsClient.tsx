"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/fourthwall";

type Collection = { slug: string; name: string };

export default function AllProductsClient({
  products,
  collections,
  collectionByProductSlug,
}: {
  products: Product[];
  collections: Collection[];
  collectionByProductSlug: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const initial = searchParams.get("collection") ?? "all";
  const [filter, setFilter] = useState(initial);

  const visibleProducts = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => collectionByProductSlug[p.slug] === filter);
  }, [products, filter, collectionByProductSlug]);

  return (
    <>
      <div className="chip-row mb-0" style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
        <div
          className={`chip${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
          role="button"
          tabIndex={0}
        >
          All
        </div>
        {collections.map((c) => (
          <div
            key={c.slug}
            className={`chip${filter === c.slug ? " active" : ""}`}
            onClick={() => setFilter(c.slug)}
            role="button"
            tabIndex={0}
          >
            {c.name}
          </div>
        ))}
      </div>

      {visibleProducts.length ? (
        <div className="grid grid-4">
          {visibleProducts.map((p) => (
            <Link className="product-card" href={`/merch/${p.slug}`} key={p.id}>
              <div className="product-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image.url} alt={p.image.alt} />
              </div>
              <div className="product-info">
                <div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-price">${p.price}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mb-0">Nothing in this collection yet.</p>
      )}
    </>
  );
}
