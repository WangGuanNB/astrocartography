import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getLocationalAstrologyPage } from "@/services/page";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import GuideHero from "@/components/blocks/guide-hero";
import GuideUserPaths from "@/components/blocks/guide-user-paths";
import MiniaturaAIGenerator from "@/components/blocks/miniatur-ai-generator/loadable";
import { defaultLocale, locales } from "@/i18n/locale";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = false;

const PATH = "/locational-astrology";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getLocationalAstrologyPage(locale);
  const { title, description, keywords } = page.metadata;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, PATH),
      languages: {
        ...Object.fromEntries(
          locales.map((language) => [language, getCanonicalUrl(language, PATH)])
        ),
        "x-default": getCanonicalUrl(defaultLocale, PATH),
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, PATH),
      siteName: "Astrocarto.org",
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

export default async function LocationalAstrologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLocationalAstrologyPage(locale);
  const h1Title =
    page.heading?.title ||
    "Locational Astrology: Maps, Relocation Charts, and Methods";
  const guideHero = page.guideHero;

  return (
    <>
      <GuideHero
        badge={guideHero?.badge ?? "Methods guide"}
        badgeIcon="RiCompassLine"
        title={h1Title}
        description={page.intentAnchor?.text}
        overviewTitle={guideHero?.overviewTitle ?? "Choose a method"}
        overviewEyebrow={guideHero?.overviewEyebrow}
        overviewIcon="RiCompassLine"
        overviewItems={
          guideHero?.overviewItems ?? [
            { label: "Start with", value: "The question you are actually asking" },
            { label: "World scan", value: "Astrocartography map" },
            { label: "One city", value: "Relocation chart" },
            { label: "Not offered here", value: "Local Space directions" },
          ]
        }
        actions={
          guideHero?.actions ?? [
            {
              title: "Generate Your Free Astrocartography Map",
              url: "#generator",
              icon: "RiArrowRightLine",
            },
            {
              title: "Open the Relocation Chart",
              url: "/relocation-chart-calculator",
              icon: "RiPieChartLine",
              variant: "secondary",
            },
          ]
        }
      />

      <section className="border-b border-white/10 bg-background">
        <div className="container max-w-3xl px-4 pt-12 text-center lg:pt-16">
          <p className="text-base leading-8 text-muted-foreground">
            {page.generatorNote}
          </p>
        </div>
        <MiniaturaAIGenerator />
      </section>

      {page.methodTable && (
        <section className="bg-background py-16 lg:py-20">
          <div className="container max-w-6xl px-4">
            <h2 className="text-balance text-3xl font-bold text-white lg:text-4xl">
              {page.methodTable.title}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
              {page.methodTable.description}
            </p>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-white/[0.04] text-white">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">{page.methodTable.columns.method}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{page.methodTable.columns.question}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{page.methodTable.columns.output}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{page.methodTable.columns.offered}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.methodTable.rows.map((row) => (
                    <tr key={row.method} className="border-t border-white/10 align-top">
                      <th scope="row" className="px-4 py-4 font-semibold text-white">{row.method}</th>
                      <td className="px-4 py-4 leading-6 text-muted-foreground">{row.question}</td>
                      <td className="px-4 py-4 leading-6 text-muted-foreground">{row.output}</td>
                      <td className="px-4 py-4 leading-6 text-muted-foreground">{row.offered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {page.userPaths && <GuideUserPaths section={page.userPaths} />}
      {page.introduce && <FeatureWhatTwo section={page.introduce} />}
      {page.feature && <Feature section={page.feature} />}
      {page.usage && <Feature3 section={page.usage} />}
      {page.faq && <FAQ section={page.faq} />}
      {page.cta && <CTA section={page.cta} />}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: h1Title,
            description: page.metadata.description,
            url: getCanonicalUrl(locale, PATH),
            author: {
              "@type": "Organization",
              name: "Astrocarto.org",
              url: getCanonicalUrl("en", "/"),
            },
            publisher: {
              "@type": "Organization",
              name: "Astrocarto.org",
              url: getCanonicalUrl("en", "/"),
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
              {
                "@type": "ListItem",
                position: 1,
                name: page.schemaLabels?.breadcrumbHome || "Home",
                item: getCanonicalUrl(locale, "/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: page.schemaLabels?.breadcrumbCurrent || h1Title,
                item: getCanonicalUrl(locale, PATH),
              },
            ],
          }),
        }}
      />

      {page.faq?.items && page.faq.items.length > 0 && (
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
