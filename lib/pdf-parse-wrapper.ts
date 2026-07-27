// Wrapper for pdf-parse to prevent debug mode from triggering
// The original pdf-parse has debug code that tries to open test files

export async function parsePdf(buffer: Buffer): Promise<{ text?: string }> {
  // Import the actual pdf-parse library
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;
  
  // Call it with the buffer
  return await pdfParse(buffer);
}