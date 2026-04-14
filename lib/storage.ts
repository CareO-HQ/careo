const STORAGE_OBJECT_ROUTE = "/api/storage/object";

function normalizeValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRouteUrl(value: string): URL | null {
  try {
    const parsed = new URL(value, "http://localhost");
    if (parsed.pathname !== STORAGE_OBJECT_ROUTE) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildStorageObjectUrl(bucket: string, path: string): string {
  const params = new URLSearchParams({
    bucket,
    path,
  });

  return `${STORAGE_OBJECT_ROUTE}?${params.toString()}`;
}

export function extractStorageObjectPath(
  value: string | null | undefined,
  bucket: string
): string | null {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  const parsedRouteUrl = parseRouteUrl(normalized);
  if (parsedRouteUrl) {
    const routeBucket = parsedRouteUrl.searchParams.get("bucket");
    const routePath = parsedRouteUrl.searchParams.get("path");

    if (routeBucket === bucket && routePath) {
      return routePath;
    }
  }

  const publicPrefix = `/storage/v1/object/public/${bucket}/`;
  const publicIndex = normalized.indexOf(publicPrefix);
  if (publicIndex >= 0) {
    return normalized.slice(publicIndex + publicPrefix.length);
  }

  const bucketPrefix = `${bucket}/`;
  if (normalized.startsWith(bucketPrefix)) {
    return normalized.slice(bucketPrefix.length);
  }

  if (/^https?:\/\//i.test(normalized)) {
    return null;
  }

  return normalized;
}

export function resolveStorageObjectUrl(
  bucket: string,
  value: string | null | undefined
): string | null {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  const parsedRouteUrl = parseRouteUrl(normalized);
  if (parsedRouteUrl) {
    return normalized;
  }

  const extractedPath = extractStorageObjectPath(normalized, bucket);
  if (!extractedPath) {
    return normalized;
  }

  return buildStorageObjectUrl(bucket, extractedPath);
}
