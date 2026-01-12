"use client";

import { SessionProvider } from "next-auth/react";
import { isAuthEnabled } from "@/lib/auth";

export function NextAuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 即使 Auth 未启用，也提供 SessionProvider
  // 这样 useSession() 就不会报错（会返回 null session）
  // 这确保了 React Hooks 规则的一致性
  return (
    <SessionProvider
      refetchInterval={0} // 禁用自动刷新，避免频繁请求
      refetchOnWindowFocus={false} // 禁用窗口聚焦时刷新，避免不必要的请求
      basePath={isAuthEnabled() ? "/api/auth" : undefined} // 只在启用时指定 basePath
    >
      {children}
    </SessionProvider>
  );
}
