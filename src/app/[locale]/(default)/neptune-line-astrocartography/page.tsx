import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getLinesBreadcrumbLabels } from "@/lib/lines-breadcrumb";
import { getNeptuneLinePage } from "@/services/page";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import GuideHero from "@/components/blocks/guide-hero";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = false;

const PATH = "/neptune-line-astrocartography";
const LOCALES = ["en", "zh", "pt", "es", "it", "de"] as const;

const heroCopyByLocale = {
  en: {
    badge: "Neptune Line Guide",
    overviewEyebrow: "Guide overview",
    overviewTitle: "Neptune Line",
    overviewItems: [
      { label: "Core energy", value: "Imagination and fog" },
      { label: "Best for", value: "Art, empathy, and inspiration" },
      { label: "Watch for", value: "Idealizing and unclear boundaries" },
      { label: "Angles", value: "ASC, DSC, MC, and IC" },
    ],
    actions: [
      { title: "Find Your Neptune Line", url: "/", icon: "RiArrowRightLine" },
      { title: "Compare All Lines", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  zh: {
    badge: "海王星线指南",
    overviewEyebrow: "指南概览",
    overviewTitle: "海王星线",
    overviewItems: [
      { label: "核心主题", value: "想象与模糊" },
      { label: "适合", value: "艺术、共情与灵感" },
      { label: "注意", value: "理想化与边界不清" },
      { label: "角点", value: "ASC、DSC、MC、IC" },
    ],
    actions: [
      { title: "查看你的海王星线", url: "/", icon: "RiArrowRightLine" },
      { title: "比较全部行星线", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  pt: {
    badge: "Guia da linha de Netuno",
    overviewEyebrow: "Resumo do guia",
    overviewTitle: "Linha de Netuno",
    overviewItems: [
      { label: "Tema central", value: "Imaginação e névoa" },
      { label: "Melhor para", value: "Arte, empatia e inspiração" },
      { label: "Atenção", value: "Idealização e limites pouco claros" },
      { label: "Ângulos", value: "ASC, DSC, MC e IC" },
    ],
    actions: [
      { title: "Ver sua linha de Netuno", url: "/", icon: "RiArrowRightLine" },
      { title: "Comparar todas as linhas", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  es: {
    badge: "Guía de la línea de Neptuno",
    overviewEyebrow: "Resumen de la guía",
    overviewTitle: "Línea de Neptuno",
    overviewItems: [
      { label: "Tema central", value: "Imaginación y niebla" },
      { label: "Mejor para", value: "Arte, empatía e inspiración" },
      { label: "Cuidado con", value: "Idealizar y límites poco claros" },
      { label: "Ángulos", value: "ASC, DSC, MC e IC" },
    ],
    actions: [
      { title: "Ver tu línea de Neptuno", url: "/", icon: "RiArrowRightLine" },
      { title: "Comparar todas las líneas", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  it: {
    badge: "Guida alla linea di Nettuno",
    overviewEyebrow: "Panoramica guida",
    overviewTitle: "Linea di Nettuno",
    overviewItems: [
      { label: "Tema centrale", value: "Immaginazione e nebbia" },
      { label: "Ideale per", value: "Arte, empatia e ispirazione" },
      { label: "Attenzione a", value: "Idealizzazione e confini poco chiari" },
      { label: "Angoli", value: "ASC, DSC, MC e IC" },
    ],
    actions: [
      { title: "Vedi la tua linea di Nettuno", url: "/", icon: "RiArrowRightLine" },
      { title: "Confronta tutte le linee", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  de: {
    badge: "Neptun-Linie Leitfaden",
    overviewEyebrow: "Leitfaden-Überblick",
    overviewTitle: "Neptun-Linie",
    overviewItems: [
      { label: "Kernthema", value: "Fantasie und Nebel" },
      { label: "Gut für", value: "Kunst, Empathie und Inspiration" },
      { label: "Achte auf", value: "Idealisierung und unklare Grenzen" },
      { label: "Achsen", value: "ASC, DSC, MC und IC" },
    ],
    actions: [
      { title: "Deine Neptun-Linie ansehen", url: "/", icon: "RiArrowRightLine" },
      { title: "Alle Linien vergleichen", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
};

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getNeptuneLinePage(locale);
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
      type: "website",
      url: getCanonicalUrl(locale, PATH),
      siteName: "Astrocarto.org",
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

export default async function NeptuneLinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getNeptuneLinePage(locale);
  const crumbs = getLinesBreadcrumbLabels(locale, "neptune");
  const h1Title = page.metadata.title.split(" - ")[0].replace(/\s+\d{4}$/, "").trim();
  const heroCopy = heroCopyByLocale[locale as keyof typeof heroCopyByLocale] ?? heroCopyByLocale.en;

  return (
    <>
      <GuideHero
        badge={heroCopy.badge}
        badgeIcon="RiDropLine"
        title={h1Title}
        description={page.intentAnchor?.text}
        overviewTitle={heroCopy.overviewTitle}
        overviewEyebrow={heroCopy.overviewEyebrow}
        overviewIcon="RiDropLine"
        overviewItems={heroCopy.overviewItems}
        actions={heroCopy.actions}
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
            author: { "@type": "Organization", name: "Astrocarto.org", url: getCanonicalUrl("en", "/") },
            publisher: { "@type": "Organization", name: "Astrocarto.org", url: getCanonicalUrl("en", "/") },
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
              { "@type": "ListItem", position: 1, name: crumbs.home, item: getCanonicalUrl(locale, "/") },
              { "@type": "ListItem", position: 2, name: crumbs.hub, item: getCanonicalUrl(locale, "/astrocartography-lines") },
              { "@type": "ListItem", position: 3, name: crumbs.current, item: getCanonicalUrl(locale, PATH) },
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
