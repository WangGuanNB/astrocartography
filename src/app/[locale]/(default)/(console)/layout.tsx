import ConsoleLayout from "@/components/console/layout";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { getTranslations } from "next-intl/server";
import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";

export default async function ({ children }: { children: ReactNode }) {
  // 🔥 简化认证逻辑：直接使用 getUserInfo()，与 AdminLayout 保持一致
  // getUserInfo() 内部已经处理了所有复杂的认证和恢复逻辑
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
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
        {
          title: t("research_project.navTitle"),
          url: "/my-research",
          icon: "RiMapPinLine",
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
