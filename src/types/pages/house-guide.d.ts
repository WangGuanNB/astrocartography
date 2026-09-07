import type { Button, Image } from "@/types/blocks/base";
import type { Section } from "@/types/blocks/section";

export type HouseGuideBreadcrumb = {
  home: string;
  hub: string;
  current: string;
};

export type HouseGuideTocItem = {
  id: string;
  label: string;
};

export type HouseGuideProseSection = {
  id?: string;
  title: string;
  label?: string;
  paragraphs: string[];
  image?: Image;
};

export type HouseGuideRulesSection = {
  id?: string;
  title: string;
  label?: string;
  description?: string;
  doesLabel?: string;
  doesNotLabel?: string;
  does: Array<{ title: string; description: string }>;
  does_not: Array<{ title: string; description: string }>;
};

export type HouseGuideComparisonSection = {
  id?: string;
  title: string;
  label?: string;
  description?: string;
  columns: string[];
  rows: string[][];
};

export type HouseGuidePlanetItem = {
  planet: string;
  title: string;
  description: string;
};

export type HouseGuidePlanetsSection = {
  id?: string;
  title: string;
  label?: string;
  intro?: string;
  items: HouseGuidePlanetItem[];
};

export type HouseGuideHowtoSection = {
  id?: string;
  title: string;
  label?: string;
  intro?: string;
  steps: Array<{ title: string; description: string; icon?: string }>;
  primary_cta?: {
    title: string;
    url: string;
    icon?: string;
  };
};

export type HouseGuideRelatedItem = {
  title: string;
  description: string;
  href: string;
  icon?: string;
};

export type HouseGuideRelatedSection = {
  id?: string;
  title: string;
  description?: string;
  items: HouseGuideRelatedItem[];
};

export type HouseGuideHero = {
  badge: string;
  badgeIcon?: string;
  title?: string;
  description: string;
  overviewTitle: string;
  overviewEyebrow?: string;
  overviewIcon?: string;
  overviewItems: Array<{ label: string; value: string }>;
  actions?: Array<{
    title: string;
    url: string;
    icon?: string;
    variant?: "primary" | "secondary";
  }>;
  links?: Array<{
    text: string;
    linkText: string;
    url: string;
  }>;
};

/** Modular blog-guide contract for /astrology-houses/{n}th-house pages. */
export type HouseGuidePage = {
  metadata: {
    title: string;
    description: string;
    keywords?: string;
    /** Open Graph / Twitter image path (non-hero page asset) */
    ogImage?: string;
  };
  breadcrumb: HouseGuideBreadcrumb;
  guideHero: HouseGuideHero;
  toc?: {
    label?: string;
    items: HouseGuideTocItem[];
  };
  meaning: HouseGuideProseSection;
  rules: HouseGuideRulesSection;
  comparison?: HouseGuideComparisonSection;
  planets: HouseGuidePlanetsSection;
  howto: HouseGuideHowtoSection;
  relatedHouses?: HouseGuideRelatedSection;
  faq?: Section;
  cta?: Section & { buttons?: Button[] };
};
