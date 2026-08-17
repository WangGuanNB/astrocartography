import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getPlanetaryPositionsTodayPage } from "@/services/page";
import PlanetaryPositionsTodayClient from "./planetary-positions-today-client";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import MethodologyBlock from "@/components/blocks/methodology";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const LOCALES = ["en", "zh", "pt", "es", "it", "de"] as const;
const PATH = "/planetary-positions-today";

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPlanetaryPositionsTodayPage(locale);
  const title = page.metadata.title;
  const description = page.metadata.description;
  const keywords = page.metadata.keywords || "";

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
      },
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

type PageWithTool = Awaited<ReturnType<typeof getPlanetaryPositionsTodayPage>> & {
  tool: {
    form: {
      date: string;
      time: string;
      submit: string;
      now: string;
      calculating: string;
    };
    result: {
      title: string;
      timestampLabel: string;
      systemNote: string;
      planet: string;
      sign: string;
      degree: string;
      direction: string;
      direct: string;
      retrograde: string;
      aspectsTitle: string;
      aspect: string;
      orb: string;
      ctaTransit: string;
      ctaNatal: string;
    };
    errors: { invalid: string; generic: string };
  };
};

export default async function PlanetaryPositionsTodayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = (await getPlanetaryPositionsTodayPage(locale)) as PageWithTool;

  const getH1Title = (title: string): string => {
    const idx = title.search(/\s[—–]\s|\s-\s/);
    const base = idx >= 0 ? title.slice(0, idx).trim() : title.trim();
    return base.replace(/\s+\d{4}$/, "").trim();
  };
  const h1Title = getH1Title(page.metadata.title);

  if (!page.tool) {
    throw new Error("Planetary positions today page is missing tool labels. Check planetary-positions-today/en.json.");
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
        <PlanetaryPositionsTodayClient tool={page.tool} />
      </div>

      {page.methodology && <MethodologyBlock section={page.methodology} />}

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
            name: "Planetary Positions Today",
            description: page.metadata.description,
            url: getCanonicalUrl(locale, PATH),
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web Browser",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Current tropical planetary positions without birth data",
              "Sign, degree, and retrograde for Sun through Pluto",
              "Optional date and time for another moment",
              "Current sky aspects with standard orbs",
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
              {
                "@type": "ListItem",
                position: 2,
                name: "Planetary Positions Today",
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
                acceptedAnswer: { "@type": "Answer", text: item.description },
              })),
            }),
          }}
        />
      )}
    </>
  );
}
