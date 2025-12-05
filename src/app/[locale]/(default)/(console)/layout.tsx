import ConsoleLayout from "@/components/console/layout";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { getTranslations } from "next-intl/server";
import { getUserInfo, getUserUuid } from "@/services/user";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ({ children }: { children: ReactNode }) {
  // 先检查 session 是否存在
  const session = await auth();
  
  // 获取 user_uuid
  const user_uuid = await getUserUuid();
  
  if (!user_uuid) {
    // 如果没有 user_uuid，检查 session 是否存在
    // 如果 session 存在但没有 uuid，说明需要重新登录
    if (session) {
      console.error("Session exists but no user.uuid found. Session:", {
        hasUser: !!session.user,
        userKeys: session.user ? Object.keys(session.user) : [],
      });
    }
    // 重定向到登录页面，并带上回调 URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_WEB_URL || ""}/my-orders`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const userInfo = await getUserInfo();
  if (!userInfo) {
    // 如果数据库中没有用户信息，也重定向到登录页面
    const callbackUrl = `${process.env.NEXT_PUBLIC_WEB_URL || ""}/my-orders`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const t = await getTranslations();

  const sidebar: Sidebar = {
    nav: {
      items: [
        {
          title: t("user.my_orders"),
          url: "/my-orders",
          icon: "RiOrderPlayLine",
          is_active: false,
        },
        {
          title: t("my_credits.title"),
          url: "/my-credits",
          icon: "RiBankCardLine",
          is_active: false,
        },
        // {
        //   title: t("my_invites.title"),
        //   url: "/my-invites",
        //   icon: "RiMoneyCnyCircleFill",
        //   is_active: false,
        // },
        // {
        //   title: t("api_keys.title"),
        //   url: "/api-keys",
        //   icon: "RiKey2Line",
        //   is_active: false,
        // },
      ],
    },
  };

  return <ConsoleLayout sidebar={sidebar}>{children}</ConsoleLayout>;
}
