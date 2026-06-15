/**
 * Centralised access to environment variables with light validation.
 * Missing optional provider keys simply disable that provider rather than
 * throwing — so you can run with whatever subset of API keys you have.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  // Core
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  NEXTAUTH_SECRET: optional("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: optional("NEXTAUTH_URL"),

  // Cron protection
  CRON_SECRET: optional("CRON_SECRET"),

  // Storage
  // STORAGE_DRIVER: "local" | "supabase" | "blob"
  STORAGE_DRIVER: (optional("STORAGE_DRIVER") ?? "local") as
    | "local"
    | "supabase"
    | "blob",
  SUPABASE_URL: optional("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_STORAGE_BUCKET: optional("SUPABASE_STORAGE_BUCKET") ?? "cvs",
  BLOB_READ_WRITE_TOKEN: optional("BLOB_READ_WRITE_TOKEN"),

  // Job provider API keys (all optional — provider auto-disables if missing)
  ADZUNA_APP_ID: optional("ADZUNA_APP_ID"),
  ADZUNA_APP_KEY: optional("ADZUNA_APP_KEY"),
  JOOBLE_API_KEY: optional("JOOBLE_API_KEY"),
  REED_API_KEY: optional("REED_API_KEY"),
  JSEARCH_RAPIDAPI_KEY: optional("JSEARCH_RAPIDAPI_KEY"),
  // Arbeitnow needs no key.
  USAJOBS_API_KEY: optional("USAJOBS_API_KEY"),
  USAJOBS_USER_AGENT: optional("USAJOBS_USER_AGENT"),

  // Matching
  // MATCH_ALGORITHM: "tfidf" | "embedding"
  MATCH_ALGORITHM: (optional("MATCH_ALGORITHM") ?? "tfidf") as
    | "tfidf"
    | "embedding",
  OPENAI_API_KEY: optional("OPENAI_API_KEY"),

  IS_PROD: process.env.NODE_ENV === "production",
};
