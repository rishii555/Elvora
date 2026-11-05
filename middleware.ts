import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { ADMIN_COOKIE_NAME, verifyPlatformAdminToken } from "@/lib/admin/auth";

// Public auth routes where an already logged-in user should be redirected to /dashboard
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

// Protected dashboard routes requiring active tenant session
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/assistant",
  "/pos",
  "/invoices",
  "/inventory",
  "/purchases",
  "/customers",
  "/payments",
  "/expenses",
  "/accounting",
  "/analytics",
  "/automations",
  "/reports",
  "/settings",
  "/setup",
];

const CSRF_EXEMPT_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/admin/auth/login",
  "/api/billing/webhook",
];

function applySecurityHeaders(res: NextResponse, correlationId?: string): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (correlationId) {
    res.headers.set("X-Correlation-ID", correlationId);
    res.headers.set("X-Request-ID", correlationId);
  }
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const correlationId =
    req.headers.get("x-correlation-id") ||
    req.headers.get("x-request-id") ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Forward correlation ID down the request pipeline
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-correlation-id", correlationId);
  requestHeaders.set("x-request-id", correlationId);

  // 1. Skip Next.js internal static assets
  if (
    pathname.startsWith("/_next") ||
    /\\.(ico|png|jpg|jpeg|svg|webp|avif|css|js|map|txt|xml|webmanifest|json|woff|woff2|ttf|eot)$/i.test(pathname) || // e.g. favicon.ico, images, sitemap.xml, robots.txt
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/pricing" ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/pending-approval" ||
    pathname === "/business-management-software" ||
    pathname === "/online-invoicing-software" ||
    pathname === "/gst-billing-software" ||
    pathname === "/inventory-management-software" ||
    pathname === "/pos-software" ||
    pathname === "/invoice-generator" ||
    pathname.startsWith("/blog")
  ) {
    return NextResponse.next();
  }

  // 1b. For private API endpoints, inject strict X-Robots-Tag header to prevent indexing
  if (pathname.startsWith("/api")) {
    // CSRF & Cross-Site protection on state-changing API operations
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const isExempt = CSRF_EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
      if (!isExempt) {
        // Reject cross-site requests via Sec-Fetch-Site header
        const secFetchSite = req.headers.get("sec-fetch-site");
        if (secFetchSite === "cross-site") {
          return applySecurityHeaders(
            NextResponse.json(
              { success: false, error: "CSRF security check failed: Cross-site request rejected" },
              { status: 403 }
            ),
            correlationId
          );
        }

        // Validate Origin header when present
        const origin = req.headers.get("origin");
        if (origin) {
          try {
            const originHost = new URL(origin).host;
            const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
            let appUrlHost = "";
            if (process.env.NEXT_PUBLIC_APP_URL) {
              try {
                appUrlHost = new URL(process.env.NEXT_PUBLIC_APP_URL).host;
              } catch {
                // Ignore malformed env var
              }
            }
            if (originHost !== hostHeader && (!appUrlHost || originHost !== appUrlHost)) {
              return applySecurityHeaders(
                NextResponse.json(
                  { success: false, error: "CSRF security check failed: Origin mismatch" },
                  { status: 403 }
                ),
                correlationId
              );
            }
          } catch {
            return applySecurityHeaders(
              NextResponse.json(
                { success: false, error: "CSRF security check failed: Malformed Origin" },
                { status: 403 }
              ),
              correlationId
            );
          }
        }
      }
    }

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return applySecurityHeaders(res, correlationId);
  }

  // 2. Read session cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let session = null;
  if (sessionCookie) {
    session = await verifySessionToken(sessionCookie);
  }

  const isPending = session?.approvalStatus === "PENDING";
  const isAuthenticated = Boolean(session && session.userId && session.activeTenantId && !isPending);

  // 3. Root route ("/") handling:
  // If user has an active authenticated session, seamlessly direct them to /dashboard
  if (pathname === "/") {
    if (isPending) {
      return NextResponse.redirect(new URL("/pending-approval", req.url));
    }
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 4. Auth routes (/login, /register, etc.):
  // If already logged in, redirect straight to /dashboard (or /pending-approval if pending)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isAuthRoute) {
    if (isPending) {
      return NextResponse.redirect(new URL("/pending-approval", req.url));
    }
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return applySecurityHeaders(res, correlationId);
  }

  // 5. Protected dashboard routes:
  // If not authenticated or pending, redirect appropriately
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtectedRoute) {
    if (isPending) {
      return NextResponse.redirect(new URL("/pending-approval", req.url));
    }
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return applySecurityHeaders(res, correlationId);
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
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return applySecurityHeaders(res, correlationId);
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
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return applySecurityHeaders(res, correlationId);
  }

  return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), correlationId);
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
