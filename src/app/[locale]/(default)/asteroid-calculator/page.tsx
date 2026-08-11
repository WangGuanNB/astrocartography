import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getPlacementPageContent, SUPPORTED_PLACEMENT_LOCALES } from "@/lib/placement-page-localized-content";
import PlacementPage from "@/components/placement-calculator/placement-page";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

export async function generateStaticParams() {
  return SUPPORTED_PLACEMENT_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const page = getPlacementPageContent("asteroids", locale);
  const path = `/${page.slug}`;
  const languages = Object.fromEntries(
    SUPPORTED_PLACEMENT_LOCALES.map((lang) => [lang, getCanonicalUrl(lang, path)])
  );

  return {
    title: page.metadata.title,
    description: page.metadata.description,
    keywords: page.metadata.keywords,
    alternates: {
      canonical: getCanonicalUrl("en", path),
      languages: { ...languages, "x-default": getCanonicalUrl("en", path) },
    },
    openGraph: {
      title: page.metadata.title,
      description: page.metadata.description,
      type: "website",
      url: getCanonicalUrl("en", path),
      siteName: "Astrocartography Calculator",
    },
    twitter: { card: "summary_large_image", title: page.metadata.title, description: page.metadata.description },
    robots: { index: true, follow: true },
  };
}

export default async function AsteroidCalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = getPlacementPageContent("asteroids", locale);
  return <PlacementPage page={page} locale={locale} />;
}
