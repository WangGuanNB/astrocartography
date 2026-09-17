import type { Metadata } from "next";
import Pricing from "@/components/blocks/pricing";
import { getCanonicalUrl } from "@/lib/utils";
import { getPricingPage } from "@/services/page";
import { applySubscriptionPricingFilter } from "@/services/subscription";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPricingPage(locale);
  const pageTitle = page.pricing?.title || "Pricing";
  const pageDescription =
    page.pricing?.description ||
    "Choose a one-time plan or Plus for ongoing relocation research.";

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      type: "website",
      url: getCanonicalUrl(locale, "/pricing/research"),
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
    },
    robots: {
      index: false,
      follow: true,
    },
    alternates: { canonical: getCanonicalUrl(locale, "/pricing/research") },
  };
}

export default async function ResearchPricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getPricingPage(locale);
  const pricing = page.pricing
    ? applySubscriptionPricingFilter(page.pricing, { surface: "research" }) ??
      page.pricing
    : undefined;

  return (
    <>
      {pricing && (
        <Pricing pricing={pricing} preferredProductId="plus-monthly" />
      )}
    </>
  );
}
