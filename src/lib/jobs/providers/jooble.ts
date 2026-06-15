import { env } from "@/lib/env";

import type { JobProvider, JobQuery, NormalizedJob } from "../types";
import { clampDescription, looksRemote, stripHtml } from "../utils";

/** Jooble: https://jooble.org/api/about (POST with key in the URL path). */
export const joobleProvider: JobProvider = {
  id: "jooble",

  isEnabled() {
    return Boolean(env.JOOBLE_API_KEY);
  },

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const res = await fetch(`https://jooble.org/api/${env.JOOBLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: query.what,
        location: query.where ?? "",
        page: "1",
      }),
    });
    if (!res.ok) {
      throw new Error(`Jooble ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { jobs?: JoobleJob[] };

    return (data.jobs ?? [])
      .slice(0, query.limit ?? 50)
      .map((j) => {
        const description = clampDescription(stripHtml(j.snippet ?? ""));
        return {
          title: j.title ?? "Untitled role",
          company: j.company ?? null,
          location: j.location ?? null,
          description,
          salary: j.salary || null,
          source: "jooble",
          sourceJobId: j.id ? String(j.id) : null,
          url: j.link,
          remote: looksRemote(`${j.title} ${description} ${j.location ?? ""}`),
          postedAt: j.updated ? new Date(j.updated) : null,
        };
      });
  },
};

interface JoobleJob {
  id?: number | string;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company?: string;
  updated?: string;
}
