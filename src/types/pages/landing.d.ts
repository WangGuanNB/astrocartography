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
}

// Export the new page types
export type { ConverterPage, ColorPage, AboutPage };
export type { ContactPage } from "./contact";
