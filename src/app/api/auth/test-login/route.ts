import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";

/**
 * 开发环境测试登录 API
 * 使用方法: /api/auth/test-login?uuid=xxx&redirect=/my-orders
 * 
 * 仅在开发环境启用，生产环境会返回 403
 */
export async function GET(request: NextRequest) {
  // 仅在开发环境允许
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Test login is only available in development environment" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get("uuid");
    const redirectUrl = searchParams.get("redirect") || "/";

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID parameter is required. Usage: /api/auth/test-login?uuid=xxx&redirect=/my-orders" },
        { status: 400 }
      );
    }

    // 调用 NextAuth 的 signIn 函数
    // 使用 redirect: true 让 NextAuth 自己处理重定向和 cookie 设置
    // 通过 callbackUrl 参数指定重定向目标
    const result = await signIn("uuid-test", {
      uuid: uuid,
      redirect: true,
      callbackUrl: redirectUrl,
    });

    // signIn 应该返回一个 Response 对象（重定向响应，包含 cookie）
    if (result instanceof Response) {
      console.log("test-login: signIn returned Response, redirecting to", redirectUrl);
      return result;
    }

    // 如果返回的是字符串（URL），创建重定向响应
    if (typeof result === "string") {
      console.log("test-login: signIn returned URL string, creating redirect", result);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // 如果返回的是错误对象
    if (result && typeof result === "object" && "error" in result) {
      console.error("test-login: signIn failed", result);
      return NextResponse.json(
        { error: (result as { error: string }).error || "Login failed", uuid },
        { status: 401 }
      );
    }

    // 默认情况：登录成功，重定向到目标页面
    console.log("test-login: default redirect to", redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("test-login API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

