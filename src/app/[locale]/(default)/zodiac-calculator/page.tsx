import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getZodiacCalculatorPage } from "@/services/page";
import ZodiacCalculatorClient from "./zodiac-calculator-client";
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

const LOCALES = ["en", "zh", "pt", "es", "it", "de"] as const;
const PATH = "/zodiac-calculator";

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getZodiacCalculatorPage(locale);
  const title = page.metadata.title;
  const description = page.metadata.description;
  const keywords = page.metadata.keywords || "";

  const languages = Object.fromEntries(LOCALES.map((lang) => [lang, getCanonicalUrl(lang, PATH)]));

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, PATH),
      languages: { ...languages, "x-default": getCanonicalUrl("en", PATH) },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, PATH),
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

type PageWithTool = Awaited<ReturnType<typeof getZodiacCalculatorPage>> & {
  tool: {
    form: { birthDate: string; submit: string; calculating: string };
    result: {
      title: string;
      sign: string;
      degree: string;
      element: string;
      modality: string;
      ruler: string;
      dateRange: string;
      interpretation: string;
      cuspTitle: string;
      cuspNote: string;
      systemNote: string;
      ctaBirthChart: string;
      ctaRising: string;
    };
    errors: { required: string; generic: string };
    interpretations?: Record<string, string>;
  };
};

export default async function ZodiacCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = (await getZodiacCalculatorPage(locale)) as PageWithTool;

  const getH1Title = (title: string): string => {
    const idx = title.search(/\s[—–]\s|\s-\s/);
    const base = idx >= 0 ? title.slice(0, idx).trim() : title.trim();
    return base.replace(/\s+\d{4}$/, "").trim();
  };
  const h1Title = getH1Title(page.metadata.title);

  if (!page.tool) {
    throw new Error("Zodiac calculator page is missing tool labels. Check zodiac-calculator/en.json.");
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
        <ZodiacCalculatorClient tool={page.tool} />
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
            name: "Zodiac Sign Calculator",
            description: page.metadata.description,
            url: getCanonicalUrl(locale, PATH),
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web Browser",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            featureList: [
              "Sun sign by birth date",
              "Element, modality, and ruling planet",
              "Cusp boundary notes",
              "Handoff to full birth chart and Astrocartography",
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
                name: "Zodiac Sign Calculator",
                item: getCanonicalUrl(locale, PATH),
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
