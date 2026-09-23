import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import { getLinesBreadcrumbLabels } from "@/lib/lines-breadcrumb";
import { getUranusLinePage } from "@/services/page";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import GuideHero from "@/components/blocks/guide-hero";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/uranus-line-astrocartography";
const LOCALES = ["en", "zh", "pt", "es", "it", "de"];

const heroCopyByLocale = {
  en: {
    badge: "Uranus Line Guide",
    overviewEyebrow: "Guide overview",
    overviewTitle: "Uranus Line",
    overviewItems: [
      { label: "Core energy", value: "Freedom and reinvention" },
      { label: "Best for", value: "Breakthroughs and fresh starts" },
      { label: "Watch for", value: "Instability and sudden changes" },
      { label: "Angles", value: "ASC, DSC, MC, and IC" },
    ],
    actions: [
      { title: "Find Your Uranus Line", url: "/", icon: "RiArrowRightLine" },
      { title: "Compare All Lines", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  zh: {
    badge: "天王星线指南",
    overviewEyebrow: "指南概览",
    overviewTitle: "天王星线",
    overviewItems: [
      { label: "核心能量", value: "自由与自我重塑" },
      { label: "适合", value: "突破、创新和全新开始" },
      { label: "注意", value: "不稳定和突然变化" },
      { label: "角点", value: "ASC、DSC、MC、IC" },
    ],
    actions: [
      { title: "找到你的天王星线", url: "/", icon: "RiArrowRightLine" },
      { title: "比较全部行星线", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  pt: {
    badge: "Guia da linha de Urano",
    overviewEyebrow: "Resumo do guia",
    overviewTitle: "Linha de Urano",
    overviewItems: [
      { label: "Energia central", value: "Liberdade e reinvenção" },
      { label: "Melhor para", value: "Rupturas e novos começos" },
      { label: "Atenção", value: "Instabilidade e mudanças repentinas" },
      { label: "Ângulos", value: "ASC, DSC, MC e IC" },
    ],
    actions: [
      { title: "Encontrar sua linha de Urano", url: "/", icon: "RiArrowRightLine" },
      { title: "Comparar todas as linhas", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  es: {
    badge: "Guía de la línea de Urano",
    overviewEyebrow: "Resumen de la guía",
    overviewTitle: "Línea de Urano",
    overviewItems: [
      { label: "Energía central", value: "Libertad y reinvención" },
      { label: "Mejor para", value: "Avances y nuevos comienzos" },
      { label: "Cuidado con", value: "Inestabilidad y cambios repentinos" },
      { label: "Ángulos", value: "ASC, DSC, MC e IC" },
    ],
    actions: [
      { title: "Encontrar tu línea de Urano", url: "/", icon: "RiArrowRightLine" },
      { title: "Comparar todas las líneas", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  it: {
    badge: "Guida alla linea di Urano",
    overviewEyebrow: "Panoramica guida",
    overviewTitle: "Linea di Urano",
    overviewItems: [
      { label: "Energia centrale", value: "Libertà e reinvenzione" },
      { label: "Ideale per", value: "Svolte e nuovi inizi" },
      { label: "Attenzione a", value: "Instabilità e cambiamenti improvvisi" },
      { label: "Angoli", value: "ASC, DSC, MC e IC" },
    ],
    actions: [
      { title: "Trova la tua linea di Urano", url: "/", icon: "RiArrowRightLine" },
      { title: "Confronta tutte le linee", url: "/astrocartography-lines", icon: "RiRouteLine", variant: "secondary" as const },
    ],
  },
  de: {
    badge: "Uranus-Linie Leitfaden",
    overviewEyebrow: "Leitfaden-Überblick",
    overviewTitle: "Uranus-Linie",
    overviewItems: [
      { label: "Kernenergie", value: "Freiheit und Neuerfindung" },
      { label: "Gut für", value: "Durchbrüche und Neuanfänge" },
      { label: "Achte auf", value: "Instabilität und plötzliche Änderungen" },
      { label: "Achsen", value: "ASC, DSC, MC und IC" },
    ],
    actions: [
      { title: "Deine Uranus-Linie finden", url: "/", icon: "RiArrowRightLine" },
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
  const page = await getUranusLinePage(locale);
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

export default async function UranusLinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getUranusLinePage(locale);
  const crumbs = getLinesBreadcrumbLabels(locale, "uranus");
  const h1Title = page.metadata.title.split(" - ")[0].replace(/\s+\d{4}$/, "").trim();
  const heroCopy = heroCopyByLocale[locale as keyof typeof heroCopyByLocale] ?? heroCopyByLocale.en;

  return (
    <>
      <GuideHero
        badge={heroCopy.badge}
        badgeIcon="RiFlashlightLine"
        title={h1Title}
        description={page.intentAnchor?.text}
        overviewTitle={heroCopy.overviewTitle}
        overviewEyebrow={heroCopy.overviewEyebrow}
        overviewIcon="RiFlashlightLine"
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
