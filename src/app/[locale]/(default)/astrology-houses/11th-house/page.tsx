import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getAstrologyHouses11thHousePage } from "@/services/page";
import HouseGuideComposer from "@/components/astrology-houses/house-guide-composer";
import type { HouseGuidePage } from "@/types/pages/house-guide";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/astrology-houses/11th-house";
const LOCALES = ["en", "zh", "pt", "es", "it", "de"];

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = (await getAstrologyHouses11thHousePage(locale)) as HouseGuidePage;
  const { title, description, keywords } = page.metadata;
  const ogImage =
    page.metadata.ogImage ||
    page.meaning?.image?.src ||
    "/imgs/features/hero-web.webp";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, PATH),
      languages: {
        en: getCanonicalUrl("en", PATH),
        zh: getCanonicalUrl("zh", PATH),
        pt: getCanonicalUrl("pt", PATH),
        es: getCanonicalUrl("es", PATH),
        it: getCanonicalUrl("it", PATH),
        de: getCanonicalUrl("de", PATH),
        "x-default": getCanonicalUrl("en", PATH),
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: getCanonicalUrl(locale, PATH),
      siteName: "Astrocartography Calculator",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function AstrologyHouses11thHousePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = (await getAstrologyHouses11thHousePage(locale)) as HouseGuidePage;

  return <HouseGuideComposer page={page} locale={locale} path={PATH} />;
}
