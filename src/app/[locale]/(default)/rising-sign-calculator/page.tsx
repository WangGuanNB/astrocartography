import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getRisingSignPage } from "@/services/page";
import RisingSignCalculatorClient from "./rising-sign-calculator-client";
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
    { locale: "es" },
    { locale: "it" },
    { locale: "pt" },
    { locale: "zh" },
    { locale: "de" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getRisingSignPage(locale);
  const title = page.metadata.title;
  const description = page.metadata.description;
  const keywords = page.metadata.keywords || "";
  const path = "/rising-sign-calculator";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, path),
      languages: {
        en: getCanonicalUrl("en", path),
        zh: getCanonicalUrl("zh", path),
        pt: getCanonicalUrl("pt", path),
        es: getCanonicalUrl("es", path),
        it: getCanonicalUrl("it", path),
        de: getCanonicalUrl("de", path),
        "x-default": getCanonicalUrl("en", path),
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, path),
      siteName: "Astrocartography Calculator",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

type PageWithTool = Awaited<ReturnType<typeof getRisingSignPage>> & {
  tool: {
    form: { birthDate: string; birthTime: string; birthLocation: string; timezone: string; submit: string };
    result: {
      title: string;
      sign: string;
      degree: string;
      ruler: string;
      interpretation: string;
      timeAccuracyNote: string;
      bigThreeTitle: string;
      sun: string;
      moon: string;
      rising: string;
      anglesTitle: string;
      asc: string;
      dsc: string;
      mc: string;
      ic: string;
      housesTitle: string;
      housesSubtitle: string;
      houseLabel: string;
      rulerHook: string;
      methodologyNote: string;
      cuspWarningEarly: string;
      cuspWarningLate: string;
      rulersTitle: string;
      modernRulerLabel: string;
      traditionalRulerLabel: string;
      firstHouseTitle: string;
      firstHouseSubtitle: string;
      firstHouseEmpty: string;
      ascAspectsTitle: string;
      ascAspectsSubtitle: string;
      noAscAspects: string;
      geoTitle: string;
      geoSubtitle: string;
      ctaChart: string;
      ctaAskAi: string;
    };
    deepReport: {
      title: string;
      subtitle: string;
      unlock: string;
      unlocking: string;
      creditsBadge: string;
      includes: string[];
      guideBigThree: string;
      guideModifiers: string;
      guideHouses: string;
      stickyCta: string;
      loginRequired: string;
      genericError: string;
      prompt: string;
    };
    errors: { required: string; location: string; generic: string };
    interpretations?: Record<string, string>;
  };
};

export default async function RisingSignCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = (await getRisingSignPage(locale)) as PageWithTool;

  const getH1Title = (title: string): string => {
    const idx = title.search(/\s[—–]\s|\s-\s/);
    const base = idx >= 0 ? title.slice(0, idx).trim() : title.trim();
    return base.replace(/\s+\d{4}$/, "").trim();
  };
  const h1Title = getH1Title(page.metadata.title);

  if (!page.tool) {
    throw new Error("Rising sign calculator page is missing tool labels. Check rising-sign-calculator/en.json.");
  }

  return (
    <>
      <div className="container max-w-4xl px-4 pt-20 pb-5 lg:pt-24 lg:pb-7">
        <h1 className="text-center text-white text-2xl font-bold leading-tight lg:text-4xl lg:leading-relaxed">
          {h1Title}
        </h1>
      </div>

      {page.intentAnchor && (
        <div className="container max-w-4xl px-4 pb-6 lg:pb-7">
          <p className="text-center text-white text-sm font-medium leading-relaxed lg:text-xl lg:leading-snug">
            {page.intentAnchor.text}
          </p>
        </div>
      )}

      {page.internalLinks && (
        <div className="container max-w-4xl px-4 pb-12 lg:pb-16">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:gap-6">
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
        <RisingSignCalculatorClient tool={page.tool} />
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
            name: "Rising Sign Calculator",
            description: page.metadata.description,
            url: getCanonicalUrl(locale, "/rising-sign-calculator"),
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web Browser",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            featureList: [
              "Ascendant (rising sign) by birth time and location",
              "Ruling planet and short interpretation",
              "Rising sign by city (geographic perspective)",
              "One-click handoff to Astrocartography map",
            ],
            creator: {
              "@type": "Organization",
              name: "Astrocartography Calculator",
            },
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
              {
                "@type": "ListItem",
                position: 2,
                name: "Rising Sign Calculator",
                item: getCanonicalUrl(locale, "/rising-sign-calculator"),
              },
            ],
          }),
        }}
      />

      {page.faq && page.faq.items && page.faq.items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: page.faq.items.map((item) => ({
                "@type": "Question",
                name: item.title,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.description,
                },
              })),
            }),
          }}
        />
      )}
    </>
  );
}
