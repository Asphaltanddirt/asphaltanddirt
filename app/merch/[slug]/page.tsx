import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/fourthwall";
import ProductDetailClient from "@/components/ProductDetailClient";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) return {};

  const plainDescription = product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const description = plainDescription.slice(0, 160);
  const url = `${SITE_URL}/merch/${product.slug}`;
  const image = product.colors[0]?.images[0]?.url;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      type: "website",
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
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

  const allSizes = product.colors.flatMap((c) => c.sizes);
  const prices = allSizes.map((s) => Number(s.price));
  const lowPrice = Math.min(...prices).toFixed(2);
  const highPrice = Math.max(...prices).toFixed(2);
  const inStock = allSizes.some((s) => s.inStock);
  const images = Array.from(new Set(product.colors.flatMap((c) => c.images.map((i) => i.url))));
  const plainDescription = product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: plainDescription,
    image: images,
    url: `${SITE_URL}/merch/${product.slug}`,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.colors.length > 1 && {
      color: product.colors.map((c) => c.colorName),
    }),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice,
      highPrice,
      offerCount: allSizes.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/merch/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
