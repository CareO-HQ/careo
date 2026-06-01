import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const protectedPathPrefixes = ["/dashboard", "/onboarding", "/admin"] as const;
// Paths under protected prefixes that should remain publicly accessible
const publicExceptions = ["/onboarding/agency"] as const;

function getOrigin(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function getWebSocketOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  const url = new URL(origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

function joinDirectiveValues(values: Array<string | null>): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}

function buildContentSecurityPolicy(nonce: string): string {
  const supabaseOrigin = getOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseRealtimeOrigin = getWebSocketOrigin(supabaseOrigin);
  const posthogOrigin =
    getOrigin(process.env.NEXT_PUBLIC_POSTHOG_HOST) ?? "https://eu.i.posthog.com";

  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (!isProduction) {
    scriptSources.push("'unsafe-eval'");
  }

  const styleSources = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src ${styleSources.join(" ")}`,
    `img-src ${joinDirectiveValues([
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co",
    ])}`,
    `font-src ${joinDirectiveValues(["'self'", "data:", "https://fonts.gstatic.com"])}`,
    `connect-src ${joinDirectiveValues([
      "'self'",
      supabaseOrigin,
      supabaseRealtimeOrigin,
      posthogOrigin,
    ])}`,
    "frame-src 'self' https://view.officeapps.live.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProduction ? "upgrade-insecure-requests" : null,
  ];

  return directives.filter((directive): directive is string => Boolean(directive)).join("; ");
}

function applyCspHeaders(
  response: NextResponse,
  requestHeaders: Headers,
  contentSecurityPolicy: string,
  nonce: string
) {
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
}

function isProtectedPath(pathname: string): boolean {
  // Allow publicly accessible exceptions even if they start with a protected prefix
  if (publicExceptions.some((exception) => pathname.startsWith(exception))) {
    return false;
  }
  return protectedPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  let res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  applyCspHeaders(res, requestHeaders, contentSecurityPolicy, nonce);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          applyCspHeaders(res, requestHeaders, contentSecurityPolicy, nonce);
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          req.cookies.delete(name);
          res = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          applyCspHeaders(res, requestHeaders, contentSecurityPolicy, nonce);
          res.cookies.delete(name);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(req.nextUrl.pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    applyCspHeaders(redirectResponse, requestHeaders, contentSecurityPolicy, nonce);
    return redirectResponse;
  }

  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
