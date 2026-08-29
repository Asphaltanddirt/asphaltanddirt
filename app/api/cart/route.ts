import { NextRequest, NextResponse } from "next/server";
import { createCart } from "@/lib/fourthwall";

export async function POST(req: NextRequest) {
  const { variantId, quantity } = await req.json();
  if (!variantId) {
    return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  }
  try {
    const cart = await createCart(variantId, quantity ?? 1);
    return NextResponse.json(cart);
  } catch (err) {
    console.error("createCart failed", err);
    return NextResponse.json({ error: "Failed to create cart" }, { status: 502 });
  }
}
