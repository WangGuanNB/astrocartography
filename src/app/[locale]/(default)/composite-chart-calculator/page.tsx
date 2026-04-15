import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { getCanonicalUrl } from "@/lib/utils";
import { getCompositeChartPage } from "@/services/page";
import CompositeChartCalculatorClient from "./composite-chart-calculator-client";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [
    { locale: "en" },
    { locale: "zh" },
    { locale: "es" },
    { locale: "it" },
    { locale: "pt" },
    { locale: "de" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getCompositeChartPage(locale);
  const title = page.metadata.title;
  const description = page.metadata.description;
  const keywords = page.metadata.keywords || "";
  const path = "/composite-chart-calculator";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, path),
      languages: {
        en: getCanonicalUrl("en", path),
        zh: getCanonicalUrl("zh", path),
        es: getCanonicalUrl("es", path),
        it: getCanonicalUrl("it", path),
        pt: getCanonicalUrl("pt", path),
        de: getCanonicalUrl("de", path),
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, path),
      siteName: "Astrocartography Calculator",
      images: [
        {
          url: "/imgs/features/hero-web.webp",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/imgs/features/hero-web.webp"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

type PageWithTool = Awaited<ReturnType<typeof getCompositeChartPage>> & {
  tool: {
    form: {
      personA: string;
      personB: string;
      birthDate: string;
      birthTime: string;
      birthLocation: string;
      timezone: string;
      submit: string;
    };
    tabs: { composite: string };
    result: Record<string, string>;
    errors: { required: string; generic: string };
  };
};

export default async function CompositeChartCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = (await getCompositeChartPage(locale)) as PageWithTool;

  const getH1Title = (title: string): string => {
    const idx = title.search(/\s[—–]\s|\s-\s/);
    const base = idx >= 0 ? title.slice(0, idx).trim() : title.trim();
    return base.replace(/\s+\d{4}$/, "").trim();
  };
  const h1Title = getH1Title(page.metadata.title);

  if (!page.tool) {
    throw new Error("Composite chart calculator page is missing tool labels. Check composite-chart-calculator/en.json.");
  }

  const path = "/composite-chart-calculator";

  return (
    <>
      <div className="container max-w-4xl px-4 pt-6 pb-4 lg:pt-12 lg:pb-6">
        <h1 className="text-center text-white text-2xl font-bold leading-tight lg:text-4xl lg:leading-relaxed">
          {h1Title}
        </h1>
      </div>

      {page.intentAnchor && (
        <div className="container max-w-4xl px-4 pb-4 lg:pb-6">
          <p className="text-center text-white text-sm font-medium leading-relaxed lg:text-xl lg:leading-snug">
            {page.intentAnchor.text}
          </p>
        </div>
      )}

      {page.internalLinks && (
        <div className="container max-w-4xl px-4 pb-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
            {page.internalLinks.items.map((item, index) => (
              <Link
                key={index}
                href={item.url as any}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {item.text}{" "}
                <span className="font-semibold text-primary underline">{item.linkText}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="py-6 lg:py-10">
        <CompositeChartCalculatorClient tool={page.tool as ComponentProps<typeof CompositeChartCalculatorClient>["tool"]} />
      </div>

      {page.introduce && <FeatureWhatTwo section={page.introduce} />}
      {page.benefit && <Feature2 section={page.benefit} />}
      {page.usage && <Feature3 section={page.usage} />}
      {page.feature && <Feature section={page.feature} />}
      {page.faq && <FAQ section={page.faq} />}
      {page.cta && <CTA section={page.cta} />}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Composite Chart Calculator",
            description: page.metadata.description,
            url: getCanonicalUrl(locale, path),
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web Browser",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Midpoint composite chart blending two birth charts",
              "Composite planets with all ten points",
              "Major aspects between composite planets",
              "Whole-sign house placements for relationship themes",
              "Visual biwheel showing merged planetary positions",
            ],
            creator: { "@type": "Organization", name: "Astrocartography Calculator" },
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: getCanonicalUrl(locale, "/") },
              { "@type": "ListItem", position: 2, name: "Composite Chart", item: getCanonicalUrl(locale, path) },
            ],
          }),
        }}
      />
    </>
  );
}
