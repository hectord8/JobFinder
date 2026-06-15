import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

import { EmbeddingMatcher } from "./embedding";
import { TfidfMatcher } from "./tfidf";
import type { JobDoc, Matcher } from "./types";

export * from "./types";

/** Returns the configured matcher, falling back to TF-IDF if embeddings can't run. */
export function getMatcher(): Matcher {
  if (env.MATCH_ALGORITHM === "embedding" && env.OPENAI_API_KEY) {
    return new EmbeddingMatcher();
  }
  return new TfidfMatcher();
}

/**
 * (Re)computes match scores for a user against a set of jobs (defaults to all
 * jobs that don't yet have a score for this user). Persists results.
 */
export async function recomputeUserMatches(
  userId: string,
  opts: { onlyMissing?: boolean; jobIds?: string[] } = {},
): Promise<number> {
  const cv = await prisma.cv.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!cv) return 0; // No CV → nothing to match against yet.

  const where: Record<string, unknown> = {};
  if (opts.jobIds?.length) {
    where.id = { in: opts.jobIds };
  } else if (opts.onlyMissing) {
    where.matchScores = { none: { userId } };
  }

  const jobs = await prisma.jobListing.findMany({
    where,
    select: { id: true, title: true, company: true, description: true },
  });
  if (jobs.length === 0) return 0;

  const matcher = getMatcher();
  const docs: JobDoc[] = jobs;

  // Process in batches to bound memory/API usage.
  const BATCH = 200;
  let written = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const results = await matcher.scoreJobs(cv.extractedText, batch);

    await prisma.$transaction(
      [...results.entries()].map(([jobListingId, r]) =>
        prisma.matchScore.upsert({
          where: { userId_jobListingId: { userId, jobListingId } },
          create: {
            userId,
            jobListingId,
            score: r.score,
            algorithm: r.algorithm,
            matchedTerms: r.matchedTerms,
          },
          update: {
            score: r.score,
            algorithm: r.algorithm,
            matchedTerms: r.matchedTerms,
            computedAt: new Date(),
          },
        }),
      ),
    );
    written += results.size;
  }
  return written;
}

/** Convenience: recompute matches for every user (used after a fetch run). */
export async function recomputeAllUsersMatches(opts: {
  onlyMissing?: boolean;
} = {}): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    await recomputeUserMatches(u.id, opts);
  }
}
