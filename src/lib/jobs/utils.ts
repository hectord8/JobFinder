import { createHash } from "node:crypto";

import type { NormalizedJob } from "./types";

/** Strips HTML tags and collapses whitespace from provider descriptions. */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeyPart(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Stable dedup fingerprint. Uses normalized URL first (most reliable), but
 * also blends company+title so the same posting re-listed under a slightly
 * different URL still collides.
 */
export function fingerprint(job: NormalizedJob): string {
  const urlKey = normalizeKeyPart(job.url.split("?")[0]);
  const titleKey = normalizeKeyPart(job.title);
  const companyKey = normalizeKeyPart(job.company);
  // Prefer URL when present and meaningful; otherwise fall back to content.
  const basis =
    urlKey.length > 8 ? urlKey : `${companyKey}:${titleKey}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

/** Detects remote roles from free text when a provider doesn't flag it. */
export function looksRemote(text: string): boolean {
  return /\b(remote|work from home|wfh|fully remote|home[- ]based)\b/i.test(text);
}

/** Truncate overly long descriptions to keep DB rows reasonable. */
export function clampDescription(text: string, max = 12000): string {
  return text.length > max ? text.slice(0, max) : text;
}
