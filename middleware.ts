import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { ADMIN_COOKIE_NAME, verifyPlatformAdminToken } from "@/lib/admin/auth";

// Public auth routes where an already logged-in user should be redirected to /dashboard
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

// Protected dashboard routes requiring active tenant session
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/pos",
  "/invoices",
  "/inventory",
  "/purchases",
  "/customers",
  "/payments",
  "/expenses",
  "/reports",
  "/settings",
  "/setup",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip Next.js internal static assets and public files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") || // e.g. favicon.ico, images, robots.txt
    pathname === "/privacy" ||
    pathname === "/terms"
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let session = null;
  if (sessionCookie) {
    session = await verifySessionToken(sessionCookie);
  }

  const isAuthenticated = Boolean(session && session.userId && session.activeTenantId);

  // 3. Root route ("/") handling:
  // If user has an active authenticated session, seamlessly direct them to /dashboard
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 4. Auth routes (/login, /register, etc.):
  // If already logged in, redirect straight to /dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isAuthRoute) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 5. Protected dashboard routes:
  // If not authenticated, redirect to /login with returnUrl
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 6. Platform Admin routes
  if (pathname === "/admin/login") {
    const adminCookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (adminCookie) {
      const adminPayload = await verifyPlatformAdminToken(adminCookie);
      if (adminPayload?.isPlatformAdmin) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminCookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    let isAdminAuth = false;
    if (adminCookie) {
      const adminPayload = await verifyPlatformAdminToken(adminCookie);
      isAdminAuth = Boolean(adminPayload?.isPlatformAdmin);
    }
    if (!isAdminAuth) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
