import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_BUCKETS = new Set(["careo-public", "resident-files", "wound-photos"]);
const SIGNED_URL_TTL_SECONDS = 60;

function createSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          void options;
          response.cookies.delete(name);
        },
      },
    }
  );

  return { supabase, response };
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const bucket = request.nextUrl.searchParams.get("bucket");
  const objectPath = request.nextUrl.searchParams.get("path");

  if (!bucket || !objectPath) {
    return jsonError("Missing bucket or path", 400);
  }

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return jsonError("Unsupported bucket", 400);
  }

  const { supabase, response } = createSupabaseClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("Unauthorized", 401);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return jsonError("Unable to access storage object", 403);
  }

  const redirectResponse = NextResponse.redirect(data.signedUrl, { status: 307 });

  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  redirectResponse.headers.set("Cache-Control", "private, no-store, max-age=0");

  return redirectResponse;
}
