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

### Why gemini-2.5-flash?
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