import { supabase } from "@/lib/supabase";
import { resolveStorageObjectUrl } from "@/lib/storage";

const WOUND_PHOTOS_BUCKET = "wound-photos";

export type WoundGalleryPhotoRecord = {
  id: string;
  woundFolderId: string;
  woundFolderName: string;
  woundNumber: number | null;
  residentId: string;
  storagePath: string;
  photographUrl: string;
  capturedAt: string;
  uploadedBy: string;
  uploaderName: string | null;
  signedUrl: string | null;
};

type GalleryRow = {
  id: string;
  wound_folder_id: string;
  resident_id: string;
  storage_path: string;
  photograph_url: string;
  captured_at: string;
  uploaded_by: string;
  wound_folder:
    | {
        name: string;
        wound_number: number | null;
      }
    | {
        name: string;
        wound_number: number | null;
      }[]
    | null;
};

function normalizeWoundFolder(
  value: GalleryRow["wound_folder"]
): { name: string; wound_number: number | null } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function fetchWoundGalleryPhotos(params: {
  residentId: string;
  woundFolderId?: string;
}): Promise<WoundGalleryPhotoRecord[]> {
  const { residentId, woundFolderId } = params;

  let query = supabase
    .from("wound_gallery_photos")
    .select(
      `
      id,
      wound_folder_id,
      resident_id,
      storage_path,
      photograph_url,
      captured_at,
      uploaded_by,
      wound_folder:wound_folders(name, wound_number)
    `
    )
    .eq("resident_id", residentId)
    .order("captured_at", { ascending: false });

  if (woundFolderId) {
    query = query.eq("wound_folder_id", woundFolderId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as GalleryRow[];
  const uploaderIds = [...new Set(rows.map((row) => row.uploaded_by).filter(Boolean))];
  const uploaderNames = new Map<string, string>();

  if (uploaderIds.length > 0) {
    const { data: uploaders } = await supabase
      .from("users")
      .select("id, name")
      .in("id", uploaderIds);

    for (const uploader of uploaders ?? []) {
      if (uploader.name) {
        uploaderNames.set(uploader.id, uploader.name);
      }
    }
  }

  return Promise.all(
    rows.map(async (row) => {
      const folder = normalizeWoundFolder(row.wound_folder);
      const signedUrl = resolveStorageObjectUrl(WOUND_PHOTOS_BUCKET, row.photograph_url);

      return {
        id: row.id,
        woundFolderId: row.wound_folder_id,
        woundFolderName: folder?.name ?? "Wound folder",
        woundNumber: folder?.wound_number ?? null,
        residentId: row.resident_id,
        storagePath: row.storage_path,
        photographUrl: row.photograph_url,
        capturedAt: row.captured_at,
        uploadedBy: row.uploaded_by,
        uploaderName: uploaderNames.get(row.uploaded_by) ?? null,
        signedUrl,
      };
    })
  );
}

export function groupGalleryPhotosByFolder(
  photos: WoundGalleryPhotoRecord[]
): Array<{ folderId: string; folderLabel: string; photos: WoundGalleryPhotoRecord[] }> {
  const groups = new Map<string, { folderLabel: string; photos: WoundGalleryPhotoRecord[] }>();

  for (const photo of photos) {
    const folderLabel =
      photo.woundNumber != null
        ? `#${photo.woundNumber} · ${photo.woundFolderName}`
        : photo.woundFolderName;

    const existing = groups.get(photo.woundFolderId);
    if (existing) {
      existing.photos.push(photo);
    } else {
      groups.set(photo.woundFolderId, { folderLabel, photos: [photo] });
    }
  }

  return Array.from(groups.entries()).map(([folderId, value]) => ({
    folderId,
    folderLabel: value.folderLabel,
    photos: value.photos,
  }));
}
