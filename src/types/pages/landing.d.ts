import { Header } from "@/types/blocks/header";
import { Hero } from "@/types/blocks/hero";
import { Section } from "@/types/blocks/section";
import { Footer } from "@/types/blocks/footer";
import { Pricing } from "@/types/blocks/pricing";
import { ConverterPage } from "./converter";
import { ColorPage } from "./color";

export interface LandingPage {
  header?: Header;
  hero?: Hero;
  branding?: Section;
  introduce?: Section;
  popularLines?: Section;
  howToRead?: Section;
  benefit?: Section;
  usage?: Section;
  feature?: Section;
  showcase?: Section;
  stats?: Section;
  pricing?: Pricing;
  testimonial?: Section;
  faq?: Section;
  cta?: Section;
  footer?: Footer;
}

export interface PricingPage {
  pricing?: Pricing;
}

export interface ShowcasePage {
  showcase?: Section;
}

export interface AboutPage {
  metadata: {
    title: string;
    description: string;
    keywords: string[];
  };
  title: string;
  intro: string;
  story: {
    title: string;
    content: string;
  };
  mission: {
    title: string;
    empowerment: {
      title: string;
      description: string;
    };
    community: {
      title: string;
      description: string;
    };
    privacy: {
      title: string;
      description: string;
    };
    innovation: {
      title: string;
      description: string;
    };
  };
  features: {
    title: string;
    fast: {
      title: string;
      description: string;
    };
    matching: {
      title: string;
      description: string;
    };
    global: {
      title: string;
      description: string;
    };
  };
  contact: {
    title: string;
    description: string;
    notice: string;
  };
  ready: {
    title: string;
    description: string;
    homepage_link: string;
    description_continued: string;
    subtitle: string;
  };
  footer: {
    copyright: string;
    privacy: string;
  };
}

export interface CalculatorPage {
  metadata: {
    title: string;
    description: string;
    keywords?: string;
  };
  breadcrumb?: {
    home: string;
    hub: string;
    current: string;
  };
  guideHero?: {
    badge: string;
    overviewTitle: string;
    overviewEyebrow?: string;
    overviewItems: Array<{
      label: string;
      value: string;
    }>;
    actions: Array<{
      title: string;
      url: string;
      icon: string;
      variant?: "primary" | "secondary";
    }>;
  };
  intentAnchor?: {
    text: string;
  };
  internalLinks?: {
    title: string;
    items: Array<{
      text: string;
      linkText: string;
      url: string;
    }>;
  };
  introduce?: Section;
  benefit?: Section;
  usage?: Section;
  feature?: Section;
  faq?: Section;
  cta?: Section;
  methodology?: {
    label?: string;
    title: string;
    description?: string;
    highlights?: Array<{ label: string; url?: string }>;
    items: Array<{ title: string; description: string }>;
    disclaimer: string;
    lastUpdated?: string;
    lastUpdatedLabel?: string;
  };
  hubHero?: {
    badge: string;
    primaryCta: { title: string; url: string };
    secondaryCta: { title: string; url: string };
    sidebarLabel: string;
    sidebarTags: string[];
    sidebarTitle: string;
    sidebarDescription: string;
  };
  navPills?: Array<{ title: string; href: string; icon: string }>;
  hubSections?: {
    startHere: HubSectionContent;
    twelveHouses: HubSectionContent;
    houseTypes: HubSectionContent;
    houseGuide: {
      eyebrow: string;
      title: string;
      description: string;
      disclaimer: string;
      naturalSignLabel: string;
    };
  };
  houseDetails?: Array<{
    id: string;
    number: number;
    title: string;
    naturalSign: string;
    group: string;
    keywords: string;
    description: string;
  }>;
  hubLinkLabels?: {
    openTool: string;
    readMeaning: string;
    learnMore: string;
  };
}

export interface HubSectionContent {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  columns: string;
  items: Array<{
    title: string;
    description: string;
    href: string;
    icon: string;
    group?: string;
  }>;
}

// Export the new page types
export type { ConverterPage, ColorPage, AboutPage };
export type { ContactPage } from "./contact";
