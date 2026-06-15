import { extractSkills, termFreq, tokenize } from "./text";
import type { JobDoc, Matcher, MatchResult } from "./types";

/**
 * TF-IDF + cosine similarity matcher.
 *
 * The CV and each job description are vectorised using TF-IDF weights computed
 * over a corpus consisting of the CV plus all jobs being scored. Cosine
 * similarity gives the base score; we add a small bonus for direct skill
 * overlap so concrete, recognisable skills (e.g. "react", "cyber security")
 * have a visible effect, and surface those as the "why it matched" terms.
 */
export class TfidfMatcher implements Matcher {
  readonly id = "tfidf";

  async scoreJobs(
    cvText: string,
    jobs: JobDoc[],
  ): Promise<Map<string, MatchResult>> {
    const results = new Map<string, MatchResult>();
    if (!cvText.trim() || jobs.length === 0) return results;

    // Build documents: index 0 = CV, then each job.
    const docsTokens: string[][] = [tokenize(cvText)];
    for (const job of jobs) {
      docsTokens.push(tokenize(`${job.title} ${job.company ?? ""} ${job.description}`));
    }

    // Document frequency for IDF.
    const df = new Map<string, number>();
    for (const tokens of docsTokens) {
      for (const term of new Set(tokens)) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    const N = docsTokens.length;
    const idf = (term: string) =>
      Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1;

    const vectors = docsTokens.map((tokens) => buildTfidfVector(tokens, idf));
    const cvVec = vectors[0];
    const cvSkills = new Set(extractSkills(cvText));

    jobs.forEach((job, i) => {
      const jobVec = vectors[i + 1];
      const cos = cosineSimilarity(cvVec, jobVec);

      const jobSkills = extractSkills(`${job.title} ${job.description}`);
      const overlap = jobSkills.filter((s) => cvSkills.has(s));
      const skillBonus =
        jobSkills.length > 0 ? overlap.length / jobSkills.length : 0;

      // Weighted blend: cosine dominates, skill overlap nudges it.
      const raw = 0.75 * cos + 0.25 * skillBonus;
      const score = Math.max(0, Math.min(100, Math.round(raw * 100)));

      results.set(job.id, {
        score,
        algorithm: this.id,
        matchedTerms: overlap.length ? overlap : topSharedTerms(cvVec, jobVec, 6),
      });
    });

    return results;
  }
}

function buildTfidfVector(
  tokens: string[],
  idf: (term: string) => number,
): Map<string, number> {
  const tf = termFreq(tokens);
  const total = tokens.length || 1;
  const vec = new Map<string, number>();
  for (const [term, count] of tf) {
    vec.set(term, (count / total) * idf(term));
  }
  return vec;
}

function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  // Iterate over the smaller vector.
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other) dot += weight * other;
  }
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function magnitude(vec: Map<string, number>): number {
  let sum = 0;
  for (const w of vec.values()) sum += w * w;
  return Math.sqrt(sum);
}

function topSharedTerms(
  cv: Map<string, number>,
  job: Map<string, number>,
  limit: number,
): string[] {
  const shared: { term: string; weight: number }[] = [];
  for (const [term, w] of job) {
    const cvW = cv.get(term);
    if (cvW) shared.push({ term, weight: w * cvW });
  }
  return shared
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((s) => s.term);
}
