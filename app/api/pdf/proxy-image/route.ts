import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Same-origin fetch for care-file PDF logos when the storage URL blocks browser CORS.
 * Only allows URLs under the project's Supabase public URL.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseBase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const allowedPrefix = `${supabaseBase}/`;
  if (!raw.startsWith(allowedPrefix)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(raw, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream failed" }, { status: upstream.status });
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("proxy-image:", e);
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
