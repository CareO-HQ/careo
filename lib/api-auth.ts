import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";
import { getAalFromAccessToken, requiresMfa } from "@/lib/mfa";

/**
 * Returns the signed-in user's id for an API route request, or null.
 * A user whose role requires MFA counts as signed in only after completing TOTP (aal2).
 */
export async function getRequestUserId(request: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (requiresMfa(user.app_metadata?.role as string | undefined)) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (getAalFromAccessToken(session?.access_token) !== "aal2") return null;
  }
  return user.id;
}
