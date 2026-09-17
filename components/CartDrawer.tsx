"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "./CartContext";

/**
 * The cart is a modal dialog: focus moves in when it opens, Tab stays inside,
 * Escape closes it, the page behind can't be reached, and focus returns to
 * whatever opened it.
 */
export default function CartDrawer() {
  const { cart, loading, isOpen, close, setQuantity, checkoutUrl, referralCode } = useCart();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The context hands out a fresh close() each render; keep the latest in a
  // ref so the dialog effect only runs on open/close, not on every cart update.
  const closeLatest = useRef(close);
  useEffect(() => {
    closeLatest.current = close;
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    // Everything else on the page goes inert while the cart is open.
    const background = Array.from(document.body.children).filter(
      (el) => el !== drawer && !el.classList.contains("cart-overlay") && el.tagName !== "SCRIPT",
    );
    background.forEach((el) => el.setAttribute("inert", ""));
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLatest.current();
        return;
      }
      if (e.key !== "Tab" || !drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      background.forEach((el) => el.removeAttribute("inert"));
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  return (
    <>
      <div className={`cart-overlay${isOpen ? " open" : ""}`} onClick={close} />
      <aside
        ref={drawerRef}
        className={`cart-drawer${isOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="cart-drawer-head">
          <h2 id="cart-drawer-title" className="eyebrow" style={{ marginBottom: 0 }}>
            Your Cart{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ""}
          </h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close cart" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="cart-drawer-body">
          {!cart || cart.items.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              Your cart is empty. Add something from the{" "}
              <Link href="/merch" onClick={close} style={{ color: "var(--accent)" }}>
                merch shop
              </Link>
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
            <p className="cart-drawer-note">
              {referralCode && <>Crew code {referralCode} is applied at checkout. </>}
              Shipping and taxes calculated at checkout.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
