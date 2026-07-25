import type { Metadata } from "next";
import Image from "next/image";
import { getCanonicalUrl } from "@/lib/utils";
import { getAstrocartographyLinesPage } from "@/services/page";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/astrocartography-lines";
const LOCALES = ["en"];

const navPills = [
  { title: "Start Here", href: "#start-here", icon: "RiSparklingLine" },
  { title: "Planets", href: "#planetary-lines", icon: "RiPlanetLine" },
  { title: "Life Goals", href: "#life-goals", icon: "RiCompassDiscoverLine" },
  { title: "Angles", href: "#angles", icon: "RiFocus3Line" },
  { title: "Guide", href: "#introduce", icon: "RiQuestionLine" },
];

const startHereItems = [
  {
    title: "Free Astrocartography Calculator",
    description: "Generate your personal map first, then come back to read each line with context.",
    href: "/",
    icon: "RiMapLine",
  },
  {
    title: "Where to Live",
    description: "Compare cities for love, career, home, growth, and relocation decisions.",
    href: "/astrocartography-where-to-live",
    icon: "RiHomeHeartLine",
  },
  {
    title: "Relocation Chart",
    description: "Check one target city with a relocated chart after you shortlist locations.",
    href: "/relocation-chart-calculator",
    icon: "RiFlightTakeoffLine",
  },
];

const planetaryLineItems = [
  {
    title: "Sun Line",
    description: "Visibility, confidence, leadership, and identity.",
    href: "/sun-line-astrocartography",
    icon: "RiSunLine",
  },
  {
    title: "Moon Line",
    description: "Home, emotional security, family, and belonging.",
    href: "/moon-line-astrocartography",
    icon: "RiMoonLine",
  },
  {
    title: "Mercury Line",
    description: "Communication, learning, writing, and business.",
    href: "/mercury-line-astrocartography",
    icon: "RiMessage3Line",
  },
  {
    title: "Venus Line",
    description: "Love, beauty, relationships, and daily ease.",
    href: "/venus-line-astrocartography",
    icon: "RiHeartLine",
  },
  {
    title: "Mars Line",
    description: "Drive, ambition, action, and competitive energy.",
    href: "/mars-line-astrocartography",
    icon: "RiFireLine",
  },
  {
    title: "Jupiter Line",
    description: "Growth, opportunity, luck, and expansion.",
    href: "/jupiter-line-astrocartography",
    icon: "RiStarLine",
  },
  {
    title: "Saturn Line",
    description: "Discipline, responsibility, mastery, and endurance.",
    href: "/saturn-line-astrocartography",
    icon: "RiShieldLine",
  },
  {
    title: "Uranus Line",
    description: "Freedom, reinvention, change, and unconventional paths.",
    href: "/uranus-line-astrocartography",
    icon: "RiFlashlightLine",
  },
];

const lifeGoalItems = [
  {
    title: "Love & Relationships",
    description: "Start with Venus and Moon lines when your question is about connection.",
    href: "/venus-line-astrocartography",
    icon: "RiHeartLine",
  },
  {
    title: "Career & Success",
    description: "Compare Sun, Jupiter, Saturn, Mercury, and Mars career themes.",
    href: "/jupiter-line-astrocartography",
    icon: "RiBriefcaseLine",
  },
  {
    title: "Home & Belonging",
    description: "Use Moon and Venus IC themes when you want a place to feel rooted.",
    href: "/moon-line-astrocartography",
    icon: "RiHome4Line",
  },
  {
    title: "Growth & Challenge",
    description: "Read Saturn, Mars, and Uranus carefully before choosing intense places.",
    href: "/saturn-line-astrocartography",
    icon: "RiLeafLine",
  },
];

const angleItems = [
  {
    title: "ASC Lines",
    description: "How a place affects identity, first impressions, and self-expression.",
    href: "#angles",
    icon: "RiCompassLine",
  },
  {
    title: "DSC Lines",
    description: "How a place activates partners, clients, and one-on-one relationships.",
    href: "#angles",
    icon: "RiHeartLine",
  },
  {
    title: "MC Lines",
    description: "How a place emphasizes career, public direction, and reputation.",
    href: "#angles",
    icon: "RiBriefcaseLine",
  },
  {
    title: "IC Lines",
    description: "How a place shapes home, family, roots, and private life.",
    href: "#angles",
    icon: "RiHome4Line",
  },
];

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getAstrocartographyLinesPage(locale);
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

export default async function AstrocartographyLinesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getAstrocartographyLinesPage(locale);

  const h1Title = page.metadata.title.split(" - ")[0].replace(/\s+\d{4}$/, "").trim();

  return (
    <>
      <section className="border-b border-white/10">
        <div className="container max-w-6xl px-4 pt-20 pb-6 lg:pt-24 lg:pb-9">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div className="max-w-3xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
                <Icon name="RiMapPinLine" className="size-4" />
                Astrocartography Hub
              </span>
              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                {h1Title}
              </h1>
              {page.intentAnchor && (
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/78 lg:text-xl">
                  {page.intentAnchor.text}
                </p>
              )}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                  Free Astrocartography Calculator
                  <Icon name="RiArrowRightLine" className="size-4" />
                </Link>
                <Link
                  href="/astrocartography-where-to-live"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-primary/40 hover:bg-white/10"
                >
                  Find Where to Live
                  <Icon name="RiHomeHeartLine" className="size-4" />
                </Link>
              </div>
            </div>

            <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 lg:block">
              <div className="relative aspect-[4/3] min-h-[280px]">
                <Image
                  src="/imgs/features/astrocartography-lines/astrocartography-lines-planets-overview.webp"
                  alt="Astrocartography map preview with planetary lines"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute left-4 right-4 top-4 rounded-xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/65">
                    Explore by intent
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-white">
                    <span className="rounded-lg bg-white/10 px-3 py-2">Love</span>
                    <span className="rounded-lg bg-white/10 px-3 py-2">Career</span>
                    <span className="rounded-lg bg-white/10 px-3 py-2">Home</span>
                    <span className="rounded-lg bg-white/10 px-3 py-2">Growth</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-background/85 p-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon name="RiSearchLine" className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Find the right guide faster</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/60">
                        Browse by planet, life goal, or angle before reading the full guide.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navPills.map((item) => (
                <Link
                  key={item.title}
                  href={item.href as any}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white/65 transition hover:bg-white/8 hover:text-white"
                >
                  <Icon name={item.icon} className="size-4" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {page.internalLinks && (
        <div className="container max-w-4xl px-4 pb-8 lg:pb-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {page.internalLinks.items.map((item, index) => (
              <Link
                key={index}
                href={item.url as any}
                className="group flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-primary/30 hover:bg-white/10"
              >
                <span className="text-xs leading-relaxed text-muted-foreground">{item.text}</span>
                <span className="text-sm font-semibold text-primary group-hover:underline">
                  {item.linkText} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <HubSection
        id="start-here"
        eyebrow="Start here"
        title="Choose the fastest path for your question"
        description="Most visitors come to astrocartography lines with one of three intents: generate a map, compare where to live, or check a specific relocation chart."
        items={startHereItems}
        columns="lg:grid-cols-3"
      />

      <HubSection
        id="planetary-lines"
        eyebrow="Browse by planet"
        title="Every major astrocartography line in one place"
        description="Use this section as the main directory for planetary line meanings. These links keep every line page reachable from the hub."
        items={planetaryLineItems}
        columns="sm:grid-cols-2 lg:grid-cols-4"
      />

      <HubSection
        id="life-goals"
        eyebrow="Browse by life goal"
        title="Find lines that match what you want from a place"
        description="If you are not sure which planet to read first, start with the life area you care about most."
        items={lifeGoalItems}
        columns="sm:grid-cols-2 lg:grid-cols-4"
      />

      <section id="angles" className="py-16 lg:py-20">
        <div className="container max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Browse by angle
            </span>
            <h2 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
              ASC, DSC, MC, and IC change how each line feels
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base lg:text-lg">
              The planet tells you the theme. The angle tells you where that theme tends to show up: identity, relationships, career, or home.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {angleItems.map((item) => (
              <HubCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

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
            "@type": "CollectionPage",
            name: "Astrocartography Lines",
            description: page.metadata.description,
            url: getCanonicalUrl(locale, PATH),
            hasPart: planetaryLineItems.map((item) => ({
              "@type": "WebPage",
              name: item.title,
              url: getCanonicalUrl(locale, item.href),
            })),
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Astrocartography Line Guides",
            itemListElement: planetaryLineItems.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.title,
              url: getCanonicalUrl(locale, item.href),
            })),
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
              { "@type": "ListItem", position: 2, name: "Astrocartography Lines", item: getCanonicalUrl(locale, PATH) },
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

type HubItem = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

function HubSection({
  id,
  eyebrow,
  title,
  description,
  items,
  columns,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: HubItem[];
  columns: string;
}) {
  return (
    <section id={id} className="py-7 lg:py-12">
      <div className="container max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {eyebrow}
            </span>
            <h2 className="text-[1.7rem] font-bold leading-tight md:text-3xl lg:text-[2.35rem]">
              {title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base lg:text-lg">
              {description}
            </p>
          </div>
        </div>
        <div className={`grid gap-4 ${columns}`}>
          {items.map((item) => (
            <HubCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HubCard({ item }: { item: HubItem }) {
  return (
    <Link
      href={item.href as any}
      className="group flex min-h-44 flex-col rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon name={item.icon} className="size-5" />
      </div>
      <h3 className="text-base font-semibold leading-snug text-foreground transition group-hover:text-primary">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {item.description}
      </p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Open guide
        <Icon name="RiArrowRightUpLine" className="size-4" />
      </span>
    </Link>
  );
}
