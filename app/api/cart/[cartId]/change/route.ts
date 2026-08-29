import { NextRequest, NextResponse } from "next/server";
import { changeCartQuantity } from "@/lib/fourthwall";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cartId: string }> }
) {
  const { cartId } = await params;
  const { variantId, quantity } = await req.json();
  if (!variantId || quantity === undefined) {
    return NextResponse.json({ error: "variantId and quantity are required" }, { status: 400 });
  }
  try {
    const cart = await changeCartQuantity(cartId, variantId, quantity);
    return NextResponse.json(cart);
  } catch (err) {
    console.error("changeCartQuantity failed", err);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 502 });
  }
}
