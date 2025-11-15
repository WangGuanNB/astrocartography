import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intl(request) as NextResponse;

  const { pathname } = request.nextUrl;
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
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|BingSiteAuth.xml|ads.txt|.*\\..*|privacy-policy|terms-of-service).*)",
  ],
};
