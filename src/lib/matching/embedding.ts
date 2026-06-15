import { env } from "@/lib/env";

import { extractSkills } from "./text";
import type { JobDoc, Matcher, MatchResult } from "./types";

/**
 * Embeddings-based matcher using OpenAI's embedding API + cosine similarity.
 * Drop-in alternative to TfidfMatcher; selected when MATCH_ALGORITHM=embedding
 * and OPENAI_API_KEY is set.
 *
 * The score is the cosine similarity rescaled to 0-100. Job descriptions are
 * truncated to keep token usage (and cost) reasonable.
 */
export class EmbeddingMatcher implements Matcher {
  readonly id = "embedding";
  private model = "text-embedding-3-small";

  async scoreJobs(
    cvText: string,
    jobs: JobDoc[],
  ): Promise<Map<string, MatchResult>> {
    const results = new Map<string, MatchResult>();
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY required for embedding matcher");
    }
    if (!cvText.trim() || jobs.length === 0) return results;

    const cvSkills = new Set(extractSkills(cvText));
    const inputs = [
      truncate(cvText, 8000),
      ...jobs.map((j) => truncate(`${j.title}\n${j.description}`, 8000)),
    ];

    const embeddings = await this.embed(inputs);
    const cvVec = embeddings[0];

    jobs.forEach((job, i) => {
      const sim = cosine(cvVec, embeddings[i + 1]);
      // Embedding similarities cluster high; rescale ~[0.6,0.95] -> [0,100].
      const score = Math.max(
        0,
        Math.min(100, Math.round(((sim - 0.6) / 0.35) * 100)),
      );
      const overlap = extractSkills(`${job.title} ${job.description}`).filter(
        (s) => cvSkills.has(s),
      );
      results.set(job.id, {
        score,
        algorithm: this.id,
        matchedTerms: overlap,
      });
    });

    return results;
  }

  private async embed(inputs: string[]): Promise<number[][]> {
    // Batch in chunks to respect request size limits.
    const out: number[][] = [];
    const batchSize = 64;
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: this.model, input: batch }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI embeddings failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        data: { embedding: number[] }[];
      };
      for (const d of data.data) out.push(d.embedding);
    }
    return out;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    ma += a[i] * a[i];
    mb += b[i] * b[i];
  }
  if (ma === 0 || mb === 0) return 0;
  return dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}
