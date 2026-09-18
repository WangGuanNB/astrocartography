import type { Metadata } from "next";
import Pricing from "@/components/blocks/pricing";
import FAQ from "@/components/blocks/faq";
import { getCanonicalUrl } from "@/lib/utils";
import { PricingPage } from "@/types/pages/landing";
import { applySubscriptionPricingFilter } from "@/services/subscription";

/**
 * Research-specific pricing page.
 *
 * Reads from src/i18n/pages/pricing/research/<locale>.json instead of the
 * general pricing JSON, so we can iterate on research offers without touching
 * the main /pricing page.
 */
async function getResearchPricingPage(locale: string): Promise<PricingPage> {
  try {
    if (locale === "zh-CN") {
      locale = "zh";
    }
    const normalizedLocale = locale.toLowerCase();
    const mod = await import(
      `@/i18n/pages/pricing/research/${normalizedLocale}.json`
    );
    return mod.default as PricingPage;
  } catch {
    const fallback = await import(
      `@/i18n/pages/pricing/research/en.json`
    );
    return fallback.default as PricingPage;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getResearchPricingPage(locale);
  const pageTitle = page.pricing?.title || "Research Pricing";
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
  const page = await getResearchPricingPage(locale);
  const pricing = page.pricing
    ? applySubscriptionPricingFilter(page.pricing, { surface: "research" }) ??
      page.pricing
    : undefined;

  return (
    <>
      {pricing && (
        <Pricing pricing={pricing} preferredProductId="plus-monthly" />
      )}
      {page.faq && <FAQ section={page.faq} />}
    </>
  );
}
