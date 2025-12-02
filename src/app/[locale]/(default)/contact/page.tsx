import { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/utils";
import ContactFormClient from "./contact-form-client";
import { getContactPage } from "@/services/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getContactPage(locale);

  return {
    title: page.metadata.title,
    description: page.metadata.description,
    keywords: page.metadata.keywords,
    openGraph: {
      title: page.metadata.title,
      description: page.metadata.description,
      type: "website",
      url: getCanonicalUrl(locale, "/contact"),
    },
    twitter: {
      card: "summary_large_image",
      title: page.metadata.title,
      description: page.metadata.description,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: getCanonicalUrl(locale, "/contact"),
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getContactPage(locale);

  return <ContactFormClient page={page} />;
}

