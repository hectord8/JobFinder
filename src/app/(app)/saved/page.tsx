import { JobCard } from "@/components/job-card";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const userId = await requireUserId();

  const saved = await prisma.savedJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      jobListing: {
        include: { matchScores: { where: { userId } } },
      },
    },
  });

  const rows = saved.map((s) => {
    const j = s.jobListing;
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
      saved: true,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved jobs</h1>
        <p className="text-sm text-gray-500">{rows.length} saved</p>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center text-gray-500">
          No saved jobs yet. Hit ☆ Save on any job to bookmark it here.
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
