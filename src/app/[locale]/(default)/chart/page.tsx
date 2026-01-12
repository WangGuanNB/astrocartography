// 🔥 SEO: 为 chart 页面添加 metadata（服务端组件）
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCanonicalUrl } from '@/lib/utils';
import { Suspense } from 'react';
import ChartContent from './chart-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('astrocartographyGenerator');

  const title = t('ui.title') || 'Astrocartography Chart';
  const description = t('ui.subtitle') || 'View your personalized astrocartography map';

  return {
    title,
    description,
    robots: {
      index: false, // 🔥 明确设置不索引（与 robots.txt 保持一致）
      follow: false,
    },
    alternates: {
      canonical: getCanonicalUrl(locale, '/chart'),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: getCanonicalUrl(locale, '/chart'),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function ChartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="size-16 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
      </div>
    }>
      <ChartContent />
    </Suspense>
  );
}
