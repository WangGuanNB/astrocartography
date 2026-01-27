import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getBirthChartPage } from "@/services/page";
import BirthChartClient from "../birth-chart/birth-chart-client";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import { Link } from "@/i18n/navigation";

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

  const page = await getBirthChartPage(locale);
  const title = page.metadata.title;
  const description = page.metadata.description;
  const keywords = page.metadata.keywords || "";
  const path = "/tools/birth-chart-generator";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, path),
      languages: {
        'en': getCanonicalUrl('en', path),
        'zh': getCanonicalUrl('zh', path),
        'pt': getCanonicalUrl('pt', path),
        'es': getCanonicalUrl('es', path),
        'it': getCanonicalUrl('it', path),
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

export default async function BirthChartGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getBirthChartPage(locale);

  const getH1Title = (title: string): string => {
    // Support common separators used in SEO titles: " — ", " – ", " - "
    const idx = title.search(/\s[—–]\s|\s-\s/);
    const base = idx >= 0 ? title.slice(0, idx).trim() : title.trim();
    return base.replace(/\s+\d{4}$/, "").trim();
  };
  const h1Title = getH1Title(page.metadata.title);

  return (
    <>
      <div className="container max-w-4xl px-4 pt-6 pb-4 lg:pt-12 lg:pb-6">
        <h1 className="text-center text-white text-2xl font-bold leading-tight lg:text-4xl lg:leading-relaxed">
          {h1Title}
        </h1>
      </div>

      {/* Intent anchor (SEO) */}
      {page.intentAnchor && (
        <div className="container max-w-4xl px-4 pb-4 lg:pb-6">
          <p className="text-center text-white text-sm font-medium leading-relaxed lg:text-xl lg:leading-snug">
            {page.intentAnchor.text}
          </p>
        </div>
      )}

      {/* Internal links */}
      {page.internalLinks && (
        <div className="container max-w-4xl px-4 pb-8">
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
        <BirthChartClient />
      </div>

      {/* What / Why / How / Features / FAQ / CTA (SEO content blocks) */}
      {page.introduce && <FeatureWhatTwo section={page.introduce} />}
      {page.benefit && <Feature2 section={page.benefit} />}
      {page.usage && <Feature3 section={page.usage} />}
      {page.feature && <Feature section={page.feature} />}
      {page.faq && <FAQ section={page.faq} />}
      {page.cta && <CTA section={page.cta} />}

      {/* Structured data: WebApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Birth Chart Generator",
            description: page.metadata.description,
            url: getCanonicalUrl(locale, "/tools/birth-chart-generator"),
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web Browser",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            featureList: [
              "Birth chart wheel (natal chart)",
              "Planet positions and zodiac signs",
              "Houses (Whole Sign)",
              "One‑click handoff to Astrocartography map",
            ],
            creator: {
              "@type": "Organization",
              name: "Astrocartography Calculator",
            },
          }),
        }}
      />

      {/* Structured data: BreadcrumbList */}
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
                name: "Tools",
                item: getCanonicalUrl(locale, "/tools/birth-chart-generator"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "Birth Chart Generator",
                item: getCanonicalUrl(locale, "/tools/birth-chart-generator"),
              },
            ],
          }),
        }}
      />

      {/* Structured data: FAQPage */}
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

