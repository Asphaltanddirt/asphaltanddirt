"use client";

import { useCart } from "./CartContext";

export default function CartDrawer() {
  const { cart, loading, isOpen, close, setQuantity, checkoutUrl } = useCart();

  return (
    <>
      <div className={`cart-overlay${isOpen ? " open" : ""}`} onClick={close} />
      <aside className={`cart-drawer${isOpen ? " open" : ""}`} aria-hidden={!isOpen}>
        <div className="cart-drawer-head">
          <div className="eyebrow" style={{ marginBottom: 0 }}>
            Your Cart{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ""}
          </div>
          <button className="icon-btn" aria-label="Close cart" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="cart-drawer-body">
          {!cart || cart.items.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              Your cart is empty. Add something from the{" "}
              <a href="/merch" onClick={close} style={{ color: "var(--accent)" }}>
                merch shop
              </a>
              .
            </p>
          ) : (
            cart.items.map((item) => (
              <div className="cart-item" key={item.variantId}>
                <div className="cart-item-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image.url} alt={item.image.alt} />
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.productName}</div>
                  {item.variantName && item.variantName !== item.productName && (
                    <div className="cart-item-variant">{item.variantName}</div>
                  )}
                  <div className="cart-item-row">
                    <div className="cart-qty">
                      <button
                        aria-label="Decrease quantity"
                        disabled={loading}
                        onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        disabled={loading}
                        onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-item-price">
                      ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  <button
                    className="cart-item-remove"
                    disabled={loading}
                    onClick={() => setQuantity(item.variantId, 0)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="cart-drawer-foot">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <strong>${cart.subtotal}</strong>
            </div>
            <a
              className="btn btn-primary btn-block"
              href={checkoutUrl ?? "#"}
              target="_blank"
              rel="noopener"
            >
              Checkout
            </a>
            <p className="cart-drawer-note">Shipping and taxes calculated at checkout.</p>
          </div>
        )}
      </aside>
    </>
  );
}
