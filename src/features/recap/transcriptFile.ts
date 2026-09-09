// Turning a dropped file into transcript text.
//
// Whatever the format, the result is the same plain string that pasting would
// have produced, handed to `api/recap/extract` unchanged. Nothing is uploaded,
// nothing is stored: parsing happens entirely in the browser and the file is
// released as soon as its text has been read.
//
// The guards below mirror the demo's existing `TranscriptModeBody`
// (`src/components/founder/ComposerModes.tsx`) — same 5 MB ceiling, same
// empty/unreadable checks — so the two upload surfaces refuse the same files
// for the same stated reasons. PDF and DOCX are the additions.

export const SUPPORTED_TRANSCRIPT_EXTENSIONS = ["pdf", "docx", "txt", "vtt", "srt"] as const;

export type SupportedTranscriptExtension = (typeof SUPPORTED_TRANSCRIPT_EXTENSIONS)[number];

/** For the file picker's `accept` attribute. */
export const TRANSCRIPT_ACCEPT = SUPPORTED_TRANSCRIPT_EXTENSIONS.map((e) => `.${e}`).join(",");

export const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024;

/** A refusal the presenter should see verbatim, rather than a stack trace. */
export class TranscriptFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptFileError";
  }
}

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isSupported(extension: string): extension is SupportedTranscriptExtension {
  return (SUPPORTED_TRANSCRIPT_EXTENSIONS as readonly string[]).includes(extension);
}

export function describeFile(file: File): string {
  const kb = Math.max(1, Math.ceil(file.size / 1024));
  return `${extensionOf(file.name).toUpperCase()} · ${kb.toLocaleString()} KB`;
}

/**
 * Read one dropped or picked file down to transcript text.
 *
 * Throws `TranscriptFileError` with copy meant for the screen; anything else
 * escaping from here is a genuine bug rather than a rejected file.
 */
export async function readTranscriptFile(file: File): Promise<string> {
  const extension = extensionOf(file.name);

  if (!isSupported(extension)) {
    throw new TranscriptFileError(
      `${file.name} isn't a format this can read. Drop a PDF, DOCX, TXT, VTT or SRT file, or paste the transcript instead.`,
    );
  }
  if (file.size === 0) {
    throw new TranscriptFileError("That file is empty.");
  }
  if (file.size > MAX_TRANSCRIPT_BYTES) {
    throw new TranscriptFileError(
      "That file is larger than 5 MB. Split it, or paste the transcript instead.",
    );
  }

  let text: string;
  try {
    if (extension === "pdf") {
      const { extractPdfText } = await import("./parsers/transcriptPdf");
      text = await extractPdfText(await file.arrayBuffer());
    } else if (extension === "docx") {
      const { extractDocxText } = await import("./parsers/transcriptDocx");
      text = await extractDocxText(await file.arrayBuffer());
    } else {
      text = await file.text();
    }
  } catch (err) {
    // A password-protected PDF, a .docx that is really a .doc, a corrupt file:
    // all land here, and none of them are worth showing a raw parser error for.
    // The underlying error still goes to the console — without it a parser
    // problem is indistinguishable from a bad file when someone reports one.
    console.error("[recap] transcript parse failed", err);
    throw new TranscriptFileError(
      `${file.name} couldn't be read. It may be corrupt, password-protected, or not really a ${extension.toUpperCase()} file. Try another file, or paste the transcript instead.`,
    );
  }

  if (!text.trim()) {
    throw new TranscriptFileError(
      `${file.name} has no readable text in it. A scanned or image-only PDF has no text layer to extract — paste the transcript instead.`,
    );
  }

  return text.trim();
}
