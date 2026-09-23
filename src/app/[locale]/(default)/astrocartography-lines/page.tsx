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
import type { HubSectionContent } from "@/types/pages/landing";

export const dynamic = "force-static";
export const revalidate = 604800;
export const dynamicParams = true;

const PATH = "/astrocartography-lines";
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
  const page = await getAstrocartographyLinesPage(locale);
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
      images: [{ url: "/imgs/features/planetary-lines-meaning-map.webp", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/imgs/features/planetary-lines-meaning-map.webp"] },
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

  const h1Title = page.heading?.title || page.metadata.title.split(" - ")[0].replace(/\s+\d{4}$/, "").trim();
  const hubHero = page.hubHero;
  const navPills = page.navPills || [];
  const hubSections = page.hubSections;
  const comparison = page.comparison;
  const angleGuide = page.angleGuide;
  const readYourMap = page.readYourMap;
  const openGuideLabel = page.hubLinkLabels?.openGuide || "Open guide";
  const schema = page.schemaLabels;
  const planetaryLineItems = hubSections?.planetaryLines?.items || [];

  return (
    <>
      <section className="border-b border-white/10">
        <div className="container max-w-6xl px-4 pt-20 pb-6 lg:pt-24 lg:pb-9">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div className="max-w-3xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
                <Icon name="RiMapPinLine" className="size-4" />
                {page.heading?.eyebrow || hubHero?.badge || "Astrocartography Hub"}
              </span>
              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                {h1Title}
              </h1>
              {(page.heading?.description || page.intentAnchor?.text) && (
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/78 lg:text-xl">
                  {page.heading?.description || page.intentAnchor?.text}
                </p>
              )}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={(hubHero?.primaryCta.url || "/") as any}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                  {hubHero?.primaryCta.title || "Free Astrocartography Calculator"}
                  <Icon name="RiArrowRightLine" className="size-4" />
                </Link>
                <Link
                  href={(hubHero?.secondaryCta.url || "/astrocartography-where-to-live") as any}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-primary/40 hover:bg-white/10"
                >
                  {hubHero?.secondaryCta.title || "Find Where to Live"}
                  <Icon name="RiHomeHeartLine" className="size-4" />
                </Link>
              </div>
            </div>

            <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 lg:block">
              <div className="relative aspect-[4/3] min-h-[280px]">
                <Image
                  src="/imgs/features/planetary-lines-meaning-map.webp"
                  alt={h1Title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                {hubHero && (
                  <>
                    <div className="absolute left-4 right-4 top-4 rounded-xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/65">
                        {hubHero.sidebarLabel}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-white">
                        {hubHero.sidebarTags.map((tag) => (
                          <span key={tag} className="rounded-lg bg-white/10 px-3 py-2">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-background/85 p-4 backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Icon name="RiSearchLine" className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{hubHero.sidebarTitle}</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/60">
                            {hubHero.sidebarDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {navPills.length > 0 && (
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

      {hubSections?.startHere && (
        <HubSection section={hubSections.startHere} openGuideLabel={openGuideLabel} />
      )}
      {hubSections?.planetaryLines && (
        <HubSection section={hubSections.planetaryLines} openGuideLabel={openGuideLabel} />
      )}

      {comparison && (
        <section id="planet-comparison" className="scroll-mt-24 py-10 lg:py-16">
          <div className="container max-w-6xl">
            <div className="mb-8 max-w-3xl">
              <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {comparison.eyebrow}
              </span>
              <h2 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
                {comparison.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base lg:text-lg">
                {comparison.description}
              </p>
            </div>

            <div className="grid gap-4 md:hidden">
              {comparison.items.map((item) => (
                <Link
                  key={item.planet}
                  href={item.href as any}
                  className="rounded-2xl border border-border/70 bg-card/70 p-5 transition hover:border-primary/45 hover:bg-card"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold">
                      {item.planet}
                      {comparison.lineSuffix ? ` ${comparison.lineSuffix}` : ""}
                    </h3>
                    <Icon name="RiArrowRightUpLine" className="size-5 text-primary" />
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold text-foreground">{comparison.columns.theme}</dt>
                      <dd className="mt-1 text-muted-foreground">{item.theme}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">{comparison.columns.usefulFor}</dt>
                      <dd className="mt-1 text-muted-foreground">{item.usefulFor}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">{comparison.columns.watchFor}</dt>
                      <dd className="mt-1 text-muted-foreground">{item.watchFor}</dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card/60 md:block">
              <table className="w-full table-fixed text-left">
                <thead className="border-b border-border/70 bg-white/[0.035] text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-[15%] px-5 py-4">{comparison.columns.planet}</th>
                    <th className="w-[27%] px-5 py-4">{comparison.columns.theme}</th>
                    <th className="w-[29%] px-5 py-4">{comparison.columns.usefulFor}</th>
                    <th className="w-[29%] px-5 py-4">{comparison.columns.watchFor}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {comparison.items.map((item) => (
                    <tr key={item.planet} className="transition hover:bg-white/[0.035]">
                      <th className="px-5 py-4 font-semibold">
                        <Link href={item.href as any} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                          {item.planet}
                          <Icon name="RiArrowRightUpLine" className="size-4" />
                        </Link>
                      </th>
                      <td className="px-5 py-4 text-muted-foreground">{item.theme}</td>
                      <td className="px-5 py-4 text-muted-foreground">{item.usefulFor}</td>
                      <td className="px-5 py-4 text-muted-foreground">{item.watchFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {hubSections?.lifeGoals && (
        <HubSection section={hubSections.lifeGoals} openGuideLabel={openGuideLabel} />
      )}

      {angleGuide && (
        <section id="angles" className="py-16 lg:py-20">
          <div className="container max-w-6xl">
            <div className="mb-8 max-w-3xl">
              <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {angleGuide.eyebrow}
              </span>
              <h2 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
                {angleGuide.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base lg:text-lg">
                {angleGuide.description}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {angleGuide.cards.map((item) => (
                <HubCard key={item.title} item={item} openGuideLabel={openGuideLabel} />
              ))}
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {angleGuide.guides.map((item) => (
                <article
                  key={item.id}
                  id={item.id}
                  className="scroll-mt-24 rounded-2xl border border-border/70 bg-card/60 p-6 lg:p-7"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.label}</p>
                  <h3 className="mt-3 text-xl font-semibold leading-snug">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{item.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.examples.map((example) => (
                      <Link
                        key={example.label}
                        href={example.href as any}
                        className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/45 hover:bg-primary/15"
                      >
                        {example.label}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {readYourMap && (
        <section id="read-your-map" className="scroll-mt-24 py-12 lg:py-20">
          <div className="container max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center">
              <figure className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-2xl shadow-black/15">
                <Image
                  src="/imgs/features/astrocartography-lines-calculation.webp"
                  alt={readYourMap.imageAlt}
                  width={2370}
                  height={1768}
                  sizes="(max-width: 1024px) 100vw, 680px"
                  className="h-auto w-full"
                />
                <figcaption className="border-t border-border/60 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
                  {readYourMap.figcaption}
                </figcaption>
              </figure>

              <div>
                <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {readYourMap.eyebrow}
                </span>
                <h2 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
                  {readYourMap.title}
                </h2>
                <ol className="mt-6 grid gap-4">
                  {readYourMap.steps.map((step) => (
                    <li key={step.number} className="flex gap-4 rounded-2xl border border-border/60 bg-card/50 p-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {step.number}
                      </span>
                      <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={readYourMap.primaryCta.url as any}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {readYourMap.primaryCta.title}
                    <Icon name="RiArrowRightLine" className="size-4" />
                  </Link>
                  <Link
                    href={readYourMap.secondaryCta.url as any}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
                  >
                    {readYourMap.secondaryCta.title}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
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
            "@type": "CollectionPage",
            name: schema?.collectionName || h1Title,
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
            name: schema?.itemListName || h1Title,
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
              { "@type": "ListItem", position: 1, name: schema?.breadcrumbHome || "Home", item: getCanonicalUrl(locale, "/") },
              { "@type": "ListItem", position: 2, name: schema?.breadcrumbCurrent || h1Title, item: getCanonicalUrl(locale, PATH) },
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
  section,
  openGuideLabel,
}: {
  section: HubSectionContent;
  openGuideLabel: string;
}) {
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
            <HubCard key={item.title} item={item} openGuideLabel={openGuideLabel} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HubCard({ item, openGuideLabel }: { item: HubItem; openGuideLabel: string }) {
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
        {openGuideLabel}
        <Icon name="RiArrowRightUpLine" className="size-4" />
      </span>
    </Link>
  );
}
