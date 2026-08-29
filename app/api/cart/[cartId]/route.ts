import { NextRequest, NextResponse } from "next/server";
import { getCart } from "@/lib/fourthwall";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cartId: string }> }
) {
  const { cartId } = await params;
  const cart = await getCart(cartId);
  if (!cart) {
    return NextResponse.json({ error: "Cart not found" }, { status: 404 });
  }
  return NextResponse.json(cart);
}
