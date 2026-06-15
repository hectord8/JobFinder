/** Shared text utilities for tokenisation and term extraction. */

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","when","at","by","for",
  "with","about","against","between","into","through","during","before","after",
  "above","below","to","from","up","down","in","out","on","off","over","under",
  "again","further","is","are","was","were","be","been","being","have","has",
  "had","do","does","did","of","as","this","that","these","those","i","you",
  "we","they","he","she","it","will","would","can","could","should","our","your",
  "their","its","etc","per","via","across","within","including","include","role",
  "job","work","working","team","teams","company","experience","skills","skill",
  "year","years","strong","ability","using","use","used","new","plus","across",
]);

/** Lower-cases, strips punctuation, splits and removes stopwords/short tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.]+|[.]+$/g, "")) // keep things like "node.js"
    .filter((t) => t.length >= 2 && t.length <= 40 && !STOPWORDS.has(t));
}

/** Builds a term-frequency map from tokens. */
export function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/**
 * A curated list of tech/role skills we recognise for the "why it matched"
 * breakdown. Multi-word phrases are matched against the raw text.
 */
export const KNOWN_SKILLS = [
  "javascript","typescript","python","java","c++","c#","go","golang","rust",
  "ruby","php","kotlin","swift","scala","sql","nosql","react","next.js","node.js",
  "angular","vue","svelte","django","flask","spring","express","tailwind",
  "graphql","rest","docker","kubernetes","aws","azure","gcp","terraform",
  "linux","git","ci/cd","jenkins","postgresql","postgres","mysql","mongodb",
  "redis","kafka","rabbitmq","machine learning","deep learning","tensorflow",
  "pytorch","data science","cyber security","cybersecurity","penetration testing",
  "pen testing","networking","cryptography","soc","siem","incident response",
  "vulnerability","firewall","owasp","cloud security","devops","agile","scrum",
  "html","css","figma","unit testing","tdd","microservices","api","etl",
  "spark","hadoop","tableau","power bi","numpy","pandas","scikit-learn",
];

/** Finds known skills present in the given text (case-insensitive). */
export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of KNOWN_SKILLS) {
    if (lower.includes(skill)) found.add(skill);
  }
  return [...found];
}
