// Ambient declarations for optional dependencies that are only installed when
// the corresponding feature is enabled. The code imports them dynamically and
// guards usage behind config, so they don't need to be present to type-check
// or build with the default (local storage) configuration.
//
// To actually use them:
//   STORAGE_DRIVER=supabase  -> npm i @supabase/supabase-js
//   STORAGE_DRIVER=blob      -> npm i @vercel/blob

declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
  }
  function pdfParse(data: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}

declare module "@supabase/supabase-js" {
  // Minimal surface used by src/lib/storage.ts.
  export function createClient(url: string, key: string): {
    storage: {
      from(bucket: string): {
        upload(
          path: string,
          data: Buffer,
          opts?: { contentType?: string; upsert?: boolean },
        ): Promise<{ error: { message: string } | null }>;
        getPublicUrl(path: string): { data: { publicUrl: string } };
        remove(paths: string[]): Promise<unknown>;
      };
    };
  };
}

declare module "@vercel/blob" {
  export function put(
    path: string,
    data: Buffer,
    opts: {
      access: "public";
      contentType?: string;
      token?: string;
      addRandomSuffix?: boolean;
    },
  ): Promise<{ url: string; pathname: string }>;
  export function del(path: string, opts?: { token?: string }): Promise<void>;
}
