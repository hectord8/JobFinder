"use client";

import { useState, useTransition } from "react";

import { toggleSaveJob } from "@/app/actions";

export interface JobCardData {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  source: string;
  url: string;
  remote: boolean;
  postedAt: Date | string | null;
  score: number | null;
  matchedTerms: string[];
  saved: boolean;
}

function scoreColor(score: number | null): string {
  if (score === null) return "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  if (score >= 70) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
  if (score >= 40) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
}

export function JobCard({
  job,
  showNotes = false,
}: {
  job: JobCardData;
  showNotes?: boolean;
}) {
  const [saved, setSaved] = useState(job.saved);
  const [isPending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      const res = await toggleSaveJob(job.id);
      setSaved(res.saved);
    });
  }

  const posted =
    job.postedAt &&
    new Date(job.postedAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });

  return (
    <article className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold" title={job.title}>
            {job.title}
          </h3>
          <p className="truncate text-sm text-gray-600 dark:text-gray-400">
            {job.company ?? "Unknown company"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreColor(
            job.score,
          )}`}
          title="CV match score"
        >
          {job.score === null ? "—" : `${job.score}%`}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {job.location && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {job.location}
          </span>
        )}
        {job.remote && (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
            Remote
          </span>
        )}
        <span className="rounded bg-gray-100 px-2 py-0.5 capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {job.source}
        </span>
        {posted && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {posted}
          </span>
        )}
        {job.salary && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {job.salary}
          </span>
        )}
      </div>

      {job.matchedTerms.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">
            Why it matched
          </p>
          <div className="flex flex-wrap gap-1">
            {job.matchedTerms.slice(0, 8).map((t) => (
              <span
                key={t}
                className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-brand-700/20 dark:text-brand-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1"
        >
          View &amp; apply
        </a>
        <button
          onClick={onToggle}
          disabled={isPending}
          className="btn-secondary"
          aria-pressed={saved}
          title={saved ? "Remove from saved" : "Save job"}
        >
          {saved ? "★ Saved" : "☆ Save"}
        </button>
      </div>
    </article>
  );
}
