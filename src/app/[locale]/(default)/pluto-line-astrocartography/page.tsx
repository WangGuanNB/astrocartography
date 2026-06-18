import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getPlutoLinePage } from "@/services/page";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import NextLink from "next/link";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/pluto-line-astrocartography";
const LOCALES = ["en", "zh", "pt", "es", "it", "de"];
const ENGLISH_ONLY_RELATED_PATHS = new Set([
  "/astrocartography-lines",
  "/saturn-line-astrocartography",
]);

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPlutoLinePage(locale);
  const { title, description, keywords } = page.metadata;

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
      images: [
        {
          url: "/imgs/posts/pluto-symbol.webp",
          width: 1200,
          height: 900,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/imgs/posts/pluto-symbol.webp"],
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

export default async function PlutoLinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPlutoLinePage(locale);
  const h1Title = page.metadata.title;

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {page.internalLinks.items.map((item, index) => (
              ENGLISH_ONLY_RELATED_PATHS.has(item.url) ? (
                <NextLink
                  key={index}
                  href={item.url}
                  className="group flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-primary/30 hover:bg-white/10"
                >
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </span>
                  <span className="text-sm font-semibold text-primary group-hover:underline">
                    {item.linkText} →
                  </span>
                </NextLink>
              ) : (
                <Link
                  key={index}
                  href={item.url as any}
                  className="group flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-primary/30 hover:bg-white/10"
                >
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </span>
                  <span className="text-sm font-semibold text-primary group-hover:underline">
                    {item.linkText} →
                  </span>
                </Link>
              )
            ))}
          </div>
        </div>
      )}

      {page.introduce && <FeatureWhatTwo section={page.introduce} compactTop />}
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
                name: "Home",
                item: getCanonicalUrl(locale, "/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Astrocartography Lines",
                item: getCanonicalUrl("en", "/astrocartography-lines"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "Pluto Line",
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
