import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { JobFilters } from "@/components/job-filters";
import { RefreshButton } from "@/components/refresh-button";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface SearchParams {
  source?: string;
  location?: string;
  minMatch?: string;
  remote?: string;
  q?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const userId = await requireUserId();

  const [cv, pref] = await Promise.all([
    prisma.cv.findFirst({ where: { userId, isActive: true } }),
    prisma.preference.findUnique({ where: { userId } }),
  ]);

  const minMatch = Math.max(
    Number(searchParams.minMatch ?? pref?.minMatchScore ?? 0) || 0,
    0,
  );

  // Pull jobs with this user's score + saved state.
  const jobs = await prisma.jobListing.findMany({
    where: {
      ...(searchParams.source ? { source: searchParams.source } : {}),
      ...(searchParams.remote === "1" ? { remote: true } : {}),
      ...(searchParams.location
        ? { location: { contains: searchParams.location, mode: "insensitive" } }
        : {}),
      ...(searchParams.q
        ? {
            OR: [
              { title: { contains: searchParams.q, mode: "insensitive" } },
              { company: { contains: searchParams.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      matchScores: { where: { userId } },
      savedBy: { where: { userId }, select: { id: true } },
    },
    orderBy: { scrapedAt: "desc" },
    take: 500,
  });

  const rows = jobs
    .map((j) => {
      const ms = j.matchScores[0];
      return {
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary,
        source: j.source,
        url: j.url,
        remote: j.remote,
        postedAt: j.postedAt,
        score: ms?.score ?? null,
        matchedTerms: ms?.matchedTerms ?? [],
        saved: j.savedBy.length > 0,
      };
    })
    .filter((j) => (j.score ?? 0) >= minMatch)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const sources = [...new Set(jobs.map((j) => j.source))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {rows.length} job{rows.length === 1 ? "" : "s"} matched to your CV
          </p>
        </div>
        <RefreshButton />
      </div>

      {!cv && (
        <div className="card border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          You haven&apos;t uploaded a CV yet, so jobs can&apos;t be scored.{" "}
          <Link href="/cv" className="font-semibold underline">
            Upload your CV
          </Link>{" "}
          to see match scores.
        </div>
      )}

      <JobFilters sources={sources} defaultMinMatch={minMatch} />

      {rows.length === 0 ? (
        <div className="card text-center text-gray-500">
          No jobs to show yet. Try <RefreshButtonInline /> or adjust filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function RefreshButtonInline() {
  return <span className="font-medium">refreshing jobs</span>;
}
