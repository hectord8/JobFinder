import { promises as fs } from "node:fs";
import path from "node:path";

import { env } from "@/lib/env";

export interface StoredFile {
  /** Driver-specific key/path used to locate the file later. */
  storageKey: string;
  /** Public or signed URL where the file can be retrieved (if available). */
  url: string | null;
}

export interface StorageDriver {
  upload(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local filesystem driver (development / self-host fallback)
// ---------------------------------------------------------------------------

const LOCAL_DIR = path.join(process.cwd(), "uploads");

const localDriver: StorageDriver = {
  async upload(key, data) {
    const full = path.join(LOCAL_DIR, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    // Served via the /api/cv/file route, not directly public.
    return { storageKey: key, url: null };
  },
  async delete(key) {
    const full = path.join(LOCAL_DIR, key);
    await fs.rm(full, { force: true });
  },
};

export async function readLocalFile(key: string): Promise<Buffer> {
  const full = path.join(LOCAL_DIR, key);
  return fs.readFile(full);
}

// ---------------------------------------------------------------------------
// Supabase Storage driver
// ---------------------------------------------------------------------------

const supabaseDriver: StorageDriver = {
  async upload(key, data, contentType) {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      env.SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const bucket = env.SUPABASE_STORAGE_BUCKET;
    const { error } = await client.storage
      .from(bucket)
      .upload(key, data, { contentType, upsert: true });
    if (error) throw error;
    const { data: pub } = client.storage.from(bucket).getPublicUrl(key);
    return { storageKey: key, url: pub.publicUrl ?? null };
  },
  async delete(key) {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      env.SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await client.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([key]);
  },
};

// ---------------------------------------------------------------------------
// Vercel Blob driver
// ---------------------------------------------------------------------------

const blobDriver: StorageDriver = {
  async upload(key, data, contentType) {
    const { put } = await import("@vercel/blob");
    const res = await put(key, data, {
      access: "public",
      contentType,
      token: env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { storageKey: res.pathname, url: res.url };
  },
  async delete(key) {
    const { del } = await import("@vercel/blob");
    await del(key, { token: env.BLOB_READ_WRITE_TOKEN });
  },
};

export function getStorage(): StorageDriver {
  switch (env.STORAGE_DRIVER) {
    case "supabase":
      return supabaseDriver;
    case "blob":
      return blobDriver;
    default:
      return localDriver;
  }
}
