// Wrapper for pdf-parse to prevent debug mode from triggering
// The original pdf-parse has debug code that tries to open test files

export async function parsePdf(buffer: Buffer, options?: any): Promise<{ text?: string }> {
  // Import the actual pdf-parse library
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;
  
  // Call it with the buffer (pdf-parse doesn't support options in the way we tried)
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
  
  // Preserve bullet points and numbered lists - more conservative regex
  text = text.replace(/([•\*])\s*/g, "\n$1 ");
  text = text.replace(/^(\d+[\.\)]\s)/gm, "\n$1");
  
  // Preserve section headers - more flexible pattern
  text = text.replace(/^([A-Z][A-Z\s]{3,}):?\s*$/gm, "\n$1\n");
  text = text.replace(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}):?\s*$/gm, "\n$1\n");
  
  // Clean up excessive whitespace while preserving structure
  text = text.replace(/[ \t]+/g, " ");  // Normalize spaces
  text = text.replace(/\n{4,}/g, "\n\n\n"); // Max 3 consecutive newlines
  text = text.replace(/^\n+/, "").trim(); // Remove leading newlines
  
  return text;
}