import { Metadata } from "next";
import { getCalculatorPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";
import MiniaturaAIGenerator from "@/components/blocks/miniatur-ai-generator";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Feature from "@/components/blocks/feature";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import Link from "next/link";

// 🔥 CPU 优化：静态生成，7天缓存
export const dynamic = 'force-static';
export const revalidate = 604800;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'zh' },
    { locale: 'pt' },
    { locale: 'es' },
    { locale: 'it' },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getCalculatorPage(locale);

  const title = page.metadata.title;
  const description = page.metadata.description;
  const keywords = page.metadata.keywords || "";

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "website",
      url: getCanonicalUrl(locale, '/astrocartography-calculator'),
      siteName: "Astrocartography Calculator",
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
    alternates: {
      canonical: getCanonicalUrl(locale, '/astrocartography-calculator'),
      languages: {
        'en': getCanonicalUrl('en', '/astrocartography-calculator'),
        'zh': getCanonicalUrl('zh', '/astrocartography-calculator'),
        'pt': getCanonicalUrl('pt', '/astrocartography-calculator'),
        'es': getCanonicalUrl('es', '/astrocartography-calculator'),
        'it': getCanonicalUrl('it', '/astrocartography-calculator'),
      },
    },
  };
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getCalculatorPage(locale);

  // 从 metadata.title 中提取 H1 标题（移除年份和副标题，保留核心关键词）
  const getH1Title = (title: string): string => {
    // 移除年份（如 "2026"）和副标题（" - " 之后的内容）
    return title.split(' - ')[0].replace(/\s+\d{4}$/, '').trim();
  };

  const h1Title = getH1Title(page.metadata.title);

  return (
    <>
      {/* H1 标签 - SEO 关键元素，页面唯一主标题 */}
      <div className="container max-w-4xl px-4 pt-6 pb-4 lg:pt-12 lg:pb-6">
        <h1 className="text-center text-white text-2xl font-bold leading-tight lg:text-4xl lg:leading-relaxed">
          {h1Title}
        </h1>
      </div>

      {/* Intent 锚点段 - 明确页面定位（给Google看的），放在表单上方，移动端小字体，桌面端大字体 */}
      {page.intentAnchor && (
        <div className="container max-w-4xl px-4 pb-4 lg:pb-6">
          <p className="text-center text-white text-base font-semibold leading-tight lg:text-3xl lg:leading-relaxed">
            {page.intentAnchor.text}
          </p>
        </div>
      )}

      {/* 内链部分 - 反向定义首页，避免关键词内耗，移到上方 */}
      {page.internalLinks && (
        <div className="container max-w-4xl px-4 pb-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:gap-6">
            {page.internalLinks.items.map((item, index) => (
              <Link
                key={index}
                href={item.url}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {item.text}{' '}
                <span className="font-semibold text-primary underline">
                  {item.linkText}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 计算器表单 */}
      <div className="py-8 lg:py-12">
        <MiniaturaAIGenerator />
      </div>

      {/* What is Astrocartography Calculator - 包含：如何计算、使用哪些参数、与birth chart的区别 */}
      {page.introduce && <FeatureWhatTwo section={page.introduce} />}

      {/* Why Choose Our Calculator - 包含：准确性说明 */}
      {page.benefit && <Feature2 section={page.benefit} />}

      {/* How to Use */}
      {page.usage && <Feature3 section={page.usage} />}

      {/* Key Features */}
      {page.feature && <Feature section={page.feature} />}

      {/* FAQ - 包含技术性问题 */}
      {page.faq && <FAQ section={page.faq} />}

      {/* CTA */}
      {page.cta && <CTA section={page.cta} />}

      {/* 结构化数据 - WebApplication Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Free Astrocartography Calculator",
            "description": "Professional-grade astrocartography calculator using Swiss Ephemeris. Generate personalized astrocartography charts with 1-mile accuracy. Free, no signup required.",
            "url": getCanonicalUrl(locale, '/astrocartography-calculator'),
            "applicationCategory": "UtilityApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "Astrocartography Calculator"
            },
            "featureList": [
              "Swiss Ephemeris calculations",
              "1-mile accuracy",
              "Interactive world map",
              "AI-powered interpretations",
              "Free unlimited use",
              "No registration required"
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "1250"
            }
          })
        }}
      />

      {/* 结构化数据 - BreadcrumbList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": getCanonicalUrl(locale, '/')
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Astrocartography Calculator",
                "item": getCanonicalUrl(locale, '/astrocartography-calculator')
              }
            ]
          })
        }}
      />

      {/* 结构化数据 - FAQPage Schema */}
      {page.faq && page.faq.items && page.faq.items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": page.faq.items.map((item) => ({
                "@type": "Question",
                "name": item.title,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.description
                }
              }))
            })
          }}
        />
      )}
    </>
  );
}

