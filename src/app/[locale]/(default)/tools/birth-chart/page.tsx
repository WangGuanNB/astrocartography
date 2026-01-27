import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { redirect } from "next/navigation";

// English-only for now (avoid indexing wrong-language duplicates).
export const dynamic = "force-static";
export const revalidate = 604800; // 7 days
export const dynamicParams = true;

export async function generateStaticParams() {
  return [{ locale: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const path = "/tools/birth-chart-generator";

  return {
    keywords:
      "birth chart generator, free birth chart generator, natal chart generator, birth chart wheel, planet positions, zodiac signs, houses, ascendant calculator",
    alternates: {
      canonical: getCanonicalUrl(locale, path),
    },
    openGraph: {
      type: "website",
      url: getCanonicalUrl(locale, path),
      siteName: "Astrocartography Calculator",
    },
    twitter: {
      card: "summary_large_image",
    },
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function BirthChartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const prefix = locale === "en" ? "" : `/${locale}`;
  redirect(`${prefix}/tools/birth-chart-generator`);
}

