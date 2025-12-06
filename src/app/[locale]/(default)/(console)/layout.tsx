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

  // 🔥 关键修复：直接从 session 获取 uuid，避免重复调用 auth()
  // 因为 getUserUuid() 内部也会调用 auth()，可能导致时序问题
  let user_uuid = session?.user?.uuid;
  console.log("🚪 [ConsoleLayout] 从 session 直接获取 UUID", { 
    user_uuid: user_uuid || "未找到",
  });
  
  // 如果 session 中没有 uuid，但有 email，尝试从数据库恢复
  if (!user_uuid && session?.user?.email) {
    console.log("⚠️ [ConsoleLayout] session 中没有 UUID，尝试从数据库恢复", {
      email: session.user.email,
    });
    try {
      const { findUserByEmail } = await import("@/models/user");
      const dbUser = await findUserByEmail(session.user.email);
      if (dbUser) {
        user_uuid = dbUser.uuid;
        console.log("✅ [ConsoleLayout] 从数据库恢复 UUID 成功", {
          email: session.user.email,
          uuid: user_uuid,
        });
      } else {
        console.log("❌ [ConsoleLayout] 数据库中未找到用户", {
          email: session.user.email,
        });
      }
    } catch (e) {
      console.error("❌ [ConsoleLayout] 从数据库恢复 UUID 失败:", e);
    }
  }
  
  if (!user_uuid) {
    console.log("❌ [ConsoleLayout] user_uuid 缺失，重定向到登录页");
    redirect("/auth/signin");
  }

  // 如果 session 中有完整的用户信息，直接使用，避免再次查询数据库
  let userInfo = null;
  if (session?.user?.uuid && session?.user?.email) {
    userInfo = {
      uuid: session.user.uuid,
      email: session.user.email,
      nickname: (session.user as any).nickname || "",
      avatar_url: (session.user as any).avatar_url || "",
      created_at: (session.user as any).created_at,
    };
    console.log("✅ [ConsoleLayout] 从 session 获取用户信息", { 
      hasUserInfo: !!userInfo,
      userInfoEmail: userInfo?.email,
      userInfoUuid: userInfo?.uuid,
    });
  } else {
    // 如果 session 中没有完整信息，才调用 getUserInfo()
    console.log("🚪 [ConsoleLayout] 调用 getUserInfo()");
    userInfo = await getUserInfo();
    console.log("🚪 [ConsoleLayout] getUserInfo() 返回结果", { 
      hasUserInfo: !!userInfo,
      userInfoEmail: userInfo?.email,
      userInfoUuid: userInfo?.uuid,
    });
  }
  
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
