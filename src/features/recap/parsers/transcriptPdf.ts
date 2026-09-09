// PDF text extraction for the Recap transcript step.
//
// This module exists as its own file on purpose: `RecapComposer` reaches it
// only through `import("./parsers/transcriptPdf")`, so Rollup emits pdf.js as
// a lazily-fetched `transcriptPdf-<hash>.js` chunk rather than folding ~450 KB
// into the main bundle. That predictable name is what `vite.config.ts`'s
// workbox `globIgnores` keys off to keep it out of the PWA precache — nobody
// who never opens /admin/recap should pay for a PDF parser.
//
// Everything here runs in the browser. The file is read, its text is handed
// back to the composer as a plain string, and nothing is uploaded or stored —
// the same contract as pasted text.
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Vite emits the worker as a hashed asset and gives us its URL, so it is
// served same-origin rather than from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  // Transcripts arrive from outside — a prospect's export, an attachment — and
  // pdf.js has a history of PDF-driven script execution (CVE-2024-4367). v6 no
  // longer exposes `isEvalSupported`: that code path was removed upstream, so
  // there is nothing to switch off here. We only ever ask for text and never
  // render a page, which is the other half of staying out of trouble.
  const loadingTask = pdfjs.getDocument({
    // pdf.js may detach the buffer it is handed, so give it a copy.
    data: new Uint8Array(data),
    disableAutoFetch: true,
  });
  const doc = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        let text = "";
        for (const item of content.items) {
          // Text items carry `str`; the marked-content items interleaved with
          // them do not, and have nothing to contribute.
          if (!("str" in item)) continue;
          text += item.str;
          // pdf.js reports line ends itself. Without honouring them a
          // transcript collapses into one paragraph and the speaker turns
          // that make it readable are lost.
          if (item.hasEOL) text += "\n";
          else if (item.str && !item.str.endsWith(" ")) text += " ";
        }
        pages.push(text.trim());
      } finally {
        page.cleanup();
      }
    }
    return pages.filter(Boolean).join("\n\n");
  } finally {
    // Tears down the worker for this document; in v6 `destroy` lives on the
    // loading task, not the document proxy.
    await loadingTask.destroy();
  }
}
