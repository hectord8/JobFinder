import { prisma } from "@/lib/prisma";

import { adzunaProvider } from "./providers/adzuna";
import { arbeitnowProvider } from "./providers/arbeitnow";
import { joobleProvider } from "./providers/jooble";
import { jsearchProvider } from "./providers/jsearch";
import { reedProvider } from "./providers/reed";
import type { JobProvider, JobQuery, NormalizedJob } from "./types";
import { fingerprint } from "./utils";

export * from "./types";

/** All providers. Each self-reports whether it has the credentials to run. */
export const ALL_PROVIDERS: JobProvider[] = [
  adzunaProvider,
  reedProvider,
  joobleProvider,
  arbeitnowProvider,
  jsearchProvider,
];

export function enabledProviders(): JobProvider[] {
  return ALL_PROVIDERS.filter((p) => p.isEnabled());
}

export interface FetchRunResult {
  byProvider: Record<string, { fetched: number; error?: string }>;
  totalFetched: number;
  inserted: number;
  duplicatesSkipped: number;
}

/**
 * Runs every enabled provider for each query, dedups across the whole batch
 * and against existing rows, and inserts new listings. Provider failures are
 * isolated so one bad API doesn't sink the run.
 */
export async function runJobFetch(
  queries: JobQuery[],
): Promise<FetchRunResult> {
  const providers = enabledProviders();
  const result: FetchRunResult = {
    byProvider: {},
    totalFetched: 0,
    inserted: 0,
    duplicatesSkipped: 0,
  };

  const collected: NormalizedJob[] = [];

  for (const provider of providers) {
    let fetched = 0;
    try {
      for (const query of queries) {
        const jobs = await provider.fetchJobs(query);
        collected.push(...jobs);
        fetched += jobs.length;
        // Gentle rate limiting between queries for the same provider.
        await sleep(400);
      }
      result.byProvider[provider.id] = { fetched };
    } catch (err) {
      result.byProvider[provider.id] = {
        fetched,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  result.totalFetched = collected.length;

  // Dedup within this batch by fingerprint.
  const seen = new Map<string, NormalizedJob>();
  for (const job of collected) {
    if (!job.url) continue;
    const fp = fingerprint(job);
    if (!seen.has(fp)) seen.set(fp, job);
  }

  // Filter out fingerprints we already have in the DB.
  const fingerprints = [...seen.keys()];
  const existing = await prisma.jobListing.findMany({
    where: { fingerprint: { in: fingerprints } },
    select: { fingerprint: true },
  });
  const existingSet = new Set(existing.map((e) => e.fingerprint));

  const toInsert = [...seen.entries()].filter(([fp]) => !existingSet.has(fp));
  result.duplicatesSkipped = seen.size - toInsert.length;

  if (toInsert.length > 0) {
    const created = await prisma.jobListing.createMany({
      data: toInsert.map(([fp, job]) => ({
        fingerprint: fp,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        salary: job.salary,
        source: job.source,
        sourceJobId: job.sourceJobId,
        url: job.url,
        remote: job.remote,
        postedAt: job.postedAt,
      })),
      skipDuplicates: true,
    });
    result.inserted = created.count;
  }

  return result;
}

/** Builds provider queries from a user's stored preferences. */
export function queriesFromPreferences(pref: {
  targetRoles: string[];
  keywords: string[];
  fields: string[];
  location: string | null;
  remoteOnly: boolean;
  countryCode: string;
}): JobQuery[] {
  const country = pref.countryCode || "gb";
  const terms =
    pref.targetRoles.length > 0
      ? pref.targetRoles
      : pref.fields.length > 0
        ? pref.fields
        : ["graduate software engineer"];

  // One query per target role keeps results focused; append shared keywords.
  const kw = pref.keywords.join(" ");
  return terms.map((role) => ({
    what: kw ? `${role} ${kw}` : role,
    where: pref.location ?? undefined,
    country,
    remoteOnly: pref.remoteOnly,
    limit: 50,
  }));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
