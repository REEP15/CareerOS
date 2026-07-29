// Wrapper for pdf-parse to prevent debug mode from triggering
// The original pdf-parse has debug code that tries to open test files

export async function parsePdf(buffer: Buffer): Promise<{ text?: string }> {
  // Import the actual pdf-parse library
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;
  
  // Call it with the buffer
  return await pdfParse(buffer);
}

/**
 * Preserves document structure during PDF text extraction
 * Returns text with meaningful line breaks and bullet points preserved
 */
export function extractStructuredText(pdfText: string): string {
  if (!pdfText) return "";
  
  // Normalize line endings
  let text = pdfText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Preserve bullet points and numbered lists
  text = text.replace(/([•\-\*])\s*/g, "\n$1 ");
  text = text.replace(/^(\d+[\.\)]\s)/gm, "\n$1");
  
  // Preserve section headers (all caps or title case followed by colon)
  text = text.replace(/^([A-Z][A-Z\s]{5,}):?\s*$/gm, "\n$1\n");
  text = text.replace(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}):?\s*$/gm, "\n$1\n");
  
  // Clean up excessive whitespace while preserving structure
  text = text.replace(/[ \t]+/g, " ");  // Normalize spaces
  text = text.replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines
  text = text.replace(/^\n+/, "").trim(); // Remove leading newlines
  
  return text;
}