import type { JobProvider, JobQuery, NormalizedJob } from "../types";
import { clampDescription, looksRemote, stripHtml } from "../utils";

/**
 * Arbeitnow free job board API: https://www.arbeitnow.com/api
 * No API key required. Returns a paginated feed; we filter client-side by the
 * query terms since the endpoint has no search parameter.
 */
export const arbeitnowProvider: JobProvider = {
  id: "arbeitnow",

  isEnabled() {
    return true; // No credentials needed.
  },

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { Accept: "application/json" },
      // Cache for an hour to be a good citizen of the free API.
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      throw new Error(`Arbeitnow ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { data?: ArbeitnowJob[] };

    const terms = query.what.toLowerCase().split(/\s+/).filter(Boolean);

    const jobs = (data.data ?? []).map((j) => {
      const description = clampDescription(stripHtml(j.description ?? ""));
      return {
        title: j.title ?? "Untitled role",
        company: j.company_name ?? null,
        location: j.location ?? null,
        description,
        salary: null,
        source: "arbeitnow",
        sourceJobId: j.slug ?? null,
        url: j.url,
        remote: Boolean(j.remote) || looksRemote(`${j.title} ${description}`),
        postedAt: j.created_at ? new Date(j.created_at * 1000) : null,
      } satisfies NormalizedJob;
    });

    // Lightweight relevance filter against the query.
    const filtered = jobs.filter((j) => {
      if (query.remoteOnly && !j.remote) return false;
      if (terms.length === 0) return true;
      const hay = `${j.title} ${j.description}`.toLowerCase();
      return terms.some((t) => hay.includes(t));
    });

    return filtered.slice(0, query.limit ?? 50);
  },
};

interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url: string;
  location?: string;
  created_at?: number;
}
