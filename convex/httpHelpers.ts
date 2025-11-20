// CORS helper utilities for Convex HTTP actions

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8081",
  "exp://localhost:8081",
  // Add production origins from environment if needed
  ...(process.env.NEXT_PUBLIC_MOBILE_APP_URL ? [process.env.NEXT_PUBLIC_MOBILE_APP_URL] : []),
];

export const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
};

export const createCorsHeaders = (origin: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Cookie, Set-Cookie",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };

  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
};

export const withCors = (response: Response, origin: string | null): Response => {
  const corsHeaders = createCorsHeaders(origin);
  const headers = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
