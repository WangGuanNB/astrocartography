// 🔥 CPU 优化：将首页改为静态生成（ISR），7天重新验证
export const dynamic = 'force-static';
export const revalidate = 604800;  // 7天缓存（内容很少变化，延长缓存降低 CPU）
export const dynamicParams = true;

// 预生成多语言版本（ISR 优化，7天缓存）
export async function generateStaticParams() {
  return [
    { locale: 'en' },  // 英文版
    { locale: 'es' },  // 西班牙语
    { locale: 'it' },  // 意大利语
    { locale: 'pt' },  // 葡萄牙语
    { locale: 'zh' },  // 中文
    { locale: 'de' },  // 德语
    // { locale: 'ms' },  // 马来语（暂不开放）
  ];
}

import CTA from "@/components/blocks/cta";
import FAQ from "@/components/blocks/faq";
import Feature from "@/components/blocks/feature";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import FeatureGrid from "@/components/blocks/feature-grid";
import Hero from "@/components/blocks/hero";
import MiniaturaAIGenerator from "@/components/blocks/miniatur-ai-generator/loadable";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Pricing from "@/components/blocks/pricing";
import Stats from "@/components/blocks/stats";
import TaaftVerifyBadge from "@/components/blocks/taaft-verify-badge";
import Testimonial from "@/components/blocks/testimonial";
import { defaultLocale } from "@/i18n/locale";
import { getLandingPage } from "@/services/page";
import { applySubscriptionPricingFilter } from "@/services/subscription";
import { getCanonicalUrl } from "@/lib/utils";
import { Section as SectionType } from "@/types/blocks/section";
import Icon from "@/components/icon";
import Link from "next/link";
// import TestPaymentModal from '@/components/payment/test-payment-modal';

function PopularLinesSection({ section }: { section?: SectionType }) {
  if (!section || section.disabled) {
    return null;
  }

  return (
    <section id={section.name || "popular-lines"} className="bg-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {section.label && (
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
              {section.label}
            </p>
          )}
          {section.title && (
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {section.title}
            </h2>
          )}
          {section.description && (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              {section.description}
            </p>
          )}
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.items?.map((item, index) => (
            <Link
              key={`${item.title}-${index}`}
              href={item.url || "/astrocartography-lines"}
              className="group rounded-lg border bg-card p-5 text-card-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-start gap-4">
                {item.icon && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </div>
                )}
                <div>
                  {item.title && (
                    <h3 className="font-semibold leading-tight group-hover:text-primary">
                      {item.title}
                    </h3>
                  )}
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {section.cta?.button && (
          <div className="mt-8 text-center">
            <Link
              href={section.cta.button.url || "/astrocartography-lines"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              {section.cta.button.icon && (
                <Icon name={section.cta.button.icon} className="h-4 w-4" />
              )}
              {section.cta.button.title}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}



export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 🔥 修复：直接导入语言文件，确保获取正确的 metadata
  // 因为 getTranslations() 在 generateMetadata 中可能无法正确获取 locale
  let messages;
  try {
    // 规范化 locale（确保小写）
    const normalizedLocale = locale.toLowerCase();
    messages = (await import(`@/i18n/messages/${normalizedLocale}.json`)).default;
  } catch (e) {
    // 如果导入失败，回退到英文
    console.warn(`Failed to load messages for locale ${locale}, falling back to en`);
    messages = (await import(`@/i18n/messages/en.json`)).default;
  }

  const title = messages?.metadata?.title || "";
  const description = messages?.metadata?.description || "";
  const keywords = messages?.metadata?.keywords || "";

  const metadata: any = {
    title: {
      template: `%s | Astrocarto`,
      default: title,
    },
    description,
    keywords,
    alternates: {
      canonical: getCanonicalUrl(locale),
      languages: {
        en: getCanonicalUrl("en", "/"),
        de: getCanonicalUrl("de", "/"),
        es: getCanonicalUrl("es", "/"),
        it: getCanonicalUrl("it", "/"),
        pt: getCanonicalUrl("pt", "/"),
        zh: getCanonicalUrl("zh", "/"),
        "x-default": getCanonicalUrl("en", "/"),
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale),
      siteName: "Astrocarto",
      images: [
        {
          url: "/imgs/features/hero-web.webp",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/imgs/features/hero-web.webp"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  // 只在英文版本添加 Foundr 验证 meta 标签
  if (locale === "en") {
    metadata.other = {
      "_foundr": "9a6028ae8f80618dd025c26eff1fcf8d"
    };
  }

  return metadata;
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);
  const pricing = applySubscriptionPricingFilter(page.pricing, { surface: "research" });

  const faqSchema = page.faq?.items?.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": page.faq.items.map((item: any) => ({
      "@type": "Question",
      "name": item.title,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.description
      }
    }))
  } : null;

  // 🔥 SEO优化：添加软件应用和评分的结构化数据
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Astrocartography Calculator",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "714",
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": page.testimonial?.items?.slice(0, 3).map((item: any) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": item.title
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "reviewBody": item.description
    }))
  };

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {softwareSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      )}
      {/* Hero Section：一句主标题 + 一句副标题 + 一段简短价值描述 + CTA按钮文字-----------*/}
      {page.hero && <Hero hero={page.hero}/> }
      {/* 图片类的网站 */}
      {/* {page.hero && <MiniaturaAIHero hero={page.hero as any} />} */}

      {/* 工具页 ------------------------------------------------*/}
      {/* <TestPaymentModal /> */}
      {/*I 图片生成器 */}
      <MiniaturaAIGenerator />
    

      {/* {page.branding && <Branding section={page.branding} />} */}


      {/* What is [Tool Name]：定义该工具是什么，主要解决哪些痛点（含主关键词）----------- */}
      {/* 工具站<带图片>*/}
        {page.introduce && <FeatureWhatTwo section={page.introduce} />}
      {/* <不带图片 /> */}
      {/* {page.introduce && <FeatureWhatOne section={page.introduce} />} */}

      {/* Popular Astrocartography Lines：低风险内链模块，帮助首页传递主题权重到 Lines 页面 */}
      {page.popularLines && <PopularLinesSection section={page.popularLines} />}

      {/* How to Read Your Astrocartography Map：教用户如何解读地图（教育内容）----------- */}
      {page.howToRead && <FeatureGrid section={page.howToRead} />}


      {/* ，Why Choose [Tool Name]：列出3~4个理由，说明与其他工具的差异------ */}
        {/* <带图片 /> */}
       {page.benefit && <Feature2 section={page.benefit} />} 
        {/* { <不带图片 /> } */}
       {/* {page.benefit && <Feature2WhyOne section={page.benefit} />} */}


      {/* How to Use [Tool Name]：用3个步骤说明使用流程------------ */}
      {page.usage && <Feature3 section={page.usage} />}


      {/*Key Features：列出4~6个主要功能（每个30~50字）- */}
      {page.feature && <Feature section={page.feature} />}

      {/* Stats：统计数字展示社会证明 - 提升Google信任度和SEO */}
      {page.stats && <Stats section={page.stats} />}

      {/* Testimonials / People Love：展示2~3条用户好评或社会信任信息 */}  
      {page.testimonial && <Testimonial section={page.testimonial} />}

     {/* 价格信息*/}
      {pricing && <Pricing pricing={pricing} />}
       
      {/* FAQ（Frequently Asked Questions）：3~5个问题+简短回答，每个回答≤80字- */}
      {page.faq && <FAQ section={page.faq} />}
      
      {/*Footer：收尾文案 + 品牌词 + CTA（鼓励立即使用）-- */}
      {page.cta && <CTA section={page.cta} />}

      {/* TAAFT verify: EN homepage only — do not put in shared header/footer */}
      {locale === defaultLocale && <TaaftVerifyBadge />}
    </>
  );
}
