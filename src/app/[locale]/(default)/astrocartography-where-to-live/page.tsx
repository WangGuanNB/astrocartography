import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getAstrocartographyWhereToLivePage } from "@/services/page";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import GuideHero from "@/components/blocks/guide-hero";
import { locales } from "@/i18n/locale";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/astrocartography-where-to-live";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getAstrocartographyWhereToLivePage(locale);
  const { title, description, keywords } = page.metadata;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, PATH),
      languages: Object.fromEntries(
        locales.map((language) => [language, getCanonicalUrl(language, PATH)])
      ),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, PATH),
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

export default async function AstrocartographyWhereToLivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getAstrocartographyWhereToLivePage(locale);

  const h1Title = page.metadata.title.split(" - ")[0].replace(/\s+\d{4}$/, "").trim();
  const guideHero = page.guideHero;

  return (
    <>
      <GuideHero
        badge={guideHero?.badge ?? "Relocation Guide"}
        badgeIcon="RiHomeHeartLine"
        title={h1Title}
        description={page.intentAnchor?.text}
        overviewTitle={guideHero?.overviewTitle ?? "Where to Live"}
        overviewEyebrow={guideHero?.overviewEyebrow}
        overviewIcon="RiHomeHeartLine"
        overviewItems={
          guideHero?.overviewItems ?? [
            { label: "Start with", value: "Birth data and candidate cities" },
            { label: "Compare for", value: "Love, career, home, and growth" },
            { label: "Best use", value: "Shortlist places before deeper research" },
            { label: "Remember", value: "Blend astrology with practical planning" },
          ]
        }
        actions={
          guideHero?.actions ?? [
            { title: "Generate Your Map", url: "/astrocartography-calculator", icon: "RiArrowRightLine" },
            { title: "Compare All Lines", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" },
          ]
        }
        links={page.internalLinks?.items}
      />

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
            "@type": "Article",
            headline: h1Title,
            description: page.metadata.description,
            url: getCanonicalUrl(locale, PATH),
            author: {
              "@type": "Organization",
              name: "Astrocartography Calculator",
            },
            publisher: {
              "@type": "Organization",
              name: "Astrocartography Calculator",
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
