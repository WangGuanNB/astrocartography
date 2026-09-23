import { Metadata } from "next";
import Pricing from "@/components/blocks/pricing";
import FAQ from "@/components/blocks/faq";
import { getPricingPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";
import { applySubscriptionPricingFilter } from "@/services/subscription";
import { locales } from "@/i18n/locale";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/pricing";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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
      url: getCanonicalUrl(locale, PATH),
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
      canonical: getCanonicalUrl(locale, PATH),
      languages: {
        ...Object.fromEntries(
          locales.map((language) => [language, getCanonicalUrl(language, PATH)])
        ),
        "x-default": getCanonicalUrl("en", PATH),
      },
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
    ? applySubscriptionPricingFilter(page.pricing, { surface: "research" }) ??
      page.pricing
    : undefined;

  return (
    <>
      {pricing && <Pricing pricing={pricing} />}
      {page.faq && <FAQ section={page.faq} />}
    </>
  );
}
