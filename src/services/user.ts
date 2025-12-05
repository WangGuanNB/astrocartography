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

/**
 * 获取或创建测试用户（仅在开发环境且启用测试模式时）
 */
async function getOrCreateTestUser() {
  const TEST_USER_EMAIL = "test@local.dev";
  const TEST_USER_UUID = "test-user-uuid-local-dev";

  // 查找或创建测试用户
  let testUser = await findUserByEmail(TEST_USER_EMAIL);
  if (!testUser) {
    // 创建测试用户
    const newUser = {
      uuid: TEST_USER_UUID,
      email: TEST_USER_EMAIL,
      nickname: "Test User",
      avatar_url: "",
      signin_type: "credentials",
      signin_provider: "test",
      signin_openid: "test",
      created_at: new Date(),
      invite_code: "",
      invited_by: "",
      is_affiliate: false,
    };
    testUser = await insertUser(newUser as typeof users.$inferInsert);
  }

  return testUser;
}

export async function getUserUuid() {
  // 测试模式：仅在开发环境且启用测试模式时生效
  const isTestMode =
    process.env.SKIP_AUTH_FOR_TESTING === "true" &&
    process.env.NODE_ENV !== "production";

  if (isTestMode) {
    console.log("🧪 [TEST MODE] Skipping authentication, using test user");
    const testUser = await getOrCreateTestUser();
    return testUser?.uuid || "";
  }

  let user_uuid = "";

  const token = await getBearerToken();

  if (token) {
    // api key
    if (token.startsWith("sk-")) {
      const user_uuid = await getUserUuidByApiKey(token);

      return user_uuid || "";
    }
  }

  const session = await auth();
  if (session && session.user && session.user.uuid) {
    user_uuid = session.user.uuid;
  }

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
  // 测试模式：仅在开发环境且启用测试模式时生效
  const isTestMode =
    process.env.SKIP_AUTH_FOR_TESTING === "true" &&
    process.env.NODE_ENV !== "production";

  if (isTestMode) {
    const testUser = await getOrCreateTestUser();
    return testUser?.email || "test@local.dev";
  }

  let user_email = "";

  const session = await auth();
  if (session && session.user && session.user.email) {
    user_email = session.user.email;
  }

  return user_email;
}

export async function getUserInfo() {
  let user_uuid = await getUserUuid();

  if (!user_uuid) {
    return;
  }

  const user = await findUserByUuid(user_uuid);

  return user;
}
