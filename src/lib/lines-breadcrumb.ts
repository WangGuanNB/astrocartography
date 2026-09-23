/** Localized breadcrumb labels for planetary line pages → lines hub. */
export const BREADCRUMB_HOME: Record<string, string> = {
  en: "Home",
  zh: "首页",
  de: "Startseite",
  es: "Inicio",
  it: "Home",
  pt: "Início",
};

export const LINES_HUB_BREADCRUMB: Record<string, string> = {
  en: "Astrocartography Lines",
  zh: "ACG 行星线含义",
  de: "Astrokartographie Planetenlinien",
  es: "Líneas de astrocartografía",
  it: "Linee di astrocartografia",
  pt: "Linhas de Astrocartografia",
};

export const PLANET_LINE_BREADCRUMB: Record<string, Record<string, string>> = {
  sun: {
    en: "Sun Line",
    zh: "太阳线",
    de: "Sonnenlinie",
    es: "Línea del Sol",
    it: "Linea del Sole",
    pt: "Linha do Sol",
  },
  moon: {
    en: "Moon Line",
    zh: "月亮线",
    de: "Mondlinie",
    es: "Línea de la Luna",
    it: "Linea della Luna",
    pt: "Linha da Lua",
  },
  mercury: {
    en: "Mercury Line",
    zh: "水星线",
    de: "Merkurlinie",
    es: "Línea de Mercurio",
    it: "Linea di Mercurio",
    pt: "Linha de Mercúrio",
  },
  venus: {
    en: "Venus Line",
    zh: "金星线",
    de: "Venuslinie",
    es: "Línea de Venus",
    it: "Linea di Venere",
    pt: "Linha de Vênus",
  },
  mars: {
    en: "Mars Line",
    zh: "火星线",
    de: "Marslinie",
    es: "Línea de Marte",
    it: "Linea di Marte",
    pt: "Linha de Marte",
  },
  jupiter: {
    en: "Jupiter Line",
    zh: "木星线",
    de: "Jupiterlinie",
    es: "Línea de Júpiter",
    it: "Linea di Giove",
    pt: "Linha de Júpiter",
  },
  saturn: {
    en: "Saturn Line",
    zh: "土星线",
    de: "Saturnlinie",
    es: "Línea de Saturno",
    it: "Linea di Saturno",
    pt: "Linha de Saturno",
  },
  uranus: {
    en: "Uranus Line",
    zh: "天王星线",
    de: "Uranuslinie",
    es: "Línea de Urano",
    it: "Linea di Urano",
    pt: "Linha de Urano",
  },
};

export function getLinesBreadcrumbLabels(
  locale: string,
  planet: keyof typeof PLANET_LINE_BREADCRUMB
) {
  const loc = locale in BREADCRUMB_HOME ? locale : "en";
  return {
    home: BREADCRUMB_HOME[loc],
    hub: LINES_HUB_BREADCRUMB[loc],
    current: PLANET_LINE_BREADCRUMB[planet][loc],
  };
}
