import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getSaturnLinePage } from "@/services/page";
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

const PATH = "/saturn-line-astrocartography";
const LOCALES = ["en"];

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getSaturnLinePage(locale);
  const { title, description, keywords } = page.metadata;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale, PATH),
      languages: { en: getCanonicalUrl("en", PATH) },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, PATH),
      siteName: "Astrocartography Calculator",
      images: [{ url: "/imgs/features/hero-web.webp", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/imgs/features/hero-web.webp"] },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function SaturnLinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getSaturnLinePage(locale);
  const h1Title = page.metadata.title.split(" - ")[0].replace(/\s+\d{4}$/, "").trim();

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
              <Link
                key={index}
                href={item.url as any}
                className="group flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 hover:border-primary/30 transition-all"
              >
                <span className="text-xs text-muted-foreground leading-relaxed">{item.text}</span>
                <span className="text-sm font-semibold text-primary group-hover:underline">
                  {item.linkText} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
            author: { "@type": "Organization", name: "Astrocartography Calculator" },
            publisher: { "@type": "Organization", name: "Astrocartography Calculator", url: getCanonicalUrl("en", "/") },
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
              { "@type": "ListItem", position: 2, name: "Astrocartography Lines", item: getCanonicalUrl(locale, "/astrocartography-lines") },
              { "@type": "ListItem", position: 3, name: "Saturn Line", item: getCanonicalUrl(locale, PATH) },
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
