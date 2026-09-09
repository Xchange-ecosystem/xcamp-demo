// DOCX text extraction for the Recap transcript step.
//
// Its own file for the same reason as transcriptPdf.ts: reached only through a
// dynamic import, so mammoth and its dependency tree land in a lazily-fetched
// `transcriptDocx-<hash>.js` chunk that `vite.config.ts` keeps out of the PWA
// precache. Browser-only; nothing is uploaded.
//
// `extractRawText` rather than `convertToHtml` — the composer wants a plain
// string to hand to api/recap/extract, and a transcript's formatting carries
// no meaning worth preserving.
import { extractRawText } from "mammoth";

export async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await extractRawText({ arrayBuffer });
  return result.value;
}
