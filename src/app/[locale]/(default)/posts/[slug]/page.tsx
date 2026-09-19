import {
  PostStatus,
  findOnlineLocalesForSlug,
  findPostBySlug,
} from "@/models/post";

import BlogDetail from "@/components/blocks/blog-detail";
import { Post } from "@/types/post";
import {
  buildPostHreflangAlternates,
  getCanonicalUrl,
} from "@/lib/utils";
import { notFound } from "next/navigation";

// Posts 详情从数据库查询，必须使用 SSR（无法静态生成）
export const dynamic = "force-dynamic";

const postPath = (slug: string) => `/posts/${slug}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const post = await findPostBySlug(slug, locale);

  if (!post || post.status !== PostStatus.Online) {
    notFound();
  }

  const onlineLocales = await findOnlineLocalesForSlug(slug);

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: getCanonicalUrl(locale, postPath(slug)),
      languages: buildPostHreflangAlternates(slug, onlineLocales),
    },
  };
}

export default async function ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await findPostBySlug(slug, locale);

  if (!post || post.status !== PostStatus.Online) {
    notFound();
  }

  const baseUrl = getCanonicalUrl("en", "/").replace(/\/$/, "");
  const currentUrl = getCanonicalUrl(locale, postPath(slug));

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `${baseUrl}/imgs/features/astrocartography-lines-calculation.webp`,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      "@type": "Organization",
      name: "AstroCartography",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "AstroCartography",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": currentUrl,
    },
    inLanguage: locale,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <BlogDetail post={post as unknown as Post} locale={locale} />
    </>
  );
}
