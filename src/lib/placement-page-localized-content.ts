import type { PlacementPageContent, PlacementPageKey, PlacementPageUiContent } from "@/lib/placement-page-content";

import venusEn from "@/i18n/pages/venus-sign-calculator/en.json";
import venusZh from "@/i18n/pages/venus-sign-calculator/zh.json";
import venusEs from "@/i18n/pages/venus-sign-calculator/es.json";
import venusPt from "@/i18n/pages/venus-sign-calculator/pt.json";
import venusDe from "@/i18n/pages/venus-sign-calculator/de.json";
import venusIt from "@/i18n/pages/venus-sign-calculator/it.json";

import lunarNodesEn from "@/i18n/pages/lunar-nodes-calculator/en.json";
import lunarNodesZh from "@/i18n/pages/lunar-nodes-calculator/zh.json";
import lunarNodesEs from "@/i18n/pages/lunar-nodes-calculator/es.json";
import lunarNodesPt from "@/i18n/pages/lunar-nodes-calculator/pt.json";
import lunarNodesDe from "@/i18n/pages/lunar-nodes-calculator/de.json";
import lunarNodesIt from "@/i18n/pages/lunar-nodes-calculator/it.json";

import chironEn from "@/i18n/pages/chiron-placement-calculator/en.json";
import chironZh from "@/i18n/pages/chiron-placement-calculator/zh.json";
import chironEs from "@/i18n/pages/chiron-placement-calculator/es.json";
import chironPt from "@/i18n/pages/chiron-placement-calculator/pt.json";
import chironDe from "@/i18n/pages/chiron-placement-calculator/de.json";
import chironIt from "@/i18n/pages/chiron-placement-calculator/it.json";

import asteroidsEn from "@/i18n/pages/asteroid-calculator/en.json";
import asteroidsZh from "@/i18n/pages/asteroid-calculator/zh.json";
import asteroidsEs from "@/i18n/pages/asteroid-calculator/es.json";
import asteroidsPt from "@/i18n/pages/asteroid-calculator/pt.json";
import asteroidsDe from "@/i18n/pages/asteroid-calculator/de.json";
import asteroidsIt from "@/i18n/pages/asteroid-calculator/it.json";

import commonEn from "@/i18n/pages/placement-common/en.json";
import commonZh from "@/i18n/pages/placement-common/zh.json";
import commonEs from "@/i18n/pages/placement-common/es.json";
import commonPt from "@/i18n/pages/placement-common/pt.json";
import commonDe from "@/i18n/pages/placement-common/de.json";
import commonIt from "@/i18n/pages/placement-common/it.json";

export const SUPPORTED_PLACEMENT_LOCALES = ["en", "zh", "es", "pt", "de", "it"] as const;
export type SupportedPlacementLocale = (typeof SUPPORTED_PLACEMENT_LOCALES)[number];

const placementPagesByLocale: Record<
  SupportedPlacementLocale,
  Partial<Record<PlacementPageKey, PlacementPageContent>>
> = {
  en: {
    venus: venusEn as PlacementPageContent,
    lunarNodes: lunarNodesEn as PlacementPageContent,
    chiron: chironEn as PlacementPageContent,
    asteroids: asteroidsEn as PlacementPageContent,
  },
  zh: {
    venus: venusZh as PlacementPageContent,
    lunarNodes: lunarNodesZh as PlacementPageContent,
    chiron: chironZh as PlacementPageContent,
    asteroids: asteroidsZh as PlacementPageContent,
  },
  es: {
    venus: venusEs as PlacementPageContent,
    lunarNodes: lunarNodesEs as PlacementPageContent,
    chiron: chironEs as PlacementPageContent,
    asteroids: asteroidsEs as PlacementPageContent,
  },
  pt: {
    venus: venusPt as PlacementPageContent,
    lunarNodes: lunarNodesPt as PlacementPageContent,
    chiron: chironPt as PlacementPageContent,
    asteroids: asteroidsPt as PlacementPageContent,
  },
  de: {
    venus: venusDe as PlacementPageContent,
    lunarNodes: lunarNodesDe as PlacementPageContent,
    chiron: chironDe as PlacementPageContent,
    asteroids: asteroidsDe as PlacementPageContent,
  },
  it: {
    venus: venusIt as PlacementPageContent,
    lunarNodes: lunarNodesIt as PlacementPageContent,
    chiron: chironIt as PlacementPageContent,
    asteroids: asteroidsIt as PlacementPageContent,
  },
};

const placementCommonByLocale: Record<SupportedPlacementLocale, PlacementPageUiContent> = {
  en: commonEn as PlacementPageUiContent,
  zh: commonZh as PlacementPageUiContent,
  es: commonEs as PlacementPageUiContent,
  pt: commonPt as PlacementPageUiContent,
  de: commonDe as PlacementPageUiContent,
  it: commonIt as PlacementPageUiContent,
};

function normalizePlacementLocale(locale: string): SupportedPlacementLocale {
  const normalized = locale === "zh-CN" ? "zh" : locale.toLowerCase();
  return SUPPORTED_PLACEMENT_LOCALES.includes(normalized as SupportedPlacementLocale)
    ? (normalized as SupportedPlacementLocale)
    : "en";
}

export function getPlacementPageContent(key: PlacementPageKey, locale: string): PlacementPageContent {
  const content = placementPagesByLocale[normalizePlacementLocale(locale)][key] || placementPagesByLocale.en[key];
  if (!content) throw new Error(`No localized placement content is configured for ${key}.`);
  return content;
}

export function getPlacementPageUi(locale: string): PlacementPageUiContent {
  return placementCommonByLocale[normalizePlacementLocale(locale)] || placementCommonByLocale.en;
}
