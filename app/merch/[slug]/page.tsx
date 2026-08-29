import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/fourthwall";
import ProductDetailClient from "@/components/ProductDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) return {};

  const plainDescription = product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: `${product.name} | Asphalt & Dirt`,
    description: plainDescription.slice(0, 160),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
