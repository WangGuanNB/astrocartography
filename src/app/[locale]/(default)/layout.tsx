import Footer from "@/components/blocks/footer";
import Header from "@/components/blocks/header";
import { ReactNode } from "react";
import { getLandingPage } from "@/services/page";
import Feedback from "@/components/feedback";

// 🔥 CPU 优化：Layout 也使用静态生成，7天缓存
export const revalidate = 604800;  // 7天缓存
export const dynamic = 'force-static';

export default async function DefaultLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  return (
    <>
      {/* 头部导航栏*/}
      {page.header && <Header header={page.header} />}
      {/* 中间内容页*/}
      <main className="overflow-x-hidden">{children}</main>
      {/* 底部导航栏*/}
      {page.footer && <Footer footer={page.footer} locale={locale} />}
      {/* 悬浮信息按钮*/}
      <Feedback socialLinks={page.footer?.social?.items} />
    </>
  );
}
