"use client";

import googleOneTap from "google-one-tap";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { isAuthEnabled, isGoogleOneTapEnabled } from "@/lib/auth";

export default function () {
  // ⚠️ 重要：React Hooks 必须在组件顶层无条件调用
  // 始终调用 useSession（hooks 必须在顶层调用）
  // 如果不在 SessionProvider 内部，useSession 会返回默认值或报错
  const { data: session, status } = useSession();
  
  // 检查是否启用 Auth 和 Google One Tap
  const authEnabled = isAuthEnabled();
  const oneTapEnabled = isGoogleOneTapEnabled();

  const oneTapLogin = async function () {
    const options = {
      client_id: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID,
      auto_select: false,
      cancel_on_tap_outside: false,
      context: "signin",
    };

    // console.log("onetap login trigger", options);

    googleOneTap(options, (response: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log("onetap login ok", response);
      }
      handleLogin(response.credential);
    });
  };

  const handleLogin = async function (credentials: string) {
    const res = await signIn("google-one-tap", {
      credential: credentials,
      redirect: false,
    });
    if (process.env.NODE_ENV === 'development') {
      console.log("signIn ok", res);
    }
  };

  useEffect(() => {
    // 只在启用 Auth 和 Google One Tap 时才执行
    if (!authEnabled || !oneTapEnabled) {
      return;
    }

    // console.log("one tap login status", status, session);

    if (status === "unauthenticated") {
      oneTapLogin();

      const intervalId = setInterval(() => {
        oneTapLogin();
      }, 3000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [status, authEnabled, oneTapEnabled]);

  return <></>;
}
