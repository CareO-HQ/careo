import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          req.cookies.delete(name);
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.delete(name);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[DEBUG middleware] path:", req.nextUrl.pathname, "user_id:", user?.id);

  if (!user && (
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/onboarding") ||
    req.nextUrl.pathname.startsWith("/admin")
  )) {
    console.log("[DEBUG middleware] NO USER - REDIRECTING TO /login");
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/admin/:path*"]
};
