"use strict";
// Wrapper for pdf-parse to prevent debug mode from triggering
// The original pdf-parse has debug code that tries to open test files
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePdf = parsePdf;
exports.extractStructuredText = extractStructuredText;
async function parsePdf(buffer, options) {
    // Import the actual pdf-parse library
    const pdfParseModule = await Promise.resolve().then(() => __importStar(require("pdf-parse")));
    // pdf-parse exports the function as default
    const pdfParse = pdfParseModule.default || pdfParseModule;
    if (typeof pdfParse === 'function') {
        return await pdfParse(buffer);
    }
    else {
        // Try using the module directly
        return await pdfParseModule(buffer);
    }
}
/**
 * Preserves document structure during PDF text extraction
 * Returns text with meaningful line breaks and bullet points preserved
 *
 * IMPLEMENTATION NOTE: The current pdf-parse library extracts plain text without
 * hyperlink annotations. This is a limitation of the current extraction library, not
 * of the PDF format itself. PDF documents can contain hyperlinks, but pdf-parse does
 * not expose them. The parsing pipeline remains extraction-library-agnostic and can be
 * upgraded to use a library that exposes hyperlink annotations if needed.
 */
function extractStructuredText(pdfText) {
    if (!pdfText)
        return "";
    // Normalize line endings
    let text = pdfText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Preserve bullet points and numbered lists - more conservative regex
    text = text.replace(/([•\*])\s*/g, "\n$1 ");
    text = text.replace(/^(\d+[\.\)]\s)/gm, "\n$1");
    // Preserve section headers - more flexible pattern
    text = text.replace(/^([A-Z][A-Z\s]{3,}):?\s*$/gm, "\n$1\n");
    text = text.replace(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}):?\s*$/gm, "\n$1\n");
    // Clean up excessive whitespace while preserving structure
    text = text.replace(/[ \t]+/g, " "); // Normalize spaces
    text = text.replace(/\n{4,}/g, "\n\n\n"); // Max 3 consecutive newlines
    text = text.replace(/^\n+/, "").trim(); // Remove leading newlines
    return text;
}
