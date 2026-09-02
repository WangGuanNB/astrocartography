import type { Metadata } from "next";
import Image from "next/image";
import { getCanonicalUrl } from "@/lib/utils";
import { getAstrologyHousesPage } from "@/services/page";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import type { HubSectionContent } from "@/types/pages/landing";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/astrology-houses";
const LOCALES = ["en", "zh", "pt", "es", "it", "de"];

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getAstrologyHousesPage(locale);
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

function getH1Title(title: string): string {
  const idx = title.search(/\s[—–]\s|\s-\s/);
  const base = idx >= 0 ? title.slice(0, idx).trim() : title.trim();
  return base.replace(/\s+\d{4}$/, "").trim();
}

export default async function AstrologyHousesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getAstrologyHousesPage(locale);
  const h1Title = getH1Title(page.metadata.title);
  const hub = page.hubSections;
  const labels = page.hubLinkLabels;
  const houseDetails = page.houseDetails ?? [];

  return (
    <>
      <section className="border-b border-white/10">
        <div className="container max-w-6xl px-4 pt-20 pb-6 lg:pt-24 lg:pb-9">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div className="max-w-3xl">
              {page.hubHero && (
                <>
                  <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
                    <Icon name="RiLayoutGridLine" className="size-4" />
                    {page.hubHero.badge}
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
                      href={page.hubHero.primaryCta.url as any}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                    >
                      {page.hubHero.primaryCta.title}
                      <Icon name="RiArrowRightLine" className="size-4" />
                    </Link>
                    <Link
                      href={page.hubHero.secondaryCta.url as any}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-primary/40 hover:bg-white/10"
                    >
                      {page.hubHero.secondaryCta.title}
                      <Icon name="RiCompassLine" className="size-4" />
                    </Link>
                  </div>
                </>
              )}
            </div>

            {page.hubHero && (
              <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 lg:block">
                <div className="relative aspect-[4/3] min-h-[280px]">
                  <Image
                    src="/imgs/features/hero-web.webp"
                    alt={page.introduce?.image?.alt ?? h1Title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute left-4 right-4 top-4 rounded-xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/65">
                      {page.hubHero.sidebarLabel}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-white">
                      {page.hubHero.sidebarTags.map((tag) => (
                        <span key={tag} className="rounded-lg bg-white/10 px-3 py-2">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-background/85 p-4 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Icon name="RiBookOpenLine" className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{page.hubHero.sidebarTitle}</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/60">
                          {page.hubHero.sidebarDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {page.navPills && page.navPills.length > 0 && (
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {page.navPills.map((item) => (
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
          )}
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

      {hub?.startHere && labels && (
        <HubSection section={hub.startHere} linkLabel={labels.openTool} />
      )}

      {hub?.twelveHouses && labels && (
        <HubSection section={hub.twelveHouses} linkLabel={labels.readMeaning} />
      )}

      {hub?.houseGuide && houseDetails.length > 0 && (
        <section className="py-7 lg:py-12">
          <div className="container max-w-6xl">
            <div className="mb-8 max-w-3xl">
              <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {hub.houseGuide.eyebrow}
              </span>
              <h2 className="text-[1.7rem] font-bold leading-tight md:text-3xl lg:text-[2.35rem]">
                {hub.houseGuide.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base lg:text-lg">
                {hub.houseGuide.description}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground/90 md:text-base">
                {hub.houseGuide.disclaimer}
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {houseDetails.map((house) => (
                <article
                  key={house.id}
                  id={house.id}
                  className="scroll-mt-28 rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {house.group}
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                      {hub.houseGuide.naturalSignLabel}: {house.naturalSign}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold leading-snug text-foreground">{house.title}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {house.keywords}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{house.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {hub?.houseTypes && labels && (
        <HubSection section={hub.houseTypes} linkLabel={labels.learnMore} />
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

      {houseDetails.length > 0 && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                name: h1Title,
                description: page.metadata.description,
                url: getCanonicalUrl(locale, PATH),
                hasPart: houseDetails.map((house) => ({
                  "@type": "WebPageElement",
                  name: house.title,
                  url: `${getCanonicalUrl(locale, PATH)}#${house.id}`,
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
                name: hub?.houseGuide?.title ?? h1Title,
                itemListElement: houseDetails.map((house, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: house.title,
                  url: `${getCanonicalUrl(locale, PATH)}#${house.id}`,
                })),
              }),
            }}
          />
        </>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: getCanonicalUrl(locale, "/") },
              { "@type": "ListItem", position: 2, name: h1Title, item: getCanonicalUrl(locale, PATH) },
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

function HubSection({ section, linkLabel }: { section: HubSectionContent; linkLabel: string }) {
  return (
    <section id={section.id} className="py-7 lg:py-12">
      <div className="container max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {section.eyebrow}
            </span>
            <h2 className="text-[1.7rem] font-bold leading-tight md:text-3xl lg:text-[2.35rem]">
              {section.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base lg:text-lg">
              {section.description}
            </p>
          </div>
        </div>
        <div className={`grid gap-4 ${section.columns}`}>
          {section.items.map((item) => (
            <HubCard key={item.title} item={item} linkLabel={linkLabel} />
          ))}
        </div>
      </div>
    </section>
  );
}

type HubItem = HubSectionContent["items"][number];

function HubCard({ item, linkLabel }: { item: HubItem; linkLabel: string }) {
  const isAnchor = item.href.startsWith("#");

  const cardContent = (
    <>
      <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon name={item.icon} className="size-5" />
      </div>
      <h3 className="text-base font-semibold leading-snug text-foreground transition group-hover:text-primary">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        {linkLabel}
        <Icon name="RiArrowRightUpLine" className="size-4" />
      </span>
    </>
  );

  const className =
    "group flex min-h-44 flex-col rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card hover:shadow-xl hover:shadow-primary/5";

  if (isAnchor) {
    return (
      <a href={item.href} className={className}>
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={item.href as any} className={className}>
      {cardContent}
    </Link>
  );
}
