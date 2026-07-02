import type { SunSignName, SunSignResult, ZodiacElement, ZodiacModality } from "@/lib/sun-sign";

export type SunSignLocale = "en" | "zh" | "pt" | "es" | "it" | "de";

export function normalizeSunSignLocale(locale: string): SunSignLocale {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("zh")) return "zh";
  if (normalized === "pt" || normalized === "es" || normalized === "it" || normalized === "de") {
    return normalized;
  }
  return "en";
}

const SIGN_NAMES: Record<SunSignLocale, Record<SunSignName, string>> = {
  en: {
    Aries: "Aries",
    Taurus: "Taurus",
    Gemini: "Gemini",
    Cancer: "Cancer",
    Leo: "Leo",
    Virgo: "Virgo",
    Libra: "Libra",
    Scorpio: "Scorpio",
    Sagittarius: "Sagittarius",
    Capricorn: "Capricorn",
    Aquarius: "Aquarius",
    Pisces: "Pisces",
  },
  zh: {
    Aries: "白羊座",
    Taurus: "金牛座",
    Gemini: "双子座",
    Cancer: "巨蟹座",
    Leo: "狮子座",
    Virgo: "处女座",
    Libra: "天秤座",
    Scorpio: "天蝎座",
    Sagittarius: "射手座",
    Capricorn: "摩羯座",
    Aquarius: "水瓶座",
    Pisces: "双鱼座",
  },
  es: {
    Aries: "Aries",
    Taurus: "Tauro",
    Gemini: "Géminis",
    Cancer: "Cáncer",
    Leo: "Leo",
    Virgo: "Virgo",
    Libra: "Libra",
    Scorpio: "Escorpio",
    Sagittarius: "Sagitario",
    Capricorn: "Capricornio",
    Aquarius: "Acuario",
    Pisces: "Piscis",
  },
  pt: {
    Aries: "Áries",
    Taurus: "Touro",
    Gemini: "Gêmeos",
    Cancer: "Câncer",
    Leo: "Leão",
    Virgo: "Virgem",
    Libra: "Libra",
    Scorpio: "Escorpião",
    Sagittarius: "Sagitário",
    Capricorn: "Capricórnio",
    Aquarius: "Aquário",
    Pisces: "Peixes",
  },
  de: {
    Aries: "Widder",
    Taurus: "Stier",
    Gemini: "Zwillinge",
    Cancer: "Krebs",
    Leo: "Löwe",
    Virgo: "Jungfrau",
    Libra: "Waage",
    Scorpio: "Skorpion",
    Sagittarius: "Schütze",
    Capricorn: "Steinbock",
    Aquarius: "Wassermann",
    Pisces: "Fische",
  },
  it: {
    Aries: "Ariete",
    Taurus: "Toro",
    Gemini: "Gemelli",
    Cancer: "Cancro",
    Leo: "Leone",
    Virgo: "Vergine",
    Libra: "Bilancia",
    Scorpio: "Scorpione",
    Sagittarius: "Sagittario",
    Capricorn: "Capricorno",
    Aquarius: "Acquario",
    Pisces: "Pesci",
  },
};

const ELEMENTS: Record<SunSignLocale, Record<ZodiacElement, string>> = {
  en: { Fire: "Fire", Earth: "Earth", Air: "Air", Water: "Water" },
  zh: { Fire: "火", Earth: "土", Air: "风", Water: "水" },
  es: { Fire: "Fuego", Earth: "Tierra", Air: "Aire", Water: "Agua" },
  pt: { Fire: "Fogo", Earth: "Terra", Air: "Ar", Water: "Água" },
  de: { Fire: "Feuer", Earth: "Erde", Air: "Luft", Water: "Wasser" },
  it: { Fire: "Fuoco", Earth: "Terra", Air: "Aria", Water: "Acqua" },
};

const MODALITIES: Record<SunSignLocale, Record<ZodiacModality, string>> = {
  en: { Cardinal: "Cardinal", Fixed: "Fixed", Mutable: "Mutable" },
  zh: { Cardinal: "本位", Fixed: "固定", Mutable: "变动" },
  es: { Cardinal: "Cardinal", Fixed: "Fijo", Mutable: "Mutable" },
  pt: { Cardinal: "Cardinal", Fixed: "Fixo", Mutable: "Mutável" },
  de: { Cardinal: "Kardinal", Fixed: "Fix", Mutable: "Veränderlich" },
  it: { Cardinal: "Cardinale", Fixed: "Fisso", Mutable: "Mutabile" },
};

const RULERS: Record<SunSignLocale, Record<string, string>> = {
  en: {
    Mars: "Mars",
    Venus: "Venus",
    Mercury: "Mercury",
    Moon: "Moon",
    Sun: "Sun",
    Pluto: "Pluto",
    Jupiter: "Jupiter",
    Saturn: "Saturn",
    Uranus: "Uranus",
    Neptune: "Neptune",
  },
  zh: {
    Mars: "火星",
    Venus: "金星",
    Mercury: "水星",
    Moon: "月亮",
    Sun: "太阳",
    Pluto: "冥王星",
    Jupiter: "木星",
    Saturn: "土星",
    Uranus: "天王星",
    Neptune: "海王星",
  },
  es: {
    Mars: "Marte",
    Venus: "Venus",
    Mercury: "Mercurio",
    Moon: "Luna",
    Sun: "Sol",
    Pluto: "Plutón",
    Jupiter: "Júpiter",
    Saturn: "Saturno",
    Uranus: "Urano",
    Neptune: "Neptuno",
  },
  pt: {
    Mars: "Marte",
    Venus: "Vênus",
    Mercury: "Mercúrio",
    Moon: "Lua",
    Sun: "Sol",
    Pluto: "Plutão",
    Jupiter: "Júpiter",
    Saturn: "Saturno",
    Uranus: "Urano",
    Neptune: "Netuno",
  },
  de: {
    Mars: "Mars",
    Venus: "Venus",
    Mercury: "Merkur",
    Moon: "Mond",
    Sun: "Sonne",
    Pluto: "Pluto",
    Jupiter: "Jupiter",
    Saturn: "Saturn",
    Uranus: "Uranus",
    Neptune: "Neptun",
  },
  it: {
    Mars: "Marte",
    Venus: "Venere",
    Mercury: "Mercurio",
    Moon: "Luna",
    Sun: "Sole",
    Pluto: "Plutone",
    Jupiter: "Giove",
    Saturn: "Saturno",
    Uranus: "Urano",
    Neptune: "Nettuno",
  },
};

const DATE_RANGES: Record<SunSignLocale, Record<SunSignName, string>> = {
  en: {
    Aries: "Mar 21 – Apr 19",
    Taurus: "Apr 20 – May 20",
    Gemini: "May 21 – Jun 20",
    Cancer: "Jun 21 – Jul 22",
    Leo: "Jul 23 – Aug 22",
    Virgo: "Aug 23 – Sep 22",
    Libra: "Sep 23 – Oct 22",
    Scorpio: "Oct 23 – Nov 21",
    Sagittarius: "Nov 22 – Dec 21",
    Capricorn: "Dec 22 – Jan 19",
    Aquarius: "Jan 20 – Feb 18",
    Pisces: "Feb 19 – Mar 20",
  },
  zh: {
    Aries: "3月21日 – 4月19日",
    Taurus: "4月20日 – 5月20日",
    Gemini: "5月21日 – 6月20日",
    Cancer: "6月21日 – 7月22日",
    Leo: "7月23日 – 8月22日",
    Virgo: "8月23日 – 9月22日",
    Libra: "9月23日 – 10月22日",
    Scorpio: "10月23日 – 11月21日",
    Sagittarius: "11月22日 – 12月21日",
    Capricorn: "12月22日 – 1月19日",
    Aquarius: "1月20日 – 2月18日",
    Pisces: "2月19日 – 3月20日",
  },
  es: {
    Aries: "21 mar – 19 abr",
    Taurus: "20 abr – 20 may",
    Gemini: "21 may – 20 jun",
    Cancer: "21 jun – 22 jul",
    Leo: "23 jul – 22 ago",
    Virgo: "23 ago – 22 sep",
    Libra: "23 sep – 22 oct",
    Scorpio: "23 oct – 21 nov",
    Sagittarius: "22 nov – 21 dic",
    Capricorn: "22 dic – 19 ene",
    Aquarius: "20 ene – 18 feb",
    Pisces: "19 feb – 20 mar",
  },
  pt: {
    Aries: "21 mar – 19 abr",
    Taurus: "20 abr – 20 mai",
    Gemini: "21 mai – 20 jun",
    Cancer: "21 jun – 22 jul",
    Leo: "23 jul – 22 ago",
    Virgo: "23 ago – 22 set",
    Libra: "23 set – 22 out",
    Scorpio: "23 out – 21 nov",
    Sagittarius: "22 nov – 21 dez",
    Capricorn: "22 dez – 19 jan",
    Aquarius: "20 jan – 18 fev",
    Pisces: "19 fev – 20 mar",
  },
  de: {
    Aries: "21. Mär – 19. Apr",
    Taurus: "20. Apr – 20. Mai",
    Gemini: "21. Mai – 20. Jun",
    Cancer: "21. Jun – 22. Jul",
    Leo: "23. Jul – 22. Aug",
    Virgo: "23. Aug – 22. Sep",
    Libra: "23. Sep – 22. Okt",
    Scorpio: "23. Okt – 21. Nov",
    Sagittarius: "22. Nov – 21. Dez",
    Capricorn: "22. Dez – 19. Jan",
    Aquarius: "20. Jan – 18. Feb",
    Pisces: "19. Feb – 20. Mär",
  },
  it: {
    Aries: "21 mar – 19 apr",
    Taurus: "20 apr – 20 mag",
    Gemini: "21 mag – 20 giu",
    Cancer: "21 giu – 22 lug",
    Leo: "23 lug – 22 ago",
    Virgo: "23 ago – 22 set",
    Libra: "23 set – 22 ott",
    Scorpio: "23 ott – 21 nov",
    Sagittarius: "22 nov – 21 dic",
    Capricorn: "22 dic – 19 gen",
    Aquarius: "20 gen – 18 feb",
    Pisces: "19 feb – 20 mar",
  },
};

export type LocalizedSunSignDisplay = {
  signKey: SunSignName;
  sign: string;
  element: string;
  modality: string;
  ruler: string;
  dateRange: string;
  adjacentSignKey: SunSignName | null;
  adjacentSign: string | null;
  degree: number;
  glyph: string;
  nearCusp: boolean;
  system: "tropical";
};

export function localizeSunSignDisplay(result: SunSignResult, locale: string): LocalizedSunSignDisplay {
  const lang = normalizeSunSignLocale(locale);
  const signNames = SIGN_NAMES[lang];
  const rulers = RULERS[lang];

  return {
    signKey: result.sign,
    sign: signNames[result.sign],
    element: ELEMENTS[lang][result.element],
    modality: MODALITIES[lang][result.modality],
    ruler: rulers[result.ruler] ?? result.ruler,
    dateRange: DATE_RANGES[lang][result.sign],
    adjacentSignKey: result.adjacentSign,
    adjacentSign: result.adjacentSign ? signNames[result.adjacentSign] : null,
    degree: result.degree,
    glyph: result.glyph,
    nearCusp: result.nearCusp,
    system: result.system,
  };
}
