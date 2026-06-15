import { env } from "@/lib/env";

import type { JobProvider, JobQuery, NormalizedJob } from "../types";
import { clampDescription, looksRemote, stripHtml } from "../utils";

/** Reed: https://www.reed.co.uk/developers/jobseeker (UK-focused). */
export const reedProvider: JobProvider = {
  id: "reed",

  isEnabled() {
    return Boolean(env.REED_API_KEY);
  },

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const url = new URL("https://www.reed.co.uk/api/1.0/search");
    url.searchParams.set("keywords", query.what);
    if (query.where) url.searchParams.set("locationName", query.where);
    url.searchParams.set("resultsToTake", String(query.limit ?? 50));

    // Reed uses HTTP Basic auth: API key as username, empty password.
    const auth = Buffer.from(`${env.REED_API_KEY}:`).toString("base64");
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Reed ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { results?: ReedJob[] };

    return (data.results ?? []).map((j) => {
      const description = clampDescription(stripHtml(j.jobDescription ?? ""));
      const salary =
        j.minimumSalary || j.maximumSalary
          ? `${j.minimumSalary ?? ""}–${j.maximumSalary ?? ""}`.replace(
              /^–|–$/g,
              "",
            )
          : null;
      return {
        title: j.jobTitle ?? "Untitled role",
        company: j.employerName ?? null,
        location: j.locationName ?? null,
        description,
        salary,
        source: "reed",
        sourceJobId: j.jobId ? String(j.jobId) : null,
        url: j.jobUrl,
        remote: looksRemote(`${j.jobTitle} ${description}`),
        postedAt: j.date ? parseReedDate(j.date) : null,
      };
    });
  },
};

// Reed dates come as "DD/MM/YYYY".
function parseReedDate(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

interface ReedJob {
  jobId?: number;
  jobTitle?: string;
  employerName?: string;
  locationName?: string;
  minimumSalary?: number;
  maximumSalary?: number;
  jobDescription?: string;
  jobUrl: string;
  date?: string;
}
