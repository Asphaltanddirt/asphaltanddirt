"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductDetail } from "@/lib/fourthwall";
import { useCart } from "./CartContext";

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const { addItem, loading } = useCart();
  const [colorIndex, setColorIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const color = product.colors[colorIndex];
  const [sizeIndex, setSizeIndex] = useState(() =>
    Math.max(0, color.sizes.findIndex((s) => s.inStock))
  );

  const selectedSize = color.sizes[sizeIndex] ?? color.sizes[0];
  const mainImage = color.images[imageIndex] ?? color.images[0];

  const allInStock = useMemo(() => color.sizes.some((s) => s.inStock), [color]);

  function handleColorSelect(idx: number) {
    setColorIndex(idx);
    setImageIndex(0);
    const firstInStock = Math.max(0, product.colors[idx].sizes.findIndex((s) => s.inStock));
    setSizeIndex(firstInStock);
  }

  async function handleAddToCart() {
    if (!selectedSize?.inStock) return;
    await addItem(selectedSize.variantId, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <Link href="/merch" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back to Merch
        </Link>

        <div className="pdp-layout">
          <div className="pdp-gallery">
            <div className="pdp-thumbs">
              {color.images.map((img, i) => (
                <button
                  key={img.url + i}
                  className={`pdp-thumb${i === imageIndex ? " active" : ""}`}
                  onClick={() => setImageIndex(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
            <div className="pdp-main-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mainImage?.url} alt={mainImage?.alt ?? product.name} />
            </div>
          </div>

          <div className="pdp-info">
            <h1 className="pdp-title">{product.name}</h1>
            <div className="pdp-price">${selectedSize?.price ?? color.sizes[0]?.price}</div>

            <div
              className="pdp-description"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />

            {product.colors.length > 1 && (
              <div className="pdp-option-group">
                <div className="pdp-option-label">Color: {color.colorName}</div>
                <div className="pdp-swatches">
                  {product.colors.map((c, i) => (
                    <button
                      key={c.colorName}
                      className={`pdp-swatch${i === colorIndex ? " active" : ""}`}
                      style={{ background: c.swatch }}
                      aria-label={c.colorName}
                      onClick={() => handleColorSelect(i)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="pdp-option-group">
              <div className="pdp-option-label">Size</div>
              <div className="pdp-sizes">
                {color.sizes.map((s, i) => (
                  <button
                    key={s.variantId}
                    className={`pdp-size-btn${i === sizeIndex ? " active" : ""}`}
                    disabled={!s.inStock}
                    onClick={() => setSizeIndex(i)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp-actions">
              <select
                className="pdp-qty"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                aria-label="Quantity"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary pdp-add-btn"
                onClick={handleAddToCart}
                disabled={!allInStock || !selectedSize?.inStock || loading}
              >
                {!allInStock || !selectedSize?.inStock
                  ? "Sold Out"
                  : added
                    ? "Added to Cart"
                    : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
