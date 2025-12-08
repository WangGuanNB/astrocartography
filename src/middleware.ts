import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 🔍 调试：检查请求中的 Cookie
  const requestCookies = request.cookies.getAll();
  const cookieHeader = request.headers.get("cookie");
  
  console.log("🔍 [Middleware] 请求 Cookie 检查", {
    pathname,
    requestCookieCount: requestCookies.length,
    requestCookieNames: requestCookies.map(c => c.name),
    hasCookieHeader: !!cookieHeader,
    cookieHeaderLength: cookieHeader?.length || 0,
    cookieHeaderPreview: cookieHeader ? `${cookieHeader.substring(0, 150)}...` : "无",
    sessionCookieInRequest: requestCookies.find(c => c.name.includes('authjs') || c.name.startsWith('__Secure-')),
  });
  
  // 检查是否有多个连续的语言前缀（如 /es/ms/, /zh/pt/ 等）
  const localePrefixes = routing.locales.join("|");
  const multipleLocalePattern = new RegExp(`^/(${localePrefixes})/(${localePrefixes})(/|$)`);
  
  if (multipleLocalePattern.test(pathname)) {
    // 如果检测到多个语言前缀，提取最后一个作为目标语言，其余部分作为路径
    const match = pathname.match(new RegExp(`^/(${localePrefixes})/(${localePrefixes})(.*)$`));
    if (match) {
      const [, firstLocale, secondLocale, restPath] = match;
      // 使用最后一个语言前缀，忽略第一个
      const correctPath = `/${secondLocale}${restPath || '/'}`;
      console.log("🔄 [Middleware] 重定向到", { from: pathname, to: correctPath });
      return NextResponse.redirect(new URL(correctPath, request.url));
    }
  }
  
  // 调用 next-intl 中间件
  const response = intl(request) as NextResponse;
  
  // 🔥 关键修复：手动转发所有 Cookie，确保它们能传递到 Server Components
  // 这解决了 next-intl 中间件可能不正确转发 Cookie 的问题
  console.log("🔧 [Middleware] 开始手动转发 Cookie");
  const allCookies = request.cookies.getAll();
  let forwardedCount = 0;
  
  allCookies.forEach(cookie => {
    // 检查 response 中是否已经有这个 cookie
    const existingCookie = response.cookies.get(cookie.name);
    
    if (!existingCookie) {
      // 如果 response 中没有这个 cookie，手动添加
      const isAuthCookie = cookie.name.includes('authjs') || cookie.name.includes('csrf-token');
      const isSecureCookie = cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-');
      
      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: isAuthCookie,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      
      forwardedCount++;
      
      if (isAuthCookie || isSecureCookie) {
        console.log("🔧 [Middleware] 转发认证 Cookie", {
          name: cookie.name,
          valuePreview: cookie.value.substring(0, 30) + '...',
        });
      }
    }
  });
  
  console.log("✅ [Middleware] Cookie 转发完成", {
    totalCookies: allCookies.length,
    forwardedCookies: forwardedCount,
    responseCookieCount: response.cookies.getAll().length,
  });
  
  //  调试：检查 next-intl 中间件处理后的响应
  const responseCookies = response.cookies.getAll();
  console.log("🔍 [Middleware] next-intl 响应 Cookie 检查", {
    responseCookieCount: responseCookies.length,
    responseCookieNames: responseCookies.map(c => c.name),
    sessionCookieInResponse: responseCookies.find(c => c.name.includes('authjs') || c.name.startsWith('__Secure-')),
  });

  const isBlocked =
    pathname === "/zh" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/");

  if (isBlocked) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  
  // 🔍 调试：最终返回的响应
  const finalCookies = response.cookies.getAll();
  console.log("🔍 [Middleware] 最终响应 Cookie 检查", {
    finalCookieCount: finalCookies.length,
    finalCookieNames: finalCookies.map(c => c.name),
    sessionCookieInFinal: finalCookies.find(c => c.name.includes('authjs') || c.name.startsWith('__Secure-')),
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|BingSiteAuth.xml|ads.txt|.*\\..*|privacy-policy|terms-of-service|refund-policy).*)",
  ],
};
