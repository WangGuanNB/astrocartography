import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Cookie 检查（仅在开发环境且出错时记录）
  const requestCookies = request.cookies.getAll();
  
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
      return NextResponse.redirect(new URL(correctPath, request.url));
    }
  }
  
  // 🔥 关键修复：在调用 next-intl 之前，将 session token 添加到请求 headers
  // 因为 Middleware 的 response headers 不会传递到 Server Components
  const sessionToken = request.cookies.get('__Secure-authjs.session-token');
  if (sessionToken) {
    // 创建新的 headers，包含 session token
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-middleware-session-token', sessionToken.value);
    
    // 创建新的请求对象，包含修改后的 headers
    const modifiedRequest = new NextRequest(request, {
      headers: requestHeaders,
    });
    
    // 使用修改后的请求调用 next-intl 中间件
    const response = intl(modifiedRequest) as NextResponse;
    
    // 继续手动转发 Cookie
    const allCookies = request.cookies.getAll();
    
    allCookies.forEach(cookie => {
      const existingCookie = response.cookies.get(cookie.name);
      
      if (!existingCookie) {
        const isAuthCookie = cookie.name.includes('authjs') || cookie.name.includes('csrf-token');
        
        response.cookies.set(cookie.name, cookie.value, {
          httpOnly: isAuthCookie,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      }
    });

    const isBlocked =
      pathname === "/zh" ||
      pathname === "/docs" ||
      pathname.startsWith("/docs/");

    if (isBlocked) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return response;
  }
  
  
  // 调用 next-intl 中间件
  const response = intl(request) as NextResponse;
  
  // 🔥 关键修复：手动转发所有 Cookie，确保它们能传递到 Server Components
  // 这解决了 next-intl 中间件可能不正确转发 Cookie 的问题
  const allCookies = request.cookies.getAll();
  
  allCookies.forEach(cookie => {
    // 检查 response 中是否已经有这个 cookie
    const existingCookie = response.cookies.get(cookie.name);
    
    if (!existingCookie) {
      // 如果 response 中没有这个 cookie，手动添加
      const isAuthCookie = cookie.name.includes('authjs') || cookie.name.includes('csrf-token');
      
      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: isAuthCookie,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
  });

  const isBlocked =
    pathname === "/zh" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/");

  if (isBlocked) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|BingSiteAuth.xml|ads.txt|.*\\..*|privacy-policy|terms-of-service|refund-policy).*)",
  ],
};
