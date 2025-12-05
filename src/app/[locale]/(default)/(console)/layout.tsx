import ConsoleLayout from "@/components/console/layout";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { getTranslations } from "next-intl/server";
import { getUserInfo, getUserUuid } from "@/services/user";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ({ children }: { children: ReactNode }) {
  console.log("🚪 [ConsoleLayout] 开始检查认证状态");
  
  // 先检查 session 是否存在
  console.log("🚪 [ConsoleLayout] 调用 auth() 获取 session");
  const session = await auth();
  console.log("🚪 [ConsoleLayout] auth() 返回结果", {
    hasSession: !!session,
    hasUser: !!(session && session.user),
    sessionExpires: session?.expires,
    userEmail: session?.user?.email,
    userUuid: session?.user?.uuid,
    userKeys: session?.user ? Object.keys(session.user) : [],
    fullSession: JSON.stringify(session, null, 2),
  });

  console.log("🚪 [ConsoleLayout] 调用 getUserUuid()");
  const user_uuid = await getUserUuid();
  console.log("🚪 [ConsoleLayout] getUserUuid() 返回结果", { 
    user_uuid: user_uuid || "未找到",
  });
  
  if (!user_uuid) {
    console.log("❌ [ConsoleLayout] user_uuid 缺失，重定向到登录页");
    redirect("/auth/signin");
  }

  console.log("🚪 [ConsoleLayout] 调用 getUserInfo()");
  const userInfo = await getUserInfo();
  console.log("🚪 [ConsoleLayout] getUserInfo() 返回结果", { 
    hasUserInfo: !!userInfo,
    userInfoEmail: userInfo?.email,
    userInfoUuid: userInfo?.uuid,
  });
  
  if (!userInfo) {
    console.log("❌ [ConsoleLayout] userInfo 缺失，重定向到登录页");
    redirect("/auth/signin");
  }

  console.log("✅ [ConsoleLayout] 认证检查通过，渲染页面");

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
