import { del, head, put } from "@vercel/blob";

export interface StorageUploadOptions {
  body: Buffer | Blob | File;
  contentType: string;
  path: string;
  tenantId: string;
}

export interface StorageUploadResult {
  pathname: string;
  url: string;
}

export async function uploadFile(
  options: StorageUploadOptions
): Promise<StorageUploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required for file storage. Configure it in your Vercel project settings."
    );
  }

  const blobPath = `tenants/${options.tenantId}/${options.path}`;
  const blob = await put(blobPath, options.body, {
    access: "public",
    contentType: options.contentType,
    token,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

export async function deleteFile(url: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for file deletion.");
  }

  await del(url, { token });
}

export async function getFileMetadata(
  url: string
): Promise<{ size: number; contentType: string } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return null;
  }

  const blob = await head(url, { token });
  if (!blob) {
    return null;
  }

  return {
    size: blob.size,
    contentType: blob.contentType,
  };
}
