import { NextRequest, NextResponse } from "next/server";
import { addToCart } from "@/lib/fourthwall";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cartId: string }> }
) {
  const { cartId } = await params;
  const { variantId, quantity } = await req.json();
  if (!variantId) {
    return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  }
  try {
    const cart = await addToCart(cartId, variantId, quantity ?? 1);
    return NextResponse.json(cart);
  } catch (err) {
    console.error("addToCart failed", err);
    return NextResponse.json({ error: "Failed to add to cart" }, { status: 502 });
  }
}
