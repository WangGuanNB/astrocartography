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
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      const isAllowedToSignIn = true;
      if (isAllowedToSignIn) {
        return true;
      } else {
        // Return false to display a default error message
        return false;
        // Or you can return a URL to redirect to:
        // return '/unauthorized'
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token, user }) {
      // 如果 token.user 存在，直接使用
      if (token && token.user && token.user) {
        session.user = token.user;
        return session;
      }

      // 如果 token.user 不存在，尝试从数据库恢复
      // 优先使用 token.email，如果没有则使用 session.user.email
      const email = (token.email as string) || session.user?.email;
      
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
            session.user = token.user;
          }
        } catch (e) {
          console.error("session callback: failed to recover user from database:", e);
        }
      }

      return session;
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      try {
        // 如果是首次登录，处理用户信息
        if (user && account) {
          const userInfo = await handleSignInUser(user, account);
          if (!userInfo) {
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

          return token;
        }

        // 如果是 token 刷新（user 和 account 为 undefined）
        // 如果 token.user 不存在，尝试从数据库中恢复（通过 email）
        if (!token.user) {
          // 使用 token.email 从数据库恢复用户信息
          const email = token.email as string;
          if (email) {
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
              }
            } catch (e) {
              console.error("jwt callback: failed to recover user from database:", e);
            }
          }
        }

        return token;
      } catch (e) {
        console.error("jwt callback error:", e);
        return token;
      }
    },
  },
};
