import { CreditsAmount, CreditsTransType } from "./credit";
import { findUserByEmail, findUserByUuid, insertUser } from "@/models/user";

import { User } from "@/types/user";
import { auth } from "@/auth";
import { getIsoTimestr, getOneYearLaterTimestr } from "@/lib/time";
import { getUserUuidByApiKey } from "@/models/apikey";
import { headers } from "next/headers";
import { increaseCredits } from "./credit";
import { users } from "@/db/schema";
import { getUuid } from "@/lib/hash";

// save user to database, if user not exist, create a new user
export async function saveUser(user: User) {
  try {
    if (!user.email) {
      throw new Error("invalid user email");
    }

    const existUser = await findUserByEmail(user.email);

    if (!existUser) {
      // user not exist, create a new user
      if (!user.uuid) {
        user.uuid = getUuid();
      }

      console.log("user to be inserted:", user);

      const dbUser = await insertUser(user as typeof users.$inferInsert);

      // increase credits for new user, expire in one year
      await increaseCredits({
        user_uuid: user.uuid,
        trans_type: CreditsTransType.NewUser,
        credits: CreditsAmount.NewUserGet,
        expired_at: getOneYearLaterTimestr(),
      });

      user = {
        ...(dbUser as unknown as User),
      };
    } else {
      // user exist, return user info in db
      user = {
        ...(existUser as unknown as User),
      };
    }

    return user;
  } catch (e) {
    console.log("save user failed: ", e);
    throw e;
  }
}

export async function getUserUuid() {
  console.log("🔍 [getUserUuid] 开始获取用户 UUID");
  let user_uuid = "";

  const token = await getBearerToken();
  console.log("🔍 [getUserUuid] Bearer Token 检查", { hasToken: !!token, tokenPrefix: token ? token.substring(0, 10) : "" });

  if (token) {
    // api key
    if (token.startsWith("sk-")) {
      console.log("🔍 [getUserUuid] 使用 API Key 认证");
      const user_uuid = await getUserUuidByApiKey(token);
      console.log("🔍 [getUserUuid] API Key 认证结果", { user_uuid: user_uuid || "未找到" });
      return user_uuid || "";
    }
  }

  console.log("🔍 [getUserUuid] 开始调用 auth() 获取 session");
  const session = await auth();
  console.log("🔍 [getUserUuid] auth() 返回结果", {
    hasSession: !!session,
    hasUser: !!(session && session.user),
    sessionExpires: session?.expires,
    userEmail: session?.user?.email,
    userUuid: session?.user?.uuid,
    userKeys: session?.user ? Object.keys(session.user) : [],
    fullSession: JSON.stringify(session, null, 2),
  });
  
  if (session && session.user) {
    if (session.user.uuid) {
      user_uuid = session.user.uuid;
      console.log("✅ [getUserUuid] 从 session 中找到 UUID", { uuid: user_uuid });
    } else {
      console.log("⚠️ [getUserUuid] session.user 存在但没有 UUID", {
        hasEmail: !!session.user.email,
        email: session.user.email,
        userKeys: Object.keys(session.user || {}),
        userData: JSON.stringify(session.user, null, 2),
      });
      
      // 如果 uuid 不存在，但 email 存在，尝试从数据库恢复
      if (session.user.email) {
        console.log("🔍 [getUserUuid] 尝试从数据库恢复 UUID", { email: session.user.email });
        try {
          const dbUser = await findUserByEmail(session.user.email);
          if (dbUser) {
            user_uuid = dbUser.uuid;
            console.log("✅ [getUserUuid] 从数据库恢复 UUID 成功", { 
              email: session.user.email,
              uuid: user_uuid 
            });
          } else {
            console.log("❌ [getUserUuid] 数据库中未找到用户", { email: session.user.email });
          }
        } catch (e) {
          console.error("❌ [getUserUuid] 从数据库恢复 UUID 失败:", e);
        }
      } else {
        console.log("❌ [getUserUuid] session.user 中没有 email，无法恢复 UUID");
      }
    }
  } else {
    console.log("❌ [getUserUuid] 没有 session 或 session.user", {
      hasSession: !!session,
      hasUser: !!(session && session.user),
      sessionType: typeof session,
    });
  }

  console.log("🔍 [getUserUuid] 最终结果", { user_uuid: user_uuid || "未找到" });
  return user_uuid;
}

export async function getBearerToken() {
  const h = await headers();
  const auth = h.get("Authorization");
  if (!auth) {
    return "";
  }

  return auth.replace("Bearer ", "");
}

export async function getUserEmail() {
  let user_email = "";

  const session = await auth();
  if (session && session.user && session.user.email) {
    user_email = session.user.email;
  }

  return user_email;
}

export async function getUserInfo() {
  console.log("🔍 [getUserInfo] 开始获取用户信息");
  let user_uuid = await getUserUuid();

  if (!user_uuid) {
    console.log("❌ [getUserInfo] 没有 user_uuid，返回空");
    return;
  }

  console.log("🔍 [getUserInfo] 从数据库查询用户信息", { user_uuid });
  const user = await findUserByUuid(user_uuid);
  console.log("🔍 [getUserInfo] 数据库查询结果", { 
    hasUser: !!user,
    userEmail: user?.email,
    userUuid: user?.uuid,
  });

  return user;
}
