export type PlacementPageKey = "venus" | "lunarNodes" | "chiron" | "asteroids";

export type PlacementPageContent = {
  key: PlacementPageKey;
  slug: string;
  toolType: "venus" | "lunar-nodes" | "chiron" | "asteroids";
  metadata: {
    title: string;
    description: string;
    keywords: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  form: {
    submit: string;
  };
  result: {
    title: string;
    cta: string;
  };
  relatedLinks: Array<{
    text: string;
    linkText: string;
    url: string;
  }>;
  sections: Array<{
    title: string;
    body: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  schemaName: string;
};

export type PlacementPageUiContent = {
  introLabel: string;
  benefitLabel: string;
  benefitTitleTemplate: string;
  benefitDescription: string;
  usageLabel: string;
  usageTitleTemplate: string;
  usageDescription: string;
  usageItems: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  featureLabel: string;
  featureTitleTemplate: string;
  featureDescription: string;
  featureItems: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  faqLabel: string;
  faqTitleTemplate: string;
  faqDescriptionTemplate: string;
  ctaTitleTemplate: string;
  ctaDescription: string;
  ctaButton: string;
  breadcrumbHome: string;
  breadcrumbTools: string;
};
