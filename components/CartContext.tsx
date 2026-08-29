"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Cart } from "@/lib/fourthwall";

// Same public shop domain as SHOP_DOMAIN in lib/fourthwall.ts — duplicated
// here rather than imported so this client bundle never pulls in the
// server-only cart request code (which reads the storefront token from
// process.env). Not secret; safe to inline.
const SHOP_DOMAIN = "asphalt-and-dirt-shop.fourthwall.com";

const STORAGE_KEY = "ad_cart_id";

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  checkoutUrl: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load any existing cart on first mount. Every state update happens inside
  // the fetch's resolution callback (never synchronously in the effect body)
  // — if there's no stored cart, there's nothing to set at all, since `cart`
  // and `cartId` already default to null.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    fetch(`/api/cart/${stored}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Cart | null) => {
        if (data) {
          setCartId(stored);
          setCart(data);
        } else {
          // Cart expired or was invalid — drop it and start fresh next add.
          window.localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setLoading(true);
      try {
        if (!cartId) {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId, quantity }),
          });
          if (!res.ok) throw new Error("Failed to create cart");
          const data: Cart = await res.json();
          setCart(data);
          setCartId(data.id);
          window.localStorage.setItem(STORAGE_KEY, data.id);
        } else {
          const res = await fetch(`/api/cart/${cartId}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId, quantity }),
          });
          if (!res.ok) throw new Error("Failed to add to cart");
          const data: Cart = await res.json();
          setCart(data);
        }
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [cartId]
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      if (!cartId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/cart/${cartId}/change`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity }),
        });
        if (!res.ok) throw new Error("Failed to update cart");
        const data: Cart = await res.json();
        setCart(data);
      } finally {
        setLoading(false);
      }
    },
    [cartId]
  );

  const checkoutUrl = cartId
    ? `https://${SHOP_DOMAIN}/cart/checkout?cartId=${cartId}&currency=USD`
    : null;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        addItem,
        setQuantity,
        checkoutUrl,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
