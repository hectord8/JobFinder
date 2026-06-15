import { env } from "@/lib/env";

import type { JobProvider, JobQuery, NormalizedJob } from "../types";
import { clampDescription, looksRemote } from "../utils";

/**
 * JSearch via RapidAPI: aggregates Indeed/LinkedIn/Glassdoor/ZipRecruiter etc.
 * https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */
export const jsearchProvider: JobProvider = {
  id: "jsearch",

  isEnabled() {
    return Boolean(env.JSEARCH_RAPIDAPI_KEY);
  },

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const url = new URL("https://jsearch.p.rapidapi.com/search");
    const q = query.where ? `${query.what} in ${query.where}` : query.what;
    url.searchParams.set("query", q);
    url.searchParams.set("page", "1");
    url.searchParams.set("num_pages", "1");
    url.searchParams.set("country", query.country.toLowerCase());
    if (query.remoteOnly) url.searchParams.set("work_from_home", "true");

    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": env.JSEARCH_RAPIDAPI_KEY!,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });
    if (!res.ok) {
      throw new Error(`JSearch ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { data?: JSearchJob[] };

    return (data.data ?? [])
      .slice(0, query.limit ?? 50)
      .map((j) => {
        const description = clampDescription(j.job_description ?? "");
        const salary = formatSalary(j);
        return {
          title: j.job_title ?? "Untitled role",
          company: j.employer_name ?? null,
          location:
            [j.job_city, j.job_state, j.job_country]
              .filter(Boolean)
              .join(", ") || null,
          description,
          salary,
          source: "jsearch",
          sourceJobId: j.job_id ?? null,
          url: j.job_apply_link ?? j.job_google_link ?? "",
          remote:
            Boolean(j.job_is_remote) ||
            looksRemote(`${j.job_title} ${description}`),
          postedAt: j.job_posted_at_datetime_utc
            ? new Date(j.job_posted_at_datetime_utc)
            : null,
        } satisfies NormalizedJob;
      })
      .filter((j) => j.url.length > 0);
  },
};

function formatSalary(j: JSearchJob): string | null {
  if (j.job_min_salary || j.job_max_salary) {
    const cur = j.job_salary_currency ?? "";
    const period = j.job_salary_period ?? "";
    const range = `${j.job_min_salary ?? ""}–${j.job_max_salary ?? ""}`.replace(
      /^–|–$/g,
      "",
    );
    return `${cur} ${range} ${period}`.trim();
  }
  return null;
}

interface JSearchJob {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_description?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_posted_at_datetime_utc?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
}
