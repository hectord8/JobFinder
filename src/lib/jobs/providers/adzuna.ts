import { env } from "@/lib/env";

import type { JobProvider, JobQuery, NormalizedJob } from "../types";
import { clampDescription, looksRemote, stripHtml } from "../utils";

/** Adzuna: https://developer.adzuna.com/ */
export const adzunaProvider: JobProvider = {
  id: "adzuna",

  isEnabled() {
    return Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);
  },

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const country = query.country.toLowerCase();
    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`,
    );
    url.searchParams.set("app_id", env.ADZUNA_APP_ID!);
    url.searchParams.set("app_key", env.ADZUNA_APP_KEY!);
    url.searchParams.set("results_per_page", String(query.limit ?? 50));
    url.searchParams.set("what", query.what);
    if (query.where) url.searchParams.set("where", query.where);
    url.searchParams.set("content-type", "application/json");

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Adzuna ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { results?: AdzunaJob[] };

    return (data.results ?? []).map((j) => {
      const description = clampDescription(stripHtml(j.description ?? ""));
      const salary =
        j.salary_min || j.salary_max
          ? formatSalary(j.salary_min, j.salary_max)
          : null;
      return {
        title: j.title ?? "Untitled role",
        company: j.company?.display_name ?? null,
        location: j.location?.display_name ?? null,
        description,
        salary,
        source: "adzuna",
        sourceJobId: j.id ?? null,
        url: j.redirect_url,
        remote: looksRemote(`${j.title} ${description}`),
        postedAt: j.created ? new Date(j.created) : null,
      };
    });
  },
};

function formatSalary(min?: number, max?: number): string {
  if (min && max) return `${Math.round(min)}–${Math.round(max)}`;
  return `${Math.round(min ?? max ?? 0)}`;
}

interface AdzunaJob {
  id?: string;
  title?: string;
  description?: string;
  redirect_url: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string };
}
