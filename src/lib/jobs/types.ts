/** Normalised job shape that every provider must produce. */
export interface NormalizedJob {
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  salary: string | null;
  source: string;
  sourceJobId: string | null;
  url: string;
  remote: boolean;
  postedAt: Date | null;
}

/** Search parameters derived from a user's preferences. */
export interface JobQuery {
  /** Free-text query, e.g. "graduate software engineer". */
  what: string;
  /** Location string, e.g. "London" or "United Kingdom". */
  where?: string;
  /** ISO country code, e.g. "gb", "us". */
  country: string;
  remoteOnly?: boolean;
  /** Max results to request per provider. */
  limit?: number;
}

export interface JobProvider {
  readonly id: string;
  /** Returns true if the provider has the credentials it needs to run. */
  isEnabled(): boolean;
  /** Fetches and normalises jobs for the given query. */
  fetchJobs(query: JobQuery): Promise<NormalizedJob[]>;
}
