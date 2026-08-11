import { getCanonicalUrl } from "@/lib/utils";
import type { PlacementPageContent, PlacementPageUiContent } from "@/lib/placement-page-content";
import { getPlacementPageUi } from "@/lib/placement-page-localized-content";
import PlacementCalculatorClient from "./placement-calculator-client";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import { Link } from "@/i18n/navigation";

const FEATURE_ICONS = [
  "RiFlashlightLine",
  "RiListCheck",
  "RiMapPinLine",
  "RiCalendarLine",
  "RiGlobalLine",
  "RiArrowRightLine",
];

const ASTEROID_INTRO_IMAGES = [
  {
    src: "/imgs/features/asteroid-calculator-care-and-context.webp",
    alt: "A small asteroid in a calm orbital field with a subtle symbol of nourishment.",
  },
  {
    src: "/imgs/features/asteroid-calculator-pallas-strategy.webp",
    alt: "A faceted asteroid with a clear geometric constellation pattern representing strategy.",
  },
  {
    src: "/imgs/features/asteroid-calculator-juno-commitment.webp",
    alt: "Two small celestial bodies in a balanced orbit around an asteroid.",
  },
  {
    src: "/imgs/features/asteroid-calculator-vesta-focus.webp",
    alt: "A bright asteroid within a quiet halo representing sustained focus.",
  },
  {
    src: "/imgs/features/asteroid-calculator-care-and-context.webp",
    alt: "A small asteroid in a calm orbital field with a subtle symbol of nourishment.",
  },
];

const ASTEROID_BENEFIT_IMAGE = {
  src: "/imgs/features/asteroid-calculator-big-four-overview-v2.webp",
  alt: "Four small asteroids following balanced orbital paths in deep space.",
};

function getH1Title(title: string): string {
  const idx = title.search(/\s[—–]\s|\s-\s/);
  const base = idx >= 0 ? title.slice(0, idx).trim() : title.trim();
  return base.replace(/\s+\d{4}$/, "").trim();
}

function toText(section: PlacementPageContent["sections"][number]) {
  return section.body.join(" ");
}

function shortText(text: string, max = 280) {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const lastStop = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("?"), clipped.lastIndexOf("!"));
  if (lastStop > 120) return clipped.slice(0, lastStop + 1);
  return `${clipped.trim()}...`;
}

function template(text: string, values: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
}

function buildIntro(page: PlacementPageContent, ui: PlacementPageUiContent) {
  const [first, ...rest] = page.sections;
  return {
    name: "introduce",
    title: first?.title || page.hero.title,
    label: ui.introLabel,
    description: first ? shortText(toText(first), 520) : page.hero.subtitle,
    image: {
      src: "/imgs/features/hero-web.webp",
      alt: `${page.hero.title} astrology tool`,
    },
    items: rest.map((section, index) => {
      const image =
        page.key === "asteroids"
          ? ASTEROID_INTRO_IMAGES[index]
          : {
              src: `/imgs/features/${(index % 4) + 1}.webp`,
              alt: `${section.title} explanation`,
            };

      return {
        title: section.title,
        description: toText(section),
        icon: FEATURE_ICONS[index % FEATURE_ICONS.length],
        image,
      };
    }),
  };
}

function buildBenefit(page: PlacementPageContent, h1Title: string, ui: PlacementPageUiContent) {
  const source = page.sections.slice(1, 4);
  return {
    name: "benefit",
    title: template(ui.benefitTitleTemplate, { title: h1Title }),
    label: ui.benefitLabel,
    description: ui.benefitDescription,
    items: source.map((section, index) => ({
      title: section.title,
      description: shortText(toText(section), 230),
      icon: FEATURE_ICONS[index % FEATURE_ICONS.length],
      image:
        page.key === "asteroids"
          ? ASTEROID_BENEFIT_IMAGE
          : {
              src: "/imgs/features/hero-web.webp",
              alt: `${section.title} visual explanation`,
            },
    })),
  };
}

function buildUsage(page: PlacementPageContent, h1Title: string, ui: PlacementPageUiContent) {
  const sectionSummary = page.sections[0] ? shortText(toText(page.sections[0]), 230) : page.hero.subtitle;

  return {
    name: "usage",
    title: template(ui.usageTitleTemplate, { title: h1Title }),
    label: ui.usageLabel,
    description: ui.usageDescription,
    items: ui.usageItems.map((item) => ({
      ...item,
      description: template(item.description, {
        submit: page.form.submit,
        sectionSummary,
      }),
    })),
  };
}

function buildFeature(page: PlacementPageContent, h1Title: string, ui: PlacementPageUiContent) {
  return {
    name: "feature",
    title: template(ui.featureTitleTemplate, { title: h1Title }),
    label: ui.featureLabel,
    description: ui.featureDescription,
    items: ui.featureItems,
  };
}

export default function PlacementPage({ page, locale }: { page: PlacementPageContent; locale: string }) {
  const canonical = getCanonicalUrl(locale, `/${page.slug}`);
  const ui = getPlacementPageUi(locale);
  const h1Title = getH1Title(page.metadata.title);
  const intro = buildIntro(page, ui);
  const benefit = buildBenefit(page, h1Title, ui);
  const usage = buildUsage(page, h1Title, ui);
  const feature = buildFeature(page, h1Title, ui);
  const faq = {
    name: "faq",
    label: ui.faqLabel,
    title: template(ui.faqTitleTemplate, { title: h1Title }),
    description: template(ui.faqDescriptionTemplate, { title: h1Title }),
    items: page.faqs.map((item) => ({
      title: item.question,
      description: item.answer,
    })),
  };
  const cta = {
    name: "cta",
    title: template(ui.ctaTitleTemplate, { title: h1Title }),
    description: ui.ctaDescription,
    buttons: [
      {
        title: ui.ctaButton,
        icon: "RiMapLine",
        url: "/",
        target: "_self",
        variant: "default" as const,
      },
    ],
  };

  return (
    <>
      <div className="container max-w-4xl px-4 pt-20 pb-5 lg:pt-24 lg:pb-7">
        <h1 className="text-center text-white text-2xl font-bold leading-tight lg:text-4xl lg:leading-relaxed">
          {h1Title}
        </h1>
      </div>

      <div className="container max-w-4xl px-4 pb-6 lg:pb-7">
        <p className="text-center text-white text-sm font-medium leading-relaxed lg:text-xl lg:leading-snug">
          {page.hero.subtitle}
        </p>
      </div>

      <div className="container max-w-4xl px-4 pb-12 lg:pb-16">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:gap-6">
          {page.relatedLinks.map((item, index) => (
            <Link
              key={index}
              href={item.url as any}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {item.text} <span className="font-semibold text-primary underline">{item.linkText}</span>
            </Link>
          ))}
        </div>
      </div>

      <PlacementCalculatorClient page={page} />

      <FeatureWhatTwo section={intro} />
      <Feature2 section={benefit} />
      <Feature3 section={usage} />
      <Feature section={feature} />
      <FAQ section={faq} />
      <CTA section={cta} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: page.schemaName,
            description: page.metadata.description,
            url: canonical,
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web Browser",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: feature.items.map((item) => item.title),
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
              { "@type": "ListItem", position: 1, name: ui.breadcrumbHome, item: getCanonicalUrl(locale, "/") },
              { "@type": "ListItem", position: 2, name: ui.breadcrumbTools, item: getCanonicalUrl(locale, `/${page.slug}`) },
              { "@type": "ListItem", position: 3, name: h1Title, item: canonical },
            ],
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.items.map((faq) => ({
              "@type": "Question",
              name: faq.title,
              acceptedAnswer: { "@type": "Answer", text: faq.description },
            })),
          }),
        }}
      />
    </>
  );
}
