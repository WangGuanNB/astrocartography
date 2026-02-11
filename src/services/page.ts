import { LandingPage, PricingPage, ShowcasePage, ConverterPage, ColorPage, AboutPage, ContactPage, CalculatorPage } from "@/types/pages/landing";
import { replaceSocialMediaUrls } from "@/lib/utils";

export async function getLandingPage(locale: string): Promise<LandingPage> {
  const pageData = (await getPage("landing", locale)) as LandingPage;
  // 注入环境变量配置的社交媒体链接
  return replaceSocialMediaUrls(pageData);
}

export async function getPricingPage(locale: string): Promise<PricingPage> {
  return (await getPage("pricing", locale)) as PricingPage;
}

export async function getShowcasePage(locale: string): Promise<ShowcasePage> {
  return (await getPage("showcase", locale)) as ShowcasePage;
}

export async function getConverterPage(locale: string): Promise<ConverterPage> {
  return (await getPage("converter", locale)) as ConverterPage;
}

export async function getColorPage(locale: string): Promise<ColorPage> {
  return (await getPage("color", locale)) as ColorPage;
}

export async function getAboutPage(locale: string): Promise<AboutPage> {
  return (await getPage("about", locale)) as AboutPage;
}

export async function getContactPage(locale: string): Promise<ContactPage> {
  return (await getPage("contact", locale)) as ContactPage;
}

export async function getCalculatorPage(locale: string): Promise<CalculatorPage> {
  return (await getPage("astrocartography-calculator", locale)) as CalculatorPage;
}

// English-only page for now, but still routed under [locale].
export async function getBirthChartPage(locale: string): Promise<CalculatorPage> {
  return (await getPage("birth-chart", locale)) as CalculatorPage;
}

export async function getRisingSignPage(locale: string): Promise<CalculatorPage> {
  return (await getPage("rising-sign-calculator", locale)) as CalculatorPage;
}

export async function getPage(
  name: string,
  locale: string
): Promise<LandingPage | PricingPage | ShowcasePage | ConverterPage | ColorPage | AboutPage | ContactPage | CalculatorPage> {
  try {
    if (locale === "zh-CN") {
      locale = "zh";
    }

    // Normalize locale to lowercase
    const normalizedLocale = locale.toLowerCase();

    const result = await import(
      `@/i18n/pages/${name}/${normalizedLocale}.json`
    ).then((module) => module.default);
    return result;
  } catch (error) {
    console.warn(`Failed to load ${name}/${locale}.json, falling back to en.json`);

    return await import(`@/i18n/pages/${name}/en.json`).then(
      (module) => module.default
    );
  }
}
