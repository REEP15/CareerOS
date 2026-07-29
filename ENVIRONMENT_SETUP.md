# CareerOS Environment Variables Setup

## Required Environment Variables

### Firebase Configuration
The following Firebase environment variables are required for the application to function:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

These can be obtained from your Firebase Console project settings.

### UploadThing Configuration
- `UPLOADTHING_SECRET` - Your UploadThing secret key
- `UPLOADTHING_APP_ID` - Your UploadThing app ID

These can be obtained from your UploadThing dashboard.

## Optional AI Provider Configuration

CareerOS supports multiple AI providers for resume parsing. Users can provide their own API keys through the application settings, but you can also configure default keys at the application level.

### Recommended Default: Gemini (Free Tier)
- `GEMINI_API_KEY` - Gemini API key from Google AI Studio
- **Model**: `gemini-3.6-flash` (current stable Flash model for structured JSON extraction)
- **Why Gemini**: Free tier with generous limits, no credit card required for basic usage
- **Get API Key**: https://aistudio.google.com/app/apikey

### Optional Fallback Providers
- `OPENAI_API_KEY` - OpenAI API key for ChatGPT (gpt-4o)
- `DEEPSEEK_API_KEY` - DeepSeek API key (deepseek-chat)

### Vercel Environment Variables
When deploying to Vercel, configure these in your project settings:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each required variable with its corresponding value
4. For AI providers, add the optional keys if you want application-level defaults

### Local Development
For local development, create a `.env.local` file in the project root with the same variables.

## Gemini Model Selection

### Why gemini-3.6-flash?
- **Free Tier Compatible**: Works with Gemini's generous free tier (no credit card required)
- **1M Token Context**: 8x larger than ChatGPT's 128K limit, ideal for resume parsing
- **Stable Release**: Production-ready with consistent performance
- **Cost Effective**: Free input/output tokens on free tier
- **Resume Parsing Optimized**: Good at structured data extraction from text

### Free Tier Limits (as of 2025)
- **Requests**: 5-15 RPM depending on model variant
- **Tokens**: 250,000 TPM
- **Daily**: Up to 1,000 requests per day
- **Context**: 1M token context window

### API Key Types
- **Google AI Studio Keys**: Recommended for free tier, no credit card required
- **Vertex AI Keys**: Enterprise option with different pricing structure
- **Compatibility**: The project uses Google AI Studio API format

## UploadThing File Key Storage

Resume files are stored in UploadThing, and the file key is preserved for deletion:

- **File Key**: Stored in Firestore along with resume metadata
- **Deletion**: Uses stored file key instead of parsing from URL
- **Metadata**: ResumeProfile includes `uploadthingFileKey` field
- **Cleanup**: Proper file deletion when resume is deleted

## Resume Parsing Pipeline Improvements

### Document Extraction
- **PDF**: Standard pdf-parse extraction with optimized text preprocessing
- **DOCX**: Mammoth raw text extraction with proper error handling
- **Fallback**: Removed unreliable text extraction fallback, now only supports PDF and DOCX
- **Error Handling**: Proper error messages instead of silent failures

### Text Preprocessing
- **Conservative Regex**: Reduced aggressive patterns that corrupted date ranges and compound words
- **Flexible Headers**: Improved section header detection for various formatting styles
- **Structure Preservation**: Better handling of bullet points and numbering

### LLM Integration
- **Token Management**: Added token length checking with automatic truncation for large documents
- **Prompt Consistency**: Standardized prompt construction across all AI providers
- **URL Handling**: Strict URL validation - never fabricates or infers URLs from contact info
- **Context Limits**: Respects provider-specific context limits (ChatGPT: 128K, Gemini: 1M, DeepSeek: 128K)

### Schema and Validation
- **Null Handling**: Accepts null values for all optional fields
- **URL Validation**: Only validates URL format when non-empty values provided
- **Normalization**: Consistent null-to-undefined conversion across all fields
- **Data Preservation**: Single-character skills (R, C) now preserved

### Error Handling
- **File Size**: 10MB limit enforced with clear error messages
- **Extraction**: Document extraction failures throw proper errors
- **Validation**: Comprehensive error messages for parsing failures
- **Format Support**: Only PDF and DOCX supported with clear rejection of others

### File Upload
- **Size Validation**: 10MB maximum file size
- **Type Validation**: Strict MIME type and extension checking
- **URL Validation**: UploadThing URLs validated before storage
- **Error Messages**: Clear, actionable error messages for all failure modes

## Testing

Regression tests are available in `services/resume/parser.test.ts` covering:
- Resumes with embedded hyperlinks
- Resumes without hyperlinks
- Multiple supported document formats
- Multi-page resumes
- Resumes with partially populated sections
- URL handling and validation
- Data preservation
- Error handling