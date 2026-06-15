export interface MatchResult {
  /** 0-100 integer score. */
  score: number;
  /** Algorithm identifier persisted on MatchScore. */
  algorithm: string;
  /** Human-readable matched terms/skills for the UI breakdown. */
  matchedTerms: string[];
}

export interface JobDoc {
  id: string;
  title: string;
  company: string | null;
  description: string;
}

/**
 * A Matcher scores a set of jobs against a CV. Implementations may precompute
 * corpus statistics (e.g. IDF) across the provided jobs.
 */
export interface Matcher {
  readonly id: string;
  scoreJobs(cvText: string, jobs: JobDoc[]): Promise<Map<string, MatchResult>>;
}
