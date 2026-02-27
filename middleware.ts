import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";
const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN;

const allowedPrefixes = ["/maintenance", "/api", "/_next"];
const allowedPaths = ["/favicon.ico", "/robots.txt", "/sitemap.xml", "/site.webmanifest"];

export function middleware(req: NextRequest) {
  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = req.nextUrl;

  if (allowedPaths.includes(pathname) || allowedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (BYPASS_TOKEN) {
    const headerBypass = req.headers.get("x-maintenance-bypass");
    const cookieBypass = req.cookies.get("maintenance_bypass")?.value;
    const queryBypass = searchParams.get("bypass");

    if (headerBypass === BYPASS_TOKEN || cookieBypass === BYPASS_TOKEN) {
      return NextResponse.next();
    }

    if (queryBypass === BYPASS_TOKEN) {
      const res = NextResponse.next();
      res.cookies.set("maintenance_bypass", BYPASS_TOKEN, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return res;
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/maintenance";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/:path*",
};
