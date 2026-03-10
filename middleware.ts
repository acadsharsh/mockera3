import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";
const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN;

const allowedPrefixes = [
  "/maintenance",
  "/admin",
  "/admin-login",
  "/login",
  "/dashboard",
  "/library",
  "/studio",
  "/cbt",
  "/test-analysis",
  "/api",
  "/_next",
];
const allowedPaths = ["/favicon.ico", "/robots.txt", "/sitemap.xml", "/site.webmanifest"];
const adminOnlyPrefixes = ["/studio", "/api/pyq", "/api/tests", "/api/upload"];

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (
    !allowedPaths.includes(pathname) &&
    !allowedPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  let maintenanceEnabled = MAINTENANCE_MODE;
  if (!maintenanceEnabled) {
    try {
      const res = await fetch(new URL("/api/maintenance", req.url), {
        cache: "no-store",
        headers: {
          "x-maintenance-check": "1",
        },
      });
      if (res.ok) {
        const data = await res.json();
        maintenanceEnabled = Boolean(data?.enabled);
      }
    } catch {
      maintenanceEnabled = false;
    }
  }

  if (!maintenanceEnabled) {
    return NextResponse.next();
  }

  if (allowedPaths.includes(pathname) || allowedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  try {
    const adminRes = await fetch(new URL("/api/admin/check", req.url), {
      cache: "no-store",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
    });
    if (adminRes.ok) {
      return NextResponse.next();
    }
  } catch {}

  if (adminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    // Non-admins blocked below.
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
