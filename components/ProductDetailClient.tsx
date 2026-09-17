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
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addError, setAddError] = useState(false);

  const color = product.colors[colorIndex];
  const [sizeIndex, setSizeIndex] = useState(() =>
    Math.max(0, color.sizes.findIndex((s) => s.inStock))
  );

  const selectedSize = color.sizes[sizeIndex] ?? color.sizes[0];
  const mainImage = color.images[imageIndex] ?? color.images[0];

  const allInStock = useMemo(() => color.sizes.some((s) => s.inStock), [color]);

  // Only worth a toggle when there's an actual size choice, or the guide
  // carries fit notes — a one-size hat's diagram isn't useful here (its
  // circumference shows in the "Size & Fit" section instead).
  const showSizeGuideToggle = Boolean(
    product.sizeGuide && (color.sizes.length > 1 || product.sizeGuide.descriptionHtml),
  );

  function handleColorSelect(idx: number) {
    setColorIndex(idx);
    setImageIndex(0);
    const firstInStock = Math.max(0, product.colors[idx].sizes.findIndex((s) => s.inStock));
    setSizeIndex(firstInStock);
  }

  async function handleAddToCart() {
    if (!selectedSize?.inStock || loading) return;
    setAddError(false);
    try {
      await addItem(selectedSize.variantId, quantity);
    } catch {
      setAddError(true);
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <Link href="/merch/all" className="back-link">
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
                <div className="pdp-swatches" role="group" aria-label="Color">
                  {product.colors.map((c, i) => (
                    <button
                      key={c.colorName}
                      aria-pressed={i === colorIndex}
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
              <div className="pdp-option-label">
                Size
                {showSizeGuideToggle && (
                  <button
                    type="button"
                    className="pdp-sizeguide-toggle"
                    aria-expanded={showSizeGuide}
                    onClick={() => setShowSizeGuide((v) => !v)}
                  >
                    {showSizeGuide ? "Hide size guide" : "Size guide"}
                  </button>
                )}
              </div>
              <div className="pdp-sizes" role="group" aria-label="Size">
                {color.sizes.map((s, i) => (
                  <button
                    key={s.variantId}
                    type="button"
                    aria-pressed={i === sizeIndex}
                    className={`pdp-size-btn${i === sizeIndex ? " active" : ""}`}
                    disabled={!s.inStock}
                    aria-label={s.inStock ? s.name : `${s.name}, sold out`}
                    onClick={() => setSizeIndex(i)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              {/* Say why a size can't be picked instead of leaving a dead button. */}
              {!allInStock ? (
                <p className="pdp-size-note">This item is sold out right now. Check back soon.</p>
              ) : color.sizes.some((s) => !s.inStock) ? (
                <p className="pdp-size-note">Crossed-out sizes are sold out.</p>
              ) : null}
              {showSizeGuideToggle && showSizeGuide && product.sizeGuide && (
                <div className="pdp-sizeguide">
                  {product.sizeGuide.chart && (
                    <div className="pdp-sizechart-wrap">
                      <table className="pdp-sizechart">
                        <caption>Measurements in inches (1 in = 2.54 cm), garment laid flat</caption>
                        <thead>
                          <tr>
                            <th scope="col">Size</th>
                            {product.sizeGuide.chart.columns.map((col) => (
                              <th scope="col" key={col.label}>
                                {col.label}
                                <span className="pdp-sizechart-hint">{col.hint}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {product.sizeGuide.chart.rows.map((row) => (
                            <tr key={row.size}>
                              <th scope="row">{row.size}</th>
                              {row.values.map((v, i) => (
                                <td key={i}>{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {product.sizeGuide.chart.note && <p className="pdp-sizeguide-fine">{product.sizeGuide.chart.note}</p>}
                    </div>
                  )}
                  {product.sizeGuide.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.sizeGuide.imageUrl} alt="Diagram showing where to measure: A length, B width, C sleeve" />
                  )}
                  {product.sizeGuide.descriptionHtml && (
                    <div
                      className="pdp-sizeguide-note"
                      dangerouslySetInnerHTML={{ __html: product.sizeGuide.descriptionHtml }}
                    />
                  )}
                  <p className="pdp-sizeguide-fine">
                    Made to order — we can&apos;t take sizing-related returns, so check the guide
                    before you pick.
                  </p>
                </div>
              )}
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
                disabled={!allInStock || !selectedSize?.inStock}
                // Not `disabled` while the request runs: a disabled button drops
                // keyboard focus, and the cart then has nowhere to return it.
                aria-disabled={loading || undefined}
              >
                {!allInStock || !selectedSize?.inStock
                  ? "Sold Out"
                  : added
                    ? "Added to Cart"
                    : "Add to Cart"}
              </button>
            </div>
            {addError && (
              <p className="pdp-add-error" role="alert">
                That didn&apos;t go through. Please try Add to Cart again.
              </p>
            )}

            {product.sections.length > 0 && (
              <div className="pdp-sections">
                {product.sections.map((s) => (
                  <details className="pdp-section" key={s.title}>
                    <summary>{s.title}</summary>
                    <div
                      className="pdp-section-body"
                      dangerouslySetInnerHTML={{ __html: s.bodyHtml }}
                    />
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
