import { Metadata } from "next";
import Pricing from "@/components/blocks/pricing";
import { getPricingPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";
import { applySubscriptionPricingFilter } from "@/services/subscription";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPricingPage(locale);
  
  const title = page.pricing?.title || "Pricing";
  const description = page.pricing?.description || "Choose the perfect plan for your needs";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, '/pricing'),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: getCanonicalUrl(locale, '/pricing'),
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getPricingPage(locale);
  const pricing = page.pricing
    ? applySubscriptionPricingFilter(page.pricing, { surface: "general" }) ??
      page.pricing
    : undefined;

  return <>{pricing && <Pricing pricing={pricing} />}</>;
}
