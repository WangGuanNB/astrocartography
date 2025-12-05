import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { NextAuthConfig } from "next-auth";
import { Provider } from "next-auth/providers/index";
import { User } from "@/types/user";
import { getClientIp } from "@/lib/ip";
import { getIsoTimestr } from "@/lib/time";
import { getUuid } from "@/lib/hash";
import { saveUser } from "@/services/user";
import { handleSignInUser } from "./handler";

let providers: Provider[] = [];

// Google One Tap Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true" &&
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID
) {
  providers.push(
    CredentialsProvider({
      id: "google-one-tap",
      name: "google-one-tap",

      credentials: {
        credential: { type: "text" },
      },

      async authorize(credentials, req) {
        const googleClientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;
        if (!googleClientId) {
          console.log("invalid google auth config");
          return null;
        }

        const token = credentials!.credential;

        const response = await fetch(
          "https://oauth2.googleapis.com/tokeninfo?id_token=" + token
        );
        if (!response.ok) {
          console.log("Failed to verify token");
          return null;
        }

        const payload = await response.json();
        if (!payload) {
          console.log("invalid payload from token");
          return null;
        }

        const {
          email,
          sub,
          given_name,
          family_name,
          email_verified,
          picture: image,
        } = payload;
        if (!email) {
          console.log("invalid email in payload");
          return null;
        }

        const user = {
          id: sub,
          name: [given_name, family_name].join(" "),
          email,
          image,
          emailVerified: email_verified ? new Date() : null,
        };

        return user;
      },
    })
  );
}

// UUID 测试登录 Provider（仅开发环境，通过 URL 参数直接登录）
if (process.env.NODE_ENV === "development") {
  providers.push(
    CredentialsProvider({
      id: "uuid-test",
      name: "UUID Test Login",
      credentials: {
        uuid: { label: "UUID", type: "text" },
      },
      async authorize(credentials) {
        const uuid = credentials?.uuid;
        if (!uuid) {
          console.log("uuid-test provider: no uuid provided");
          return null;
        }

        try {
          // 从数据库查找用户
          const { findUserByUuid } = await import("@/models/user");
          const dbUser = await findUserByUuid(uuid as string);

          if (!dbUser) {
            console.log("uuid-test provider: user not found for uuid", uuid);
            return null;
          }

          console.log("uuid-test provider: found user", {
            uuid: dbUser.uuid,
            email: dbUser.email,
          });

          return {
            id: dbUser.uuid,
            email: dbUser.email,
            name: dbUser.nickname || "Test User",
            image: dbUser.avatar_url || "",
          };
        } catch (e) {
          console.error("uuid-test provider: failed to authorize", e);
          return null;
        }
      },
    })
  );
}

// Google Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" &&
  process.env.AUTH_GOOGLE_ID &&
  process.env.AUTH_GOOGLE_SECRET
) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

// Github Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true" &&
  process.env.AUTH_GITHUB_ID &&
  process.env.AUTH_GITHUB_SECRET
) {
  providers.push(
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter((provider) => provider.id !== "google-one-tap");

export const authOptions: NextAuthConfig = {
  providers,
  pages: {
    signIn: "/auth/signin",
  },
  // 信任主机名，确保 cookie 在生产环境正确设置
  trustHost: true,
  // Cookie 配置，确保跨域和安全性
  // NextAuth v5 默认使用 authjs.session-token，需要与实际的 cookie 名称匹配
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // 不设置 domain，让浏览器自动处理，确保子域名也能访问
        // domain 留空，NextAuth 会自动处理
      },
    },
  },
  // 确保 session 策略正确
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("🔐 [signIn callback] 用户登录检查", {
        hasUser: !!user,
        userEmail: user?.email,
        userUuid: user?.id,
        hasAccount: !!account,
        accountProvider: account?.provider,
        accountType: account?.type,
      });
      const isAllowedToSignIn = true;
      if (isAllowedToSignIn) {
        console.log("✅ [signIn callback] 允许登录");
        return true;
      } else {
        console.log("❌ [signIn callback] 拒绝登录");
        // Return false to display a default error message
        return false;
        // Or you can return a URL to redirect to:
        // return '/unauthorized'
      }
    },
    async redirect({ url, baseUrl }) {
      console.log("🔄 [redirect callback] 重定向检查", { url, baseUrl });
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        const finalUrl = `${baseUrl}${url}`;
        console.log("🔄 [redirect callback] 相对路径重定向", { finalUrl });
        return finalUrl;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        console.log("🔄 [redirect callback] 同源重定向", { url });
        return url;
      }
      console.log("🔄 [redirect callback] 默认重定向到 baseUrl", { baseUrl });
      return baseUrl;
    },
    async session({ session, token, user }) {
      console.log("📋 [session callback] 开始处理 session", {
        hasSession: !!session,
        hasToken: !!token,
        hasUser: !!user,
        sessionExpires: session?.expires,
        tokenKeys: token ? Object.keys(token) : [],
        hasTokenUser: !!(token && token.user),
        hasTokenEmail: !!(token && token.email),
        sessionUserEmail: session?.user?.email,
        sessionUserUuid: session?.user?.uuid,
      });

      // 如果 token.user 存在，直接使用
      if (token && token.user && token.user.uuid) {
        session.user = {
          ...session.user,
          ...token.user,
        };
        console.log("✅ [session callback] 使用 token.user", {
          uuid: token.user.uuid,
          email: token.user.email,
          fullUser: JSON.stringify(session.user, null, 2),
        });
        return session;
      }

      // 如果 token.user 不存在，尝试从数据库恢复
      // 优先使用 token.email，如果没有则使用 session.user.email
      const email = (token.email as string) || session.user?.email;
      console.log("🔍 [session callback] 尝试从数据库恢复用户", { email });
      
      if (email) {
        try {
          const { findUserByEmail } = await import("@/models/user");
          const dbUser = await findUserByEmail(email);
          
          if (dbUser) {
            // 恢复用户信息到 token，以便下次使用
            token.user = {
              uuid: dbUser.uuid,
              email: dbUser.email,
              nickname: dbUser.nickname || "",
              avatar_url: dbUser.avatar_url || "",
              created_at: dbUser.created_at,
            };
            token.email = dbUser.email;
            
            // 设置 session.user
            session.user = {
              ...session.user,
              ...token.user,
            };
            console.log("✅ [session callback] 从数据库恢复用户成功", {
              uuid: dbUser.uuid,
              email: dbUser.email,
              fullUser: JSON.stringify(session.user, null, 2),
            });
          } else {
            console.log("❌ [session callback] 数据库中未找到用户", { email });
          }
        } catch (e) {
          console.error("❌ [session callback] 从数据库恢复用户失败:", e);
        }
      } else {
        console.log("❌ [session callback] 没有 email，无法恢复用户", {
          hasTokenUser: !!(token && token.user),
          hasTokenEmail: !!(token && token.email),
          hasSessionUserEmail: !!session.user?.email,
          tokenData: JSON.stringify(token, null, 2),
        });
      }

      console.log("📋 [session callback] 最终 session", {
        hasUser: !!session.user,
        userUuid: session.user?.uuid,
        userEmail: session.user?.email,
      });
      return session;
    },
    async jwt({ token, user, account }) {
      console.log("🔑 [jwt callback] 开始处理 JWT token", {
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        accountProvider: account?.provider,
        accountType: account?.type,
        userEmail: user?.email,
        userId: user?.id,
        tokenKeys: token ? Object.keys(token) : [],
        hasTokenUser: !!(token && token.user),
        hasTokenEmail: !!(token && token.email),
      });

      // Persist the OAuth access_token and or the user id to the token right after signin
      try {
        // 如果是首次登录，处理用户信息
        if (user && account) {
          console.log("🔑 [jwt callback] 首次登录，处理用户信息", {
            provider: account.provider,
            userEmail: user.email,
            userId: user.id,
          });

          // uuid-test provider: 用户已存在，直接从数据库获取
          if (account.provider === "uuid-test") {
            console.log("🔑 [jwt callback] uuid-test provider，从数据库获取用户", { userId: user.id });
            const { findUserByUuid } = await import("@/models/user");
            const dbUser = await findUserByUuid(user.id); // user.id 就是 uuid
            
            if (dbUser) {
              token.user = {
                uuid: dbUser.uuid,
                email: dbUser.email,
                nickname: dbUser.nickname || "",
                avatar_url: dbUser.avatar_url || "",
                created_at: dbUser.created_at,
              };
              token.email = dbUser.email;
              console.log("✅ [jwt callback] uuid-test 登录成功", {
                uuid: dbUser.uuid,
                email: dbUser.email,
                tokenUser: JSON.stringify(token.user, null, 2),
              });
              return token;
            } else {
              console.error("❌ [jwt callback] uuid-test: 数据库中未找到用户", { userId: user.id });
              throw new Error("uuid-test: user not found in database");
            }
          }

          // 其他 provider: 调用 handleSignInUser 处理（创建或更新用户）
          console.log("🔑 [jwt callback] 其他 provider，调用 handleSignInUser", { provider: account.provider });
          const userInfo = await handleSignInUser(user, account);
          if (!userInfo) {
            console.error("❌ [jwt callback] handleSignInUser 返回空");
            throw new Error("save user failed");
          }

          // 保存用户信息到 token
          token.user = {
            uuid: userInfo.uuid,
            email: userInfo.email,
            nickname: userInfo.nickname,
            avatar_url: userInfo.avatar_url,
            created_at: userInfo.created_at,
          };
          
          // 同时保存 email 到 token，以便刷新时恢复
          token.email = userInfo.email;

          console.log("✅ [jwt callback] 首次登录处理完成", {
            uuid: userInfo.uuid,
            email: userInfo.email,
            tokenUser: JSON.stringify(token.user, null, 2),
          });
          return token;
        }

        // 如果是 token 刷新（user 和 account 为 undefined）
        console.log("🔑 [jwt callback] Token 刷新（非首次登录）");
        // 如果 token.user 不存在，尝试从数据库中恢复（通过 email）
        if (!token.user) {
          console.log("⚠️ [jwt callback] token.user 不存在，尝试从数据库恢复");
          // 使用 token.email 从数据库恢复用户信息
          const email = token.email as string;
          if (email) {
            console.log("🔍 [jwt callback] 从数据库恢复用户", { email });
            try {
              const { findUserByEmail } = await import("@/models/user");
              const dbUser = await findUserByEmail(email);
              if (dbUser) {
                token.user = {
                  uuid: dbUser.uuid,
                  email: dbUser.email,
                  nickname: dbUser.nickname || "",
                  avatar_url: dbUser.avatar_url || "",
                  created_at: dbUser.created_at,
                };
                // 确保 email 也被保存
                token.email = dbUser.email;
                console.log("✅ [jwt callback] 从数据库恢复用户成功", {
                  uuid: dbUser.uuid,
                  email: dbUser.email,
                });
              } else {
                console.log("❌ [jwt callback] 数据库中未找到用户", { email });
              }
            } catch (e) {
              console.error("❌ [jwt callback] 从数据库恢复用户失败:", e);
            }
          } else {
            console.log("❌ [jwt callback] token.email 不存在，无法恢复用户");
          }
        } else {
          console.log("✅ [jwt callback] token.user 已存在，无需恢复", {
            uuid: token.user.uuid,
            email: token.user.email,
          });
        }

        console.log("🔑 [jwt callback] Token 处理完成", {
          hasTokenUser: !!token.user,
          tokenUserUuid: token.user?.uuid,
          tokenUserEmail: token.user?.email,
        });
        return token;
      } catch (e) {
        console.error("❌ [jwt callback] 处理失败:", e);
        return token;
      }
    },
  },
};
