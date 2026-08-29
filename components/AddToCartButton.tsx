"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const { addItem } = useCart();
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  async function handleClick() {
    if (state === "adding") return;
    setState("adding");
    try {
      await addItem(variantId);
      setState("added");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      className="cart-btn"
      aria-label="Add to cart"
      onClick={handleClick}
      disabled={state === "adding"}
    >
      {state === "added" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
          <path d="M2 3h2l2.6 12.4A2 2 0 0 0 8.5 17h9a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
      )}
    </button>
  );
}
