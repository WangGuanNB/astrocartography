import { Link } from "@/i18n/navigation";
import { getCanonicalUrl } from "@/lib/utils";
import HouseGuideHero from "@/components/astrology-houses/house-guide-hero";
import GuideToc from "@/components/blocks/guide-toc";
import GuideProse from "@/components/blocks/guide-prose";
import GuideRules from "@/components/blocks/guide-rules";
import GuideCompare from "@/components/blocks/guide-compare";
import GuidePlanetList from "@/components/blocks/guide-planet-list";
import GuideHowto from "@/components/blocks/guide-howto";
import HouseRelated from "@/components/blocks/house-related";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import type { HouseGuidePage } from "@/types/pages/house-guide";

function getH1Title(title: string): string {
  let base = title.split("|")[0].trim();
  const idx = base.search(/\s[—–]\s|\s-\s|：/);
  if (idx >= 0) base = base.slice(0, idx).trim();
  return base.replace(/\s+\d{4}$/, "").trim();
}

export default function HouseGuideComposer({
  page,
  locale,
  path,
  tocLabel,
}: {
  page: HouseGuidePage;
  locale: string;
  path: string;
  tocLabel?: string;
}) {
  const h1Title = page.guideHero.title?.trim() || getH1Title(page.metadata.title);
  const crumb = page.breadcrumb;
  const tocItems = page.toc?.items;
  const resolvedTocLabel = tocLabel || page.toc?.label;

  return (
    <>
      <div className="container max-w-6xl px-4 pt-20 lg:pt-24">
        <nav
          aria-label="Breadcrumb"
          className="mb-1 flex flex-wrap items-center gap-2 text-xs text-white/55"
        >
          <Link href="/" className="hover:text-white">
            {crumb.home}
          </Link>
          <span aria-hidden>/</span>
          <Link href="/astrology-houses" className="hover:text-white">
            {crumb.hub}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-white/80">{crumb.current}</span>
        </nav>
      </div>

      <HouseGuideHero
        hero={page.guideHero}
        title={h1Title}
        image={page.meaning.image}
      />

      <div className="container max-w-6xl px-4">
        {tocItems && (
          <div className="lg:hidden">
            <GuideToc items={tocItems} label={resolvedTocLabel} variant="bar" />
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          {tocItems && (
            <aside className="hidden lg:block">
              <GuideToc
                items={tocItems}
                label={resolvedTocLabel}
                variant="sidebar"
              />
            </aside>
          )}

          <div className="min-w-0 divide-y divide-white/5">
            <GuideProse
              section={{
                ...page.meaning,
                id: page.meaning.id || "meaning",
                image: undefined,
              }}
            />
            <GuideRules section={{ ...page.rules, id: page.rules.id || "rules" }} />

            {page.comparison && (
              <GuideCompare
                section={{
                  ...page.comparison,
                  id: page.comparison.id || "comparison",
                }}
              />
            )}

            <GuidePlanetList
              section={{ ...page.planets, id: page.planets.id || "planets" }}
            />
            <GuideHowto section={{ ...page.howto, id: page.howto.id || "howto" }} />

            {page.relatedHouses && (
              <HouseRelated
                section={{
                  ...page.relatedHouses,
                  id: page.relatedHouses.id || "related",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {page.faq && (
        <FAQ
          section={{
            ...page.faq,
            name: page.faq.name || "faq",
          }}
        />
      )}
      {page.cta && <CTA section={page.cta} />}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: h1Title,
            description: page.metadata.description,
            url: getCanonicalUrl(locale, path),
            inLanguage: locale === "zh" ? "zh-CN" : locale,
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
                name: crumb.home,
                item: getCanonicalUrl(locale, "/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: crumb.hub,
                item: getCanonicalUrl(locale, "/astrology-houses"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: crumb.current,
                item: getCanonicalUrl(locale, path),
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
