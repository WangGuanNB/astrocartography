import { LandingPage, PricingPage, ShowcasePage, ConverterPage, ColorPage, AboutPage, ContactPage } from "@/types/pages/landing";
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

export async function getPage(
  name: string,
  locale: string
): Promise<LandingPage | PricingPage | ShowcasePage | ConverterPage | ColorPage | AboutPage | ContactPage> {
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
