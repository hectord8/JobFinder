/**
 * Extract raw text from a PDF buffer.
 *
 * NOTE: we import `pdf-parse/lib/pdf-parse.js` directly instead of the package
 * index. The index file contains debug code that tries to read a sample PDF
 * from disk at import time, which breaks in serverless/bundled environments.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
  const result = await pdfParse(buffer);
  return normalizeText(result.text);
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
