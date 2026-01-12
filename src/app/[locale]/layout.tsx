import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { AppContextProvider } from "@/contexts/app";
import { Metadata } from "next";
import { NextAuthSessionProvider } from "@/auth/session";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/providers/theme";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  return {
    title: {
      template: `%s`,
      default: t("metadata.title") || "",
    },
    description: t("metadata.description") || "",
    keywords: t("metadata.keywords") || "",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 🔥 修复：直接导入语言文件，确保获取正确的消息
  // 因为 getMessages() 可能没有正确使用 setRequestLocale 的设置
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

  // 🔍 调试日志：检查 messages 是否正确获取
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [LocaleLayout] Locale:', locale);
    console.log('🔍 [LocaleLayout] Messages keys:', Object.keys(messages || {}));
    console.log('🔍 [LocaleLayout] Has astro_chat?', 'astro_chat' in (messages || {}));
    if (messages && 'astro_chat' in messages) {
      const astroChat = (messages as any).astro_chat;
      console.log('🔍 [LocaleLayout] astro_chat keys:', Object.keys(astroChat || {}));
      console.log('🔍 [LocaleLayout] welcome_title:', astroChat?.welcome_title);
      console.log('🔍 [LocaleLayout] suggested_questions:', astroChat?.suggested_questions);
    }
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NextAuthSessionProvider>
        <AppContextProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AppContextProvider>
      </NextAuthSessionProvider>
    </NextIntlClientProvider>
  );
}
